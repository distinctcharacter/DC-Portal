# Distinct Character Document Visual QA Checklist

Use this checklist before any protocol, companion, or resource is treated as final.

## Purpose

Every PDF or DOCX must be checked visually, not only edited for text. Text extraction can miss layout defects such as tables split across pages, clipped chart content, crowded headers, uneven covers, and legacy footer residue.

## Required QA Gate

Each final document must pass:

- standardized Distinct Character cover
- copyright and medical disclaimer page where applicable
- clean section hierarchy
- no unintended blank pages
- no table cut off by a page break
- no chart cut off by a page break
- no table extending past margins
- no overlapping header, footer, page number, or body text
- no legacy color/theme mismatch unless intentionally preserved
- no em dashes in authored content
- no generic filler or unsupported claims
- no workbook wording where the asset is now a protocol or companion

## Table And Chart Rules

Tables must be kept readable.

If a table is too wide:

- reduce columns
- move long prose out of the table
- split the table into smaller tables
- use landscape orientation only when truly necessary
- repeat header rows when a table must continue across pages

If a table is too tall:

- split at a logical section break
- keep headings with the first rows they describe
- avoid a single row breaking awkwardly across pages

Charts must not be sliced across pages.

If a chart does not fit:

- move it to the next page
- resize proportionally
- rebuild it as a simpler table or checklist
- create a separate reference page

## Portal Resource Rule

The portal must not show archive resources as current production assets.

For Somatic Baseline:

- current production resource: `DC-P01-SBP-CM01 Somatic Baseline Companion Materials`
- current printable protocol: `DC-P01-SBP-PC01 Somatic Baseline Printable Companion`
- current practitioner-gated asset: `DC-P01-SBP-TA01 Somatic Baseline Practitioner Therapeutic Addendum` (`somatic-baseline-practitioner-therapeutic-addendum.pdf`, 21-page visual QA passed 2026-08-27; protected path only)
- old SBP quick reference/resource guide/integration guide are book club archive assets, not portal production resources

## QA Status Labels

Use these labels in tracking:

| Status | Meaning |
|---|---|
| Not Started | No render review completed |
| Text Audited | Grammar, terminology, and claims reviewed |
| Cover Aligned | Standard cover applied |
| Rendered | PDF/page images generated |
| Visual QA Passed | Every page reviewed for layout defects |
| Needs Fix | One or more visual issues found |
| Final | Clean PDF/DOCX ready for controlled library |

## Next Document QA Pass

The next visual QA pass should start with:

1. Somatic Baseline Protocol
2. Somatic Baseline Companion Materials
3. Body Signal Index
4. Nervous System Governance Guide
5. NSG Eating, Sleep, Movement, Recovery

This order protects the Phase 1 user experience first.

