from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

WIDTH = 1200
HEIGHT = 630

BG = "#0a0e13"
TEXT = "#eaf0f7"
MUTED = "#9ca8ba"
ACCENT = "#7ee4d2"
ACCENT_2 = "#6eb8ff"
SURFACE = "#111721"

ROOT = Path(__file__).resolve().parents[1]

FONT_REGULAR = str(Path("/System/Library/Fonts/Supplemental/Arial.ttf"))
FONT_BOLD = str(Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf"))


def font(size: int, bold: bool = False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, size)


def hex_rgba(value: str, alpha: int = 255):
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4)) + (alpha,)


def wrap(draw, text, box_width, text_font):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        attempt = word if not current else f"{current} {word}"
        bbox = draw.textbbox((0, 0), attempt, font=text_font)
        if bbox[2] - bbox[0] <= box_width:
            current = attempt
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def new_canvas():
    image = Image.new("RGBA", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)

    for y in range(HEIGHT):
        blend = y / HEIGHT
        r = int(10 + (16 - 10) * blend)
        g = int(14 + (18 - 14) * blend)
        b = int(19 + (30 - 19) * blend)
        draw.line((0, y, WIDTH, y), fill=(r, g, b, 255))

    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((-120, -80, 520, 420), fill=hex_rgba(ACCENT, 30))
    glow_draw.ellipse((720, -120, 1320, 340), fill=hex_rgba(ACCENT_2, 42))
    glow = glow.filter(ImageFilter.GaussianBlur(80))
    image.alpha_composite(glow)

    grid = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    grid_draw = ImageDraw.Draw(grid)
    for x in range(0, WIDTH, 44):
        grid_draw.line((x, 0, x, HEIGHT), fill=(234, 240, 247, 10))
    for y in range(0, HEIGHT, 24):
        grid_draw.line((0, y, WIDTH, y), fill=(234, 240, 247, 8))
    image.alpha_composite(grid)

    return image


def generate_brand_card(path: Path):
    image = new_canvas()
    draw = ImageDraw.Draw(image)

    draw.text((72, 64), "AdsChecks", font=font(34, bold=True), fill=TEXT)
    draw.text((72, 106), "Technical ad verification", font=font(20), fill=MUTED)

    draw.rounded_rectangle(
        (72, 174, 1128, 536),
        radius=36,
        fill=hex_rgba(SURFACE, 228),
        outline=(255, 255, 255, 24),
        width=2,
    )
    draw.rounded_rectangle(
        (90, 192, 1110, 518),
        radius=28,
        outline=hex_rgba(ACCENT_2, 64),
        width=2,
    )

    label = "WHAT WE DO"
    label_font = font(20, bold=True)
    label_box = draw.textbbox((0, 0), label, font=label_font)
    label_width = label_box[2] - label_box[0] + 34
    draw.rounded_rectangle((120, 222, 120 + label_width, 258), radius=18, fill=hex_rgba(ACCENT, 28), outline=hex_rgba(ACCENT, 96), width=2)
    draw.text((138, 229), label, font=label_font, fill=TEXT)

    heading_font = font(54, bold=True)
    heading_lines = [
        "Ad slot verification",
        "across GEO",
        "and device.",
    ]
    y = 276
    for line in heading_lines:
        draw.text((120, y), line, font=heading_font, fill=TEXT)
        y += 64

    image.save(path)


def main():
    generate_brand_card(ROOT / "og.png")
    print("Generated social image: og.png")


if __name__ == "__main__":
    main()
