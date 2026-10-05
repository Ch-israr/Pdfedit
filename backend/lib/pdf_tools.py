"""PDF tool implementations. Pure functions: bytes in, bytes out.

Tools (kept exactly as the frontend defines them):
  merge-pdf     — combine PDFs in order
  split-pdf     — page ranges ("1-3, 5") or every page (returned as a zip)
  compress-pdf  — downsample embedded JPEG images per level + rewrite
  pdf-to-word   — convert to DOCX (pdf2docx, imported lazily)

Only counting/identity logic lives outside this module.
"""
import io
import os
import tempfile
import zipfile

from pypdf import PdfReader, PdfWriter

TOOLS = ("merge-pdf", "split-pdf", "compress-pdf", "pdf-to-word")
MULTI_FILE_TOOLS = ("merge-pdf",)

MAX_PAGES_SINGLE_SPLIT = 200  # guard against zip bombs via "every page"


class ToolError(Exception):
    """A user-facing processing failure (does not consume usage allowance)."""


def _read(data: bytes) -> PdfReader:
    try:
        reader = PdfReader(io.BytesIO(data))
    except Exception as e:
        raise ToolError(f"Could not read the PDF file: {e}")
    if reader.is_encrypted:
        raise ToolError("Encrypted PDFs are not supported. Please unlock the file first.")
    if len(reader.pages) == 0:
        raise ToolError("The PDF has no pages.")
    return reader


def _write(writer: PdfWriter) -> bytes:
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


# ---------------------------------------------------------------- merge

def merge_pdfs(datas: list[bytes]) -> bytes:
    if len(datas) < 2:
        raise ToolError("Choose at least two PDF files to merge.")
    writer = PdfWriter()
    for data in datas:
        reader = _read(data)
        for page in reader.pages:
            writer.add_page(page)
    return _write(writer)


# ---------------------------------------------------------------- split

def parse_ranges(spec: str, page_count: int) -> list[int]:
    pages: list[int] = []
    for part in (spec or "").split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            a, b = part.split("-", 1)
            try:
                start, end = int(a.strip()), int(b.strip())
            except ValueError:
                raise ToolError(f"Invalid range '{part}'. Use a format like 1-3, 5, 8-10.")
            if start < 1 or end < start:
                raise ToolError(f"Invalid range '{part}'. Page numbers start at 1.")
            pages.extend(range(start, min(end, page_count) + 1))
        else:
            try:
                p = int(part)
            except ValueError:
                raise ToolError(f"Invalid page '{part}'. Use a format like 1-3, 5, 8-10.")
            if 1 <= p <= page_count:
                pages.append(p)
    seen: set[int] = set()
    ordered: list[int] = []
    for p in pages:
        if p not in seen:
            seen.add(p)
            ordered.append(p)
    return ordered


def split_pdf(data: bytes, mode: str, ranges: str) -> list[tuple[str, bytes]]:
    reader = _read(data)
    n = len(reader.pages)
    outputs: list[tuple[str, bytes]] = []
    if mode == "single":
        if n > MAX_PAGES_SINGLE_SPLIT:
            raise ToolError(
                f"This PDF has {n} pages; splitting every page is limited to "
                f"{MAX_PAGES_SINGLE_SPLIT} pages."
            )
        for i, page in enumerate(reader.pages):
            writer = PdfWriter()
            writer.add_page(page)
            outputs.append((f"page-{i + 1}.pdf", _write(writer)))
        return outputs
    wanted = parse_ranges(ranges, n)
    if not wanted:
        raise ToolError("No valid pages in ranges. Use a format like 1-3, 5, 8-10.")
    writer = PdfWriter()
    for p in wanted:
        writer.add_page(reader.pages[p - 1])
    return [("split.pdf", _write(writer))]


# ---------------------------------------------------------------- compress

_COMPRESS_LEVELS = {
    "low": (2000, 85),
    "medium": (1600, 75),
    "high": (1200, 60),
}


def _recompress_images(writer: PdfWriter, max_dim: int, quality: int) -> int:
    """Downsample embedded JPEG images larger than max_dim. Returns count changed."""
    from pypdf.generic import ArrayObject, NameObject, NumberObject

    try:
        from PIL import Image
    except ImportError:
        return 0

    changed = 0
    for page in writer.pages:
        try:
            xobjects = page["/Resources"]["/XObject"]
        except KeyError:
            continue
        for key in list(xobjects.keys()):
            img = xobjects[key].get_object()
            if img.get("/Subtype") != "/Image":
                continue
            filt = img.get("/Filter")
            filters = list(filt) if isinstance(filt, ArrayObject) else [filt]
            if "/DCTDecode" not in filters:
                continue  # v1 handles JPEG images only
            try:
                raw = bytes(img.get_data())
                pil = Image.open(io.BytesIO(raw))
                w, h = pil.size
                if max(w, h) <= max_dim:
                    continue
                scale = max_dim / max(w, h)
                pil = pil.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
                buf = io.BytesIO()
                pil.convert("RGB").save(buf, "JPEG", quality=quality, optimize=True)
                new_data = buf.getvalue()
                if len(new_data) >= len(raw):
                    continue  # never make it bigger
                img._data = new_data
                img[NameObject("/Width")] = NumberObject(pil.size[0])
                img[NameObject("/Height")] = NumberObject(pil.size[1])
                img[NameObject("/Filter")] = NameObject("/DCTDecode")
                # drop predictors/decode params that described the old stream
                for drop in ("/DecodeParms",):
                    if drop in img:
                        del img[drop]
                changed += 1
            except Exception:
                continue
    return changed


def compress_pdf(data: bytes, level: str = "medium") -> bytes:
    max_dim, quality = _COMPRESS_LEVELS.get((level or "medium").lower(), _COMPRESS_LEVELS["medium"])
    reader = _read(data)
    writer = PdfWriter()
    writer.compress_identical_objects()
    for page in reader.pages:
        writer.add_page(page)
    _recompress_images(writer, max_dim, quality)
    return _write(writer)


# ---------------------------------------------------------------- pdf to word

def pdf_to_word(data: bytes) -> bytes:
    # Lazy import: PyMuPDF is heavy; only pay the cold-start cost for this tool.
    try:
        from pdf2docx import Converter
    except ImportError as e:
        raise ToolError(f"PDF to Word is temporarily unavailable: {e}")

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_in:
        tmp_in.write(data)
        pdf_path = tmp_in.name
    docx_path = pdf_path + ".docx"
    try:
        try:
            converter = Converter(pdf_path)
            try:
                converter.convert(docx_path)
            finally:
                converter.close()
        except Exception as e:
            raise ToolError(f"Could not convert this PDF to Word: {e}")
        with open(docx_path, "rb") as f:
            return f.read()
    finally:
        for path in (pdf_path, docx_path):
            try:
                os.unlink(path)
            except OSError:
                pass


# ---------------------------------------------------------------- dispatch

def to_zip(outputs: list[tuple[str, bytes]]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, data in outputs:
            zf.writestr(name, data)
    return buf.getvalue()
