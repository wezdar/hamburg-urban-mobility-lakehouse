"""Build the illustrated ElbeFlow portfolio report.

The generated PDF is intentionally reproducible from repository assets only.
"""

# ruff: noqa: E501 — report copy is kept as readable source strings.

from __future__ import annotations

from pathlib import Path

from PIL import Image
from reportlab.lib.colors import Color, HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import Paragraph

ROOT = Path(__file__).resolve().parents[1]
SCREENSHOTS = ROOT / "docs" / "screenshots"
OUTPUT = ROOT / "output" / "pdf" / "elbeflow-project-report.pdf"

PAGE_W, PAGE_H = landscape(A4)
INK = HexColor("#102231")
MUTED = HexColor("#5B6B78")
PAPER = HexColor("#F5F1E8")
WHITE = HexColor("#FFFFFF")
TEAL = HexColor("#0B6C69")
TEAL_DARK = HexColor("#073E3C")
ORANGE = HexColor("#E9633B")
YELLOW = HexColor("#F2C94C")
LINE = HexColor("#D8D2C5")


def register_fonts() -> tuple[str, str, str]:
    candidates = [
        (
            Path("/System/Library/Fonts/Supplemental/Arial.ttf"),
            Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
            Path("/System/Library/Fonts/Supplemental/Arial Italic.ttf"),
        ),
        (
            Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
            Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
            Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf"),
        ),
    ]
    for regular, bold, italic in candidates:
        if regular.exists() and bold.exists() and italic.exists():
            pdfmetrics.registerFont(TTFont("ElbeRegular", str(regular)))
            pdfmetrics.registerFont(TTFont("ElbeBold", str(bold)))
            pdfmetrics.registerFont(TTFont("ElbeItalic", str(italic)))
            return "ElbeRegular", "ElbeBold", "ElbeItalic"
    return "Helvetica", "Helvetica-Bold", "Helvetica-Oblique"


FONT, FONT_BOLD, FONT_ITALIC = register_fonts()


BODY = ParagraphStyle(
    "body",
    fontName=FONT,
    fontSize=10.5,
    leading=15,
    textColor=INK,
    alignment=TA_LEFT,
    spaceAfter=7,
)
SMALL = ParagraphStyle(
    "small",
    parent=BODY,
    fontSize=8.5,
    leading=12,
    textColor=MUTED,
)
CAPTION = ParagraphStyle(
    "caption",
    parent=SMALL,
    fontName=FONT_ITALIC,
    fontSize=7.7,
    leading=10,
)


def paragraph(canvas: Canvas, text: str, x: float, y_top: float, width: float, style=BODY) -> float:
    item = Paragraph(text, style)
    _, height = item.wrap(width, PAGE_H)
    item.drawOn(canvas, x, y_top - height)
    return y_top - height


def page_background(canvas: Canvas, page_number: int, section: str) -> None:
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setFillColor(TEAL_DARK)
    canvas.rect(0, PAGE_H - 34, PAGE_W, 34, fill=1, stroke=0)
    canvas.setFont(FONT_BOLD, 9)
    canvas.setFillColor(WHITE)
    canvas.drawString(30, PAGE_H - 22, "ELBEFLOW · HAMBURG URBAN MOBILITY LAKEHOUSE")
    canvas.setFont(FONT, 8)
    canvas.drawRightString(PAGE_W - 30, PAGE_H - 22, section.upper())
    canvas.setStrokeColor(LINE)
    canvas.line(30, 24, PAGE_W - 30, 24)
    canvas.setFillColor(MUTED)
    canvas.setFont(FONT, 7.5)
    canvas.drawString(30, 11, "Portfolio case study · Official Hamburg mobility data · August 2026")
    canvas.drawRightString(PAGE_W - 30, 11, f"{page_number:02d}")


def title(canvas: Canvas, text: str, subtitle: str | None = None) -> float:
    canvas.setFillColor(INK)
    canvas.setFont(FONT_BOLD, 25)
    canvas.drawString(38, PAGE_H - 78, text)
    if subtitle:
        canvas.setFont(FONT, 10)
        canvas.setFillColor(MUTED)
        canvas.drawString(39, PAGE_H - 96, subtitle)
        return PAGE_H - 115
    return PAGE_H - 100


def rounded_card(canvas: Canvas, x: float, y: float, width: float, height: float, fill=WHITE) -> None:
    canvas.setFillColor(fill)
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.6)
    canvas.roundRect(x, y, width, height, 9, fill=1, stroke=1)


def draw_screenshot(
    canvas: Canvas,
    filename: str,
    x: float,
    y: float,
    width: float,
    height: float,
    *,
    anchor: str = "center",
) -> None:
    path = SCREENSHOTS / filename
    with Image.open(path) as image:
        source_w, source_h = image.size
    scale = min(width / source_w, height / source_h)
    rendered_w = source_w * scale
    rendered_h = source_h * scale
    image_x = x + (width - rendered_w) / 2
    if anchor == "top":
        image_y = y + height - rendered_h
    else:
        image_y = y + (height - rendered_h) / 2
    canvas.setFillColor(WHITE)
    canvas.setStrokeColor(HexColor("#BFC8C9"))
    canvas.roundRect(image_x - 4, image_y - 4, rendered_w + 8, rendered_h + 8, 8, fill=1, stroke=1)
    canvas.saveState()
    clip = canvas.beginPath()
    clip.roundRect(image_x, image_y, rendered_w, rendered_h, 5)
    canvas.clipPath(clip, stroke=0, fill=0)
    canvas.drawImage(
        ImageReader(str(path)),
        image_x,
        image_y,
        rendered_w,
        rendered_h,
        preserveAspectRatio=True,
        mask="auto",
    )
    canvas.restoreState()


def bullet_list(canvas: Canvas, items: list[str], x: float, y_top: float, width: float) -> float:
    y = y_top
    for item in items:
        canvas.setFillColor(ORANGE)
        canvas.circle(x + 4, y - 7, 2.4, fill=1, stroke=0)
        y = paragraph(canvas, item, x + 14, y, width - 14, BODY) - 5
    return y


def screenshot_page(
    canvas: Canvas,
    page_number: int,
    heading: str,
    subtitle: str,
    filename: str,
    insight_title: str,
    description: str,
    bullets: list[str],
    caption: str,
) -> None:
    page_background(canvas, page_number, "Product walkthrough")
    title(canvas, heading, subtitle)
    image_x = 60
    # Keep the screenshot below the title/subtitle block so every page remains
    # readable at normal PDF zoom while preserving a large product view.
    image_y = 96
    image_w = PAGE_W - 120
    image_h = 390
    draw_screenshot(canvas, filename, image_x, image_y, image_w, image_h, anchor="top")

    canvas.setFillColor(TEAL)
    canvas.roundRect(60, 48, 172, 42, 8, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont(FONT_BOLD, 10.5)
    canvas.drawString(73, 73, insight_title)
    canvas.setFont(FONT, 7)
    canvas.drawString(73, 59, "WHAT THE SCREEN PROVES")
    paragraph(canvas, description, 252, 84, 285, SMALL)
    paragraph(canvas, " • ".join(bullets), 550, 84, 232, CAPTION)
    paragraph(canvas, caption, 60, 37, PAGE_W - 120, CAPTION)
    canvas.showPage()


def build_report() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    canvas = Canvas(str(OUTPUT), pagesize=(PAGE_W, PAGE_H), pageCompression=1)
    canvas.setTitle("ElbeFlow · Hamburg Urban Mobility Lakehouse")
    canvas.setAuthor("Wezdar")
    canvas.setSubject("Data engineering portfolio project report")

    # 01 · Cover
    canvas.setFillColor(TEAL_DARK)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setFillColor(Color(1, 1, 1, alpha=0.08))
    canvas.circle(PAGE_W - 58, PAGE_H - 55, 180, fill=1, stroke=0)
    canvas.circle(PAGE_W - 168, 70, 118, fill=1, stroke=0)
    canvas.setFillColor(YELLOW)
    canvas.roundRect(44, PAGE_H - 79, 118, 24, 12, fill=1, stroke=0)
    canvas.setFont(FONT_BOLD, 9)
    canvas.setFillColor(TEAL_DARK)
    canvas.drawCentredString(103, PAGE_H - 71, "PORTFOLIO CASE STUDY")
    canvas.setFillColor(WHITE)
    canvas.setFont(FONT_BOLD, 38)
    canvas.drawString(44, PAGE_H - 151, "ElbeFlow")
    canvas.setFont(FONT_BOLD, 25)
    canvas.drawString(44, PAGE_H - 185, "Hamburg Urban Mobility Lakehouse")
    canvas.setFillColor(HexColor("#C7E4E0"))
    canvas.setFont(FONT, 14)
    canvas.drawString(46, PAGE_H - 218, "Seven official urban layers, explainable analytics and a multilingual decision product")

    metrics = [
        ("84,191", "official streams"),
        ("~459M", "scheduled observations"),
        ("102,994", "verified sample rows"),
        ("7", "official data layers"),
    ]
    x = 44
    for value, label in metrics:
        canvas.setFillColor(Color(1, 1, 1, alpha=0.09))
        canvas.roundRect(x, 214, 170, 80, 10, fill=1, stroke=0)
        canvas.setFillColor(WHITE)
        canvas.setFont(FONT_BOLD, 22)
        canvas.drawString(x + 14, 257, value)
        canvas.setFillColor(HexColor("#BBD7D4"))
        canvas.setFont(FONT, 9)
        canvas.drawString(x + 14, 236, label.upper())
        x += 187

    canvas.setFillColor(WHITE)
    canvas.setFont(FONT_BOLD, 11)
    canvas.drawString(46, 165, "PYTHON · PARQUET · DUCKDB · DBT · REACT · TERRAFORM · OPENTELEMETRY")
    canvas.setFillColor(HexColor("#BBD7D4"))
    canvas.setFont(FONT, 9)
    canvas.drawString(46, 140, "German by default · English · French · Arabic with right-to-left layout")
    canvas.setFillColor(ORANGE)
    canvas.rect(44, 100, 84, 4, fill=1, stroke=0)
    canvas.setFillColor(HexColor("#BBD7D4"))
    canvas.setFont(FONT, 8)
    canvas.drawString(44, 74, "ILLUSTRATED PROJECT REPORT · AUGUST 2026")
    canvas.showPage()

    # 02 · Engineering story
    page_background(canvas, 2, "Executive summary")
    title(canvas, "A data platform that ends in a usable product", "The project is designed to be evaluated at both engineering and product level.")
    stages = [
        ("01", "INGEST", "Paginated source adapters, bounded retries and incremental monthly windows."),
        ("02", "STORE", "Immutable JSONL/Gzip bronze and partitioned Parquet/ZSTD silver."),
        ("03", "MODEL", "DuckDB analytics, dbt transformations and explicit quality contracts."),
        ("04", "DELIVER", "Predictive, multilingual React product with cloud and observability assets."),
    ]
    x = 38
    for index, label, copy in stages:
        rounded_card(canvas, x, 320, 180, 140)
        canvas.setFillColor(ORANGE)
        canvas.setFont(FONT_BOLD, 24)
        canvas.drawString(x + 15, 420, index)
        canvas.setFillColor(INK)
        canvas.setFont(FONT_BOLD, 11)
        canvas.drawString(x + 15, 393, label)
        paragraph(canvas, copy, x + 15, 374, 150, SMALL)
        if index != "04":
            canvas.setStrokeColor(TEAL)
            canvas.setLineWidth(2)
            canvas.line(x + 180, 390, x + 194, 390)
        x += 194

    rounded_card(canvas, 38, 76, PAGE_W - 76, 210, fill=HexColor("#E7F0EC"))
    canvas.setFillColor(TEAL_DARK)
    canvas.setFont(FONT_BOLD, 15)
    canvas.drawString(56, 252, "Honest scale accounting")
    paragraph(
        canvas,
        "The application separates exact counts from estimates. <b>84,191 streams</b> is a catalogue count. "
        "<b>102,994 rows</b> is the exact committed sample count. <b>~459 million</b> is a conservative "
        "coverage-by-cadence estimate for scheduled sources only; traffic-light and charging events are excluded.",
        56,
        228,
        360,
        BODY,
    )
    canvas.setFillColor(WHITE)
    canvas.roundRect(448, 102, 336, 142, 8, fill=1, stroke=0)
    canvas.setFillColor(INK)
    canvas.setFont(FONT_BOLD, 11)
    canvas.drawString(466, 219, "Core reliability choices")
    bullet_list(
        canvas,
        [
            "Idempotent partitions and half-open time windows",
            "Atomic completion, deduplication and SHA-256 verification",
            "Live API fallback without hiding freshness state",
            "Local-first design with a direct cloud migration path",
        ],
        466,
        199,
        294,
    )
    canvas.showPage()

    screenshot_page(
        canvas,
        3,
        "Executive dashboard",
        "German is the default experience for the Hamburg target market.",
        "dashboard-de-overview-v2.jpg",
        "Scale in seconds",
        "The opening view gives reviewers immediate evidence of the project’s size, source diversity and reproducibility.",
        [
            "84,191 exact SensorThings streams",
            "~459 million scheduled records",
            "102,994 verified real sample rows",
            "Seven official Hamburg data layers",
        ],
        "Figure 1 — Default German overview with live-status indicator and headline metrics.",
    )
    screenshot_page(
        canvas,
        4,
        "Official source atlas",
        "A single catalogue explains five very different operational datasets.",
        "dashboard-de-sources-v2.jpg",
        "Source diversity",
        "Each card communicates ownership, cadence, historical coverage, stream count and ingestion behavior.",
        [
            "Traffic-light detector events from 2009",
            "EV charging events and site status",
            "15-minute motor-traffic measurements",
            "5-minute bicycle counts and StadtRAD availability",
        ],
        "Figure 2 — Source catalogue with data-domain metadata and coverage boundaries.",
    )
    screenshot_page(
        canvas,
        5,
        "Multi-layer city map",
        "A bright map makes official traffic, HVV and StadtRAD signals readable and interactive.",
        "dashboard-de-network-v2.jpg",
        "Operational value",
        "The map provides real geographic context, independent layer controls and click-through detail for each operational signal.",
        [
            "12 current Polizei Hamburg traffic notices",
            "12 official HVV rail hubs and lines",
            "360 StadtRAD stations with health states",
            "Light basemap with readable roads and the Elbe",
        ],
        "Figure 3 — Traffic-only layer with an official notice selected on the redesigned light map.",
    )
    screenshot_page(
        canvas,
        6,
        "Predictive mobility",
        "Forecasts remain explainable, back-tested and explicit about uncertainty.",
        "dashboard-de-intelligence.jpg",
        "No black-box claims",
        "A rolling baseline produces a 12-hour availability outlook, while the historical explorer shows reproducible source coverage rather than invented observations.",
        [
            "12 forecast points with a confidence indicator",
            "Mean absolute error from a rolling holdout",
            "Interactive historical coverage from 2009 to 2026",
            "Scheduled capacity calculated from source cadence",
        ],
        "Figure 4 — Explainable forecast KPIs and reproducible historical explorer.",
    )
    screenshot_page(
        canvas,
        7,
        "Operations and sustainability",
        "Rule-based alerts, scenario impact and model quality share one decision surface.",
        "dashboard-de-operations.jpg",
        "Operational honesty",
        "Alerts come directly from station states and police closures. CO2 is clearly labelled as a scenario estimate, never a measured emission.",
        [
            "Prioritised empty and stale station alerts",
            "Current road closures from official WFS data",
            "Transparent CO2 formula and assumptions",
            "Model card with MAE and holdout size",
        ],
        "Figure 5 — Operations centre with anomaly, environmental and model-quality evidence.",
    )
    screenshot_page(
        canvas,
        8,
        "Quality and data contract",
        "Reliability is presented as measurable product behavior.",
        "dashboard-de-quality-v2.jpg",
        "Trust is visible",
        "Freshness, completeness, validity and uniqueness are shown beside the rules that protect downstream analytics.",
        [
            "Required-key and timestamp validation",
            "Duplicate observation protection",
            "Domain checks for impossible negative counts",
            "Clear separation of verified and estimated values",
        ],
        "Figure 6 — Quality indicators and the explicit contract enforced by the pipeline.",
    )
    screenshot_page(
        canvas,
        9,
        "Lakehouse architecture",
        "The dashboard explains how the repository turns APIs into analytics.",
        "dashboard-de-pipeline-v2.jpg",
        "End-to-end ownership",
        "The architecture view connects ingestion, object storage, analytical modeling, orchestration and delivery.",
        [
            "Immutable bronze for replayability",
            "Partitioned Parquet silver for efficient scans",
            "DuckDB + dbt for local analytics and contracts",
            "Airflow orchestration and automated validation",
        ],
        "Figure 7 — Recruiter-readable bronze/silver/warehouse/product architecture.",
    )
    screenshot_page(
        canvas,
        10,
        "Lineage, observability and cloud",
        "Every metric is connected from source to product and to a concrete deployment path.",
        "dashboard-de-lineage.jpg",
        "Production readiness",
        "The visible lineage is backed by repository assets for containers, Terraform, OpenTelemetry and GitHub Actions validation.",
        [
            "Seven sources through bronze, silver and contracts",
            "DuckDB + dbt analytical serving layer",
            "Dockerised web and pipeline workloads",
            "Terraform ECS/S3 reference and OTLP collector",
        ],
        "Figure 8 — End-to-end lineage with health states and cloud-ready delivery assets.",
    )
    screenshot_page(
        canvas,
        11,
        "English interface",
        "The full product can be evaluated by an international hiring team.",
        "dashboard-en-overview-v2.jpg",
        "International review",
        "English localization covers navigation, source metadata, operational labels, quality explanations and formatting.",
        [
            "Complete UI localization",
            "Locale-aware numeric and date formatting",
            "Stable analytical meaning across languages",
            "One-click language switching",
        ],
        "Figure 9 — English overview preserving the same analytical hierarchy as German.",
    )
    screenshot_page(
        canvas,
        12,
        "French interface",
        "Localization is implemented at the product layer, not as a static mock-up.",
        "dashboard-fr-overview-v2.jpg",
        "Consistent semantics",
        "French users receive translated labels and explanations while every metric remains sourced from the same typed dataset.",
        [
            "Translated product and engineering vocabulary",
            "French number formatting",
            "Identical data lineage and interactions",
            "Shared component system avoids interface drift",
        ],
        "Figure 10 — French overview using the common data and component model.",
    )
    screenshot_page(
        canvas,
        13,
        "Arabic right-to-left interface",
        "The application changes both language and document direction.",
        "dashboard-ar-overview-v2.jpg",
        "Real RTL behavior",
        "Arabic is not only translated: navigation, hierarchy, alignment and reading flow are mirrored for right-to-left use.",
        [
            "Document-level RTL direction",
            "Arabic typography and translated interface copy",
            "Layout-specific alignment corrections",
            "Latin digits retained for technical readability",
        ],
        "Figure 11 — Arabic overview with genuine RTL layout behavior.",
    )

    # 14 · Mobile screenshot needs a portrait-specific composition.
    page_background(canvas, 14, "Responsive delivery")
    title(canvas, "Mobile experience", "The same decision product remains usable on a 390 × 844 viewport.")
    draw_screenshot(canvas, "dashboard-mobile-de-v2.jpg", 52, 58, 270, 430, anchor="top")
    rounded_card(canvas, 360, 98, 430, 338)
    canvas.setFillColor(TEAL)
    canvas.roundRect(384, 377, 140, 28, 14, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont(FONT_BOLD, 9)
    canvas.drawCentredString(454, 387, "RESPONSIVE PRODUCT")
    canvas.setFillColor(INK)
    canvas.setFont(FONT_BOLD, 18)
    canvas.drawString(384, 344, "Designed beyond the desktop demo")
    y = paragraph(
        canvas,
        "The mobile layout preserves the live state, core scale metrics and language controls without horizontal overflow. "
        "Dense analytical sections collapse into a readable single-column experience.",
        384,
        318,
        370,
        BODY,
    )
    bullet_list(
        canvas,
        [
            "Verified at 390 × 844 pixels",
            "No horizontal document overflow",
            "Accessible language controls remain available",
            "Headline metrics preserve their visual priority",
        ],
        384,
        y - 12,
        350,
    )
    paragraph(
        canvas,
        "Figure 12 — German mobile overview captured from the running application.",
        384,
        124,
        350,
        CAPTION,
    )
    canvas.showPage()

    canvas.save()


if __name__ == "__main__":
    build_report()
    print(OUTPUT)
