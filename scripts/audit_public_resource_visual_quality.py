from __future__ import annotations

import math
import re
import sys
from dataclasses import dataclass
from pathlib import Path
import argparse

sys.path.insert(0, str(Path(".codex/python-packages").resolve()))

import fitz  # type: ignore
from PIL import Image, ImageChops, ImageDraw


RESOURCE_DIR = Path("public/resources")
OUTPUT_ROOT = Path("qa-renders/final-resource-launch-qa")


@dataclass
class PdfFinding:
    name: str
    pages: int
    cover_status: str
    front_matter_status: str
    blank_risk_pages: list[int]
    low_text_pages: list[int]
    low_contrast_pages: list[str]
    edge_risk_pages: list[int]
    toc_risk_pages: list[int]


def slugify(value: str) -> str:
    value = value.lower().replace(".pdf", "")
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-")


def int_to_rgb(value: int) -> tuple[int, int, int]:
    return ((value >> 16) & 255, (value >> 8) & 255, value & 255)


def relative_luminance(rgb: tuple[int, int, int]) -> float:
    def channel(component: int) -> float:
        scaled = component / 255
        if scaled <= 0.03928:
            return scaled / 12.92
        return ((scaled + 0.055) / 1.055) ** 2.4

    r, g, b = rgb
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)


def contrast_against_white(rgb: tuple[int, int, int]) -> float:
    white = relative_luminance((255, 255, 255))
    text = relative_luminance(rgb)
    return (white + 0.05) / (text + 0.05)


def render_page(page: fitz.Page, zoom: float = 0.6) -> Image.Image:
    pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
    return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


def ink_ratio(image: Image.Image) -> float:
    grayscale = image.convert("L")
    white = Image.new("L", grayscale.size, 255)
    diff = ImageChops.difference(grayscale, white)
    bbox = diff.point(lambda value: 255 if value > 18 else 0).getbbox()
    if bbox is None:
        return 0.0
    non_white = 0
    for value in diff.crop(bbox).getdata():
        if value > 18:
            non_white += 1
    return non_white / float(image.width * image.height)


def page_word_count(page: fitz.Page) -> int:
    return len(page.get_text("text").split())


def page_text(page: fitz.Page) -> str:
    return " ".join(page.get_text("text").split()).lower()


def cover_status(doc: fitz.Document) -> str:
    if doc.page_count == 0:
        return "FAIL: empty PDF."
    text = page_text(doc[0])
    has_brand = "distinct character" in text
    has_protocol_language = any(
        word in text
        for word in [
            "protocol",
            "companion",
            "guide",
            "resource",
            "mastermind",
            "blueprint",
            "framework",
            "index",
        ]
    )
    if has_brand and has_protocol_language:
        return "PASS: cover includes Distinct Character and document-type/title language."
    if has_brand:
        return "REVIEW: cover includes Distinct Character but document-type/title language was not detected."
    return "REVIEW: Distinct Character text was not detected on the cover."


def front_matter_status(doc: fitz.Document) -> str:
    first_three = " ".join(page_text(doc[index]) for index in range(min(3, doc.page_count)))
    has_copyright = "copyright" in first_three
    has_disclaimer = "medical disclaimer" in first_three or "not medical advice" in first_three
    if has_copyright and has_disclaimer:
        return "PASS: copyright and medical disclaimer language detected in front matter."
    if has_copyright:
        return "REVIEW: copyright detected, but medical disclaimer language was not detected in first three pages."
    if has_disclaimer:
        return "REVIEW: medical disclaimer detected, but copyright language was not detected in first three pages."
    return "REVIEW: copyright and medical disclaimer language were not detected in first three pages."


def low_contrast_flags(page: fitz.Page, page_number: int) -> list[str]:
    flags: list[str] = []
    text_dict = page.get_text("dict")
    for block in text_dict.get("blocks", []):
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                text = " ".join(str(span.get("text", "")).split())
                if not text:
                    continue
                size = float(span.get("size", 0))
                rgb = int_to_rgb(int(span.get("color", 0)))
                contrast = contrast_against_white(rgb)
                minimum = 3.0 if size >= 18 else 4.5
                if contrast < minimum:
                    sample = text[:42] + ("..." if len(text) > 42 else "")
                    flags.append(
                        f"p{page_number}: contrast {contrast:.2f}:1 for RGB{rgb} text `{sample}`"
                    )
                    if len(flags) >= 4:
                        return flags
    return flags


def text_edge_risk(page: fitz.Page) -> bool:
    width = page.rect.width
    height = page.rect.height
    margin = 16
    for block in page.get_text("blocks"):
        x0, y0, x1, y1 = block[:4]
        text = str(block[4]).strip() if len(block) > 4 else ""
        if not text:
            continue
        if x0 < margin or x1 > width - margin or y0 < margin or y1 > height - margin:
            return True
    return False


def audit_pdf(pdf_path: Path) -> PdfFinding:
    label = slugify(pdf_path.name)
    output_dir = OUTPUT_ROOT / label
    pages_dir = output_dir / "pages"
    pages_dir.mkdir(parents=True, exist_ok=True)

    blank_risk_pages: list[int] = []
    low_text_pages: list[int] = []
    low_contrast_pages: list[str] = []
    edge_risk_pages: list[int] = []
    toc_risk_pages: list[int] = []

    doc = fitz.open(pdf_path)
    rendered: list[Image.Image] = []

    for index, page in enumerate(doc, start=1):
        image = render_page(page)
        image.save(pages_dir / f"page-{index:03d}.png")
        rendered.append(image.copy())

        if ink_ratio(image) < 0.006:
            blank_risk_pages.append(index)
        if 1 < index < doc.page_count and page_word_count(page) < 45:
            low_text_pages.append(index)
        low_contrast_pages.extend(low_contrast_flags(page, index))
        if text_edge_risk(page):
            edge_risk_pages.append(index)
        if "contents" in page_text(page) and page_word_count(page) < 40:
            toc_risk_pages.append(index)

    make_contact_sheet(rendered, output_dir / f"{label}-contact-sheet.png")

    finding = PdfFinding(
        name=pdf_path.name,
        pages=doc.page_count,
        cover_status=cover_status(doc),
        front_matter_status=front_matter_status(doc),
        blank_risk_pages=blank_risk_pages,
        low_text_pages=low_text_pages,
        low_contrast_pages=low_contrast_pages,
        edge_risk_pages=edge_risk_pages,
        toc_risk_pages=toc_risk_pages,
    )
    doc.close()
    return finding


def make_contact_sheet(images: list[Image.Image], output_path: Path) -> None:
    if not images:
        return
    thumb_width = 240
    thumb_height = 320
    label_height = 32
    columns = 4
    rows = math.ceil(len(images) / columns)
    sheet = Image.new("RGB", (columns * thumb_width, rows * (thumb_height + label_height)), (31, 31, 36))
    draw = ImageDraw.Draw(sheet)

    for index, source in enumerate(images):
        image = source.copy()
        row = index // columns
        col = index % columns
        image.thumbnail((thumb_width - 18, thumb_height - 18))
        x = col * thumb_width + (thumb_width - image.width) // 2
        y = row * (thumb_height + label_height) + 8
        sheet.paste(image, (x, y))
        draw.text(
            (col * thumb_width + 12, row * (thumb_height + label_height) + thumb_height + 6),
            f"Page {index + 1}",
            fill=(245, 241, 234),
        )

    sheet.save(output_path)


def format_pages(pages: list[int]) -> str:
    return ", ".join(str(page) for page in pages) if pages else "none"


def main() -> None:
    global RESOURCE_DIR, OUTPUT_ROOT
    parser = argparse.ArgumentParser()
    parser.add_argument("--resource-dir", type=Path, default=RESOURCE_DIR)
    parser.add_argument("--output-root", type=Path, default=OUTPUT_ROOT)
    args = parser.parse_args()
    RESOURCE_DIR = args.resource_dir
    OUTPUT_ROOT = args.output_root
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    findings = [audit_pdf(path) for path in sorted(RESOURCE_DIR.glob("*.pdf"))]

    lines = [
        "# Final Resource Launch QA Report",
        "",
        "Scope: public PDF resources in `public/resources`.",
        "",
        "Automated checks performed:",
        "- rendered every PDF page to PNG for visual review;",
        "- checked whether covers include Distinct Character and document-type/title language;",
        "- checked first three pages for copyright and medical disclaimer language;",
        "- flagged blank-page risks;",
        "- flagged pale/low-contrast text against a white page;",
        "- flagged text positioned near the page edge, which may indicate table or chart cutoff risk.",
        "",
        "Important: this report is an automated launch QA pass. Any REVIEW item should be visually inspected before final deployment.",
        "",
        "## Findings",
        "",
    ]

    for item in findings:
        lines.extend(
            [
                f"### {item.name}",
                "",
                f"- Pages rendered: {item.pages}",
                f"- Cover check: {item.cover_status}",
                f"- Copyright/disclaimer check: {item.front_matter_status}",
                f"- Blank-page risk pages: {format_pages(item.blank_risk_pages)}",
                f"- Low-text review pages: {format_pages(item.low_text_pages)}",
                f"- Text/table edge-risk pages: {format_pages(item.edge_risk_pages)}",
                f"- Empty/incomplete contents-page risks: {format_pages(item.toc_risk_pages)}",
                f"- Low-contrast text flags: {len(item.low_contrast_pages)}",
            ]
        )
        if item.low_contrast_pages:
            lines.append("- Low-contrast samples:")
            for flag in item.low_contrast_pages[:8]:
                lines.append(f"  - {flag}")
            if len(item.low_contrast_pages) > 8:
                lines.append(f"  - {len(item.low_contrast_pages) - 8} additional low-contrast samples omitted from this summary.")
        lines.append("")

    (OUTPUT_ROOT / "final-resource-launch-qa-report.md").write_text("\n".join(lines), encoding="utf-8")
    print(OUTPUT_ROOT / "final-resource-launch-qa-report.md")


if __name__ == "__main__":
    main()

