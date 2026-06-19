from __future__ import annotations

import csv
from pathlib import Path

from PIL import Image, ImageChops, ImageStat


ROOT = Path("qa-renders/full-resource-library-visual-qa")
REPORT = ROOT / "final-document-quality-scan.md"
CSV_REPORT = ROOT / "final-document-quality-scan.csv"


def ink_mask_bbox(image: Image.Image) -> tuple[int, int, int, int] | None:
    gray = image.convert("L")
    white = Image.new("L", gray.size, 255)
    diff = ImageChops.difference(gray, white)
    return diff.point(lambda value: 255 if value > 18 else 0).getbbox()


def page_stats(path: Path) -> dict[str, object]:
    with Image.open(path) as source:
        image = source.convert("RGB")
        width, height = image.size
        bbox = ink_mask_bbox(image)

        if not bbox:
            return {
                "file": path.parent.parent.name,
                "page": path.stem.replace("page-", ""),
                "ink_ratio": 0.0,
                "margin_flag": "blank",
                "low_contrast_ratio": 0.0,
                "low_contrast_flag": "blank",
            }

        left, top, right, bottom = bbox
        page_area = width * height
        margin_px = max(5, int(min(width, height) * 0.025))

        ink_pixels = 0
        low_contrast_pixels = 0

        for red, green, blue in image.crop(bbox).getdata():
            # Non-white enough to count as content.
            diff_from_white = max(abs(255 - red), abs(255 - green), abs(255 - blue))
            if diff_from_white <= 18:
                continue

            ink_pixels += 1
            luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue

            # Flag very light text/lines on white backgrounds. This catches pale gray/gold
            # content that may be visible on screen but weak on paper.
            if luminance > 178 and diff_from_white < 92:
                low_contrast_pixels += 1

        ink_ratio = ink_pixels / page_area if page_area else 0
        low_contrast_ratio = low_contrast_pixels / ink_pixels if ink_pixels else 0

        touches_margin = (
            left <= margin_px
            or top <= margin_px
            or right >= width - margin_px
            or bottom >= height - margin_px
        )

        return {
            "file": path.parent.parent.name,
            "page": int(path.stem.replace("page-", "")),
            "ink_ratio": ink_ratio,
            "margin_flag": "review" if touches_margin else "ok",
            "low_contrast_ratio": low_contrast_ratio,
            "low_contrast_flag": "review" if low_contrast_ratio > 0.12 else "ok",
        }


def main() -> None:
    rows: list[dict[str, object]] = []
    for page_path in sorted(ROOT.glob("*/pages/page-*.png")):
        rows.append(page_stats(page_path))

    with CSV_REPORT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "file",
                "page",
                "ink_ratio",
                "margin_flag",
                "low_contrast_ratio",
                "low_contrast_flag",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    flagged = [
        row
        for row in rows
        if row["margin_flag"] != "ok" or row["low_contrast_flag"] != "ok" or row["ink_ratio"] == 0.0
    ]

    grouped: dict[str, list[dict[str, object]]] = {}
    for row in flagged:
        grouped.setdefault(str(row["file"]), []).append(row)

    lines = [
        "# Final Document Quality Scan",
        "",
        "Automated scan criteria:",
        "- blank or very low-content pages",
        "- rendered content touching page margins",
        "- pale text or linework that may be weak against white paper",
        "",
        f"Pages scanned: {len(rows)}",
        f"Pages flagged for human review: {len(flagged)}",
        "",
    ]

    if not grouped:
        lines.append("No automated review flags found.")
    else:
        for file_name, file_rows in grouped.items():
            lines.append(f"## {file_name}")
            for row in file_rows:
                lines.append(
                    "- Page {page}: margin={margin_flag}, low_contrast={low_contrast_flag} "
                    "(ink_ratio={ink_ratio:.4f}, low_contrast_ratio={low_contrast_ratio:.4f})".format(
                        **row
                    )
                )
            lines.append("")

    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(REPORT)
    print(CSV_REPORT)


if __name__ == "__main__":
    main()
