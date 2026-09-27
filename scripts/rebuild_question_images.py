from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / "tmp" / "pdfs" / "english-new"
PAGE_BOUNDS = {"module1": (1, 23), "module2": (24, 44)}
CONTENT_X = (155, 1375)


def header_starts(image):
    gray = image.convert("L")
    width, height = gray.size
    counts = [
        sum(gray.getpixel((x, y)) < 50 for x in range(160, 270))
        for y in range(height)
    ]
    active = [y for y, count in enumerate(counts) if count >= 70]
    bands = []
    for y in active:
        if not bands or y > bands[-1][-1] + 1:
            bands.append([y])
        else:
            bands[-1].append(y)
    bands = [band for band in bands if len(band) >= 20]

    starts = []
    for band in bands:
        if starts and band[0] - starts[-1] < 110:
            continue
        starts.append(band[0])
    return starts


def remove_blue_navigation(image):
    red, green, blue = image.convert("RGB").split()
    blue_over_red = ImageChops.subtract(blue, red).point(lambda value: 255 if value > 18 else 0)
    blue_over_green = ImageChops.subtract(blue, green).point(lambda value: 255 if value > 8 else 0)
    mask = ImageChops.multiply(blue_over_red, blue_over_green)
    projection = mask.resize((1, image.height), Image.Resampling.BOX)
    rows = [y for y, value in enumerate(projection.getdata()) if value]
    if not rows:
        return image
    result = image.copy()
    bands = []
    for y in rows:
        if not bands or y > bands[-1][-1] + 1:
            bands.append([y])
        else:
            bands[-1].append(y)
    for band in bands:
        top = max(0, band[0] - 8)
        bottom = min(image.height, band[-1] + 9)
        result.paste("white", (0, top, image.width, bottom))
    return result


def trim_white(image):
    diff = ImageChops.difference(image.convert("RGB"), Image.new("RGB", image.size, "white"))
    bbox = diff.point(lambda value: 255 if value > 20 else 0).getbbox()
    if bbox is None:
        return image
    left, top, right, bottom = bbox
    pad = 10
    return image.crop(
        (max(0, left - pad), max(0, top - pad), min(image.width, right + pad), min(image.height, bottom + pad))
    )


def render_module(module, first_page, last_page):
    pages = []
    entries = []
    for page_number in range(first_page, last_page + 1):
        image = Image.open(SOURCE / f"hi-{page_number:02d}.png").convert("RGB")
        starts = header_starts(image)
        pages.append(image)
        entries.extend((page_number, y) for y in starts)

    if len(entries) != 27:
        raise RuntimeError(f"{module}: expected 27 question headers, found {len(entries)}")

    out_dir = ROOT / "assets" / "questions" / module
    out_dir.mkdir(parents=True, exist_ok=True)
    for question_index, (page_number, y_start) in enumerate(entries):
        page_end = entries[question_index + 1][0] if question_index + 1 < len(entries) else last_page
        pieces = []
        for current_page in range(page_number, page_end + 1):
            image = pages[current_page - first_page]
            if current_page == page_number:
                top = max(0, y_start - 8)
            else:
                top = 0
            if current_page == page_end and question_index + 1 < len(entries):
                next_y = entries[question_index + 1][1]
                bottom = max(top + 1, next_y - 12)
            else:
                bottom = image.height
            segment = image.crop((CONTENT_X[0], top, CONTENT_X[1], bottom))
            segment = remove_blue_navigation(segment)
            segment = trim_white(segment)
            if segment.height > 1:
                pieces.append(segment)

        width = max(piece.width for piece in pieces)
        combined = Image.new("RGB", (width, sum(piece.height for piece in pieces) + 18 * (len(pieces) - 1)), "white")
        y = 0
        for piece in pieces:
            combined.paste(piece, ((width - piece.width) // 2, y))
            y += piece.height + 18
        combined.save(out_dir / f"q{question_index + 1:02d}.png", optimize=True)
        print(f"{module} Q{question_index + 1:02d}: {combined.width}x{combined.height}")


if __name__ == "__main__":
    for module, (first_page, last_page) in PAGE_BOUNDS.items():
        render_module(module, first_page, last_page)
