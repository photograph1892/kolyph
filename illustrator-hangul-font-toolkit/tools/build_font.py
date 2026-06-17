#!/usr/bin/env python3
"""Build font files from Hangul Glyphs Lab font package JSON or SVG Font.

This script accepts JSON exported from `hangul-glyphs-lab.html` with the
"폰트 빌드 JSON" button, or SVG Font exported with the "SVG 폰트" button.
It uses fontTools for actual font generation.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
from pathlib import Path
from xml.etree import ElementTree as ET


SUPPORTED_FORMATS = {"ttf", "otf", "woff", "woff2"}


def import_fonttools():
    try:
        from fontTools.fontBuilder import FontBuilder
        from fontTools.pens.ttGlyphPen import TTGlyphPen
        from fontTools.pens.t2CharStringPen import T2CharStringPen
        from fontTools.pens.transformPen import TransformPen
        from fontTools.svgLib.path import parse_path
    except ModuleNotFoundError as exc:
        raise SystemExit(
            "fontTools가 설치되어 있지 않습니다.\n"
            "설치 예시:\n"
            "  python -m pip install fonttools brotli\n"
            "WOFF2까지 만들려면 brotli도 필요합니다."
        ) from exc
    return FontBuilder, TTGlyphPen, T2CharStringPen, TransformPen, parse_path


def load_font_package(path: Path):
    text = path.read_text(encoding="utf-8")
    if path.suffix.lower() == ".svg" or text.lstrip().startswith("<"):
        return svg_font_to_package(text, path.stem)
    return json.loads(text)


def svg_font_to_package(svg_text: str, fallback_name: str):
    try:
        root = ET.fromstring(svg_text)
    except ET.ParseError as exc:
        raise SystemExit(f"SVG Font 파일을 읽을 수 없습니다: {exc}") from exc

    font_node = None
    font_face = None
    for node in root.iter():
        tag = strip_ns(node.tag)
        if tag == "font" and font_node is None:
            font_node = node
        elif tag == "font-face" and font_face is None:
            font_face = node
    if font_node is None:
        raise SystemExit("SVG 안에서 <font> 요소를 찾지 못했습니다. 'SVG 폰트'로 내보낸 파일인지 확인하세요.")

    face_attrs = font_face.attrib if font_face is not None else {}
    family_name = face_attrs.get("font-family") or font_node.attrib.get("id") or fallback_name or "HangulGlyphsLab"
    style_name = face_attrs.get("font-style") or "Regular"
    if style_name == "normal":
        style_name = "Regular"
    units_per_em = int(float(face_attrs.get("units-per-em") or 1000))
    ascent = int(float(face_attrs.get("ascent") or 880))
    descent = int(float(face_attrs.get("descent") or -120))
    default_width = int(float(font_node.attrib.get("horiz-adv-x") or units_per_em))

    glyphs = []
    for index, node in enumerate(font_node):
        if strip_ns(node.tag) != "glyph":
            continue
        char = node.attrib.get("unicode") or ""
        path_data = node.attrib.get("d") or ""
        if not char:
            continue
        glyphs.append({
            "id": f"svg{index}",
            "name": node.attrib.get("glyph-name") or f"uni{ord(char[0]):04X}",
            "char": char[0],
            "width": int(float(node.attrib.get("horiz-adv-x") or default_width)),
            "pathData": path_data,
        })

    if not glyphs:
        raise SystemExit("SVG Font 안에 unicode 값을 가진 <glyph>가 없습니다.")

    return {
        "schema": "hangul-glyphs-lab-svg-font-package-v1",
        "font": {
            "familyName": family_name,
            "styleName": style_name,
            "unitsPerEm": units_per_em,
            "ascent": ascent,
            "descent": descent,
            "baseline": ascent,
            "formats": ["ttf"],
            "script": "Hangul",
        },
        "glyphs": glyphs,
        "components": [],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Build TTF/OTF/WOFF/WOFF2 from Hangul Glyphs Lab JSON or SVG Font.")
    parser.add_argument("source", help="폰트 빌드 JSON 파일 또는 SVG Font 파일")
    parser.add_argument("-o", "--out-dir", default="dist-font", help="출력 폴더")
    parser.add_argument(
        "-f",
        "--formats",
        nargs="+",
        choices=sorted(SUPPORTED_FORMATS),
        help="출력 형식. JSON에서는 생략하면 JSON 안의 formats 값을 사용하고, SVG에서는 생략하면 ttf를 만듭니다.",
    )
    args = parser.parse_args()

    package_path = Path(args.source)
    package = load_font_package(package_path)
    font_meta = package.get("font") or {}
    formats = args.formats or font_meta.get("formats") or ["ttf"]
    formats = [fmt.lower() for fmt in formats if fmt.lower() in SUPPORTED_FORMATS]
    if not formats:
        formats = ["ttf"]

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    FontBuilder, TTGlyphPen, T2CharStringPen, TransformPen, parse_path = import_fonttools()
    builder = FontPackageBuilder(package, FontBuilder, TTGlyphPen, T2CharStringPen, TransformPen, parse_path)
    outputs = []
    if any(fmt in formats for fmt in ("ttf", "woff", "woff2")):
        outputs.extend(builder.build_ttf_family(out_dir, [fmt for fmt in formats if fmt in {"ttf", "woff", "woff2"}]))
    if "otf" in formats:
        outputs.append(builder.build_otf(out_dir))

    for output in outputs:
        print(output)
    return 0


class FontPackageBuilder:
    def __init__(self, package, FontBuilder, TTGlyphPen, T2CharStringPen, TransformPen, parse_path):
        self.package = package
        self.FontBuilder = FontBuilder
        self.TTGlyphPen = TTGlyphPen
        self.T2CharStringPen = T2CharStringPen
        self.TransformPen = TransformPen
        self.parse_path = parse_path
        self.meta = package.get("font") or {}
        self.upm = int(self.meta.get("unitsPerEm") or 1000)
        self.ascent = int(self.meta.get("ascent") or 880)
        self.descent = int(self.meta.get("descent") or -120)
        self.baseline = int(self.meta.get("baseline") or self.ascent)
        self.family = clean_name(self.meta.get("familyName") or "HangulGlyphsLab")
        self.style = clean_name(self.meta.get("styleName") or "Regular")
        self.ps_name = make_postscript_name(self.family, self.style)
        self.internal_family = make_internal_family_name(self.family)
        self.internal_full_name = f"{self.internal_family} {ascii_style_name(self.style)}"
        self.file_stem = safe_filename(f"{self.family}-{self.style}") or self.ps_name
        self.glyph_records = self._glyph_records()

    def _glyph_records(self):
        records = []
        used_names = {".notdef"}
        for index, glyph in enumerate(self.package.get("glyphs") or []):
            char = glyph.get("char") or ""
            if not char:
                continue
            name = make_glyph_name(glyph.get("name") or f"glyph{index}", char, used_names)
            used_names.add(name)
            records.append((name, glyph, ord(char[0])))
        return records

    def build_ttf_family(self, out_dir: Path, formats):
        ttf = self._build_ttf()
        outputs = []
        for fmt in formats:
            font = copy_font(ttf)
            font.flavor = None if fmt == "ttf" else fmt
            suffix = ".ttf" if fmt == "ttf" else f".{fmt}"
            path = out_dir / f"{self.file_stem}{suffix}"
            font.save(path)
            outputs.append(path)
        return outputs

    def build_otf(self, out_dir: Path):
        fb = self.FontBuilder(self.upm, isTTF=False)
        glyph_order = [".notdef"] + [name for name, _, _ in self.glyph_records]
        cmap = {codepoint: name for name, _, codepoint in self.glyph_records}
        metrics = {".notdef": (self.upm, 0)}
        charstrings = {}

        empty_pen = self.T2CharStringPen(self.upm, None)
        charstrings[".notdef"] = empty_pen.getCharString()
        for name, glyph, _ in self.glyph_records:
            width = int(glyph.get("width") or self.upm)
            pen = self.T2CharStringPen(width, None)
            self.draw_glyph(glyph, pen)
            charstrings[name] = pen.getCharString()
            metrics[name] = (width, 0)

        fb.setupGlyphOrder(glyph_order)
        fb.setupCharacterMap(cmap)
        fb.setupHorizontalMetrics(metrics)
        fb.setupHorizontalHeader(ascent=self.ascent, descent=self.descent)
        fb.setupNameTable(self.name_table())
        fb.setupOS2(
            sTypoAscender=self.ascent,
            sTypoDescender=self.descent,
            usWinAscent=max(self.upm, self.ascent),
            usWinDescent=abs(self.descent),
        )
        fb.setupPost()
        fb.setupCFF(self.ps_name, {"FullName": self.internal_full_name, "FamilyName": self.internal_family}, charstrings, {})
        self.apply_localized_names(fb.font)
        self.apply_hangul_metadata(fb.font)
        path = out_dir / f"{self.file_stem}.otf"
        fb.save(path)
        return path

    def _build_ttf(self):
        fb = self.FontBuilder(self.upm, isTTF=True)
        glyph_order = [".notdef"] + [name for name, _, _ in self.glyph_records]
        cmap = {codepoint: name for name, _, codepoint in self.glyph_records}
        glyphs = {}
        metrics = {".notdef": (self.upm, 0)}

        notdef_pen = self.TTGlyphPen(None)
        glyphs[".notdef"] = notdef_pen.glyph()
        for name, glyph, _ in self.glyph_records:
            width = int(glyph.get("width") or self.upm)
            pen = self.TTGlyphPen(None)
            self.draw_glyph(glyph, pen)
            glyphs[name] = pen.glyph()
            metrics[name] = (width, 0)

        fb.setupGlyphOrder(glyph_order)
        fb.setupCharacterMap(cmap)
        fb.setupGlyf(glyphs)
        fb.setupHorizontalMetrics(metrics)
        fb.setupHorizontalHeader(ascent=self.ascent, descent=self.descent)
        fb.setupNameTable(self.name_table())
        fb.setupOS2(
            sTypoAscender=self.ascent,
            sTypoDescender=self.descent,
            usWinAscent=max(self.upm, self.ascent),
            usWinDescent=abs(self.descent),
        )
        fb.setupPost()
        self.apply_localized_names(fb.font)
        self.apply_hangul_metadata(fb.font)
        return fb.font

    def name_table(self):
        return {
            "familyName": self.internal_family,
            "styleName": ascii_style_name(self.style),
            "uniqueFontIdentifier": self.ps_name,
            "fullName": self.internal_full_name,
            "psName": self.ps_name,
            "version": "Version 0.001",
        }

    def draw_glyph(self, glyph, target_pen):
        direct_path = glyph.get("pathData")
        if direct_path:
            try:
                self.parse_path(direct_path, target_pen)
            except Exception as exc:
                print(f"경고: {glyph.get('name')} SVG Font path를 건너뜀: {exc}", file=sys.stderr)
            return

        for element in glyph.get("elements") or []:
            transform = element_transform(element, self.baseline)
            pen = self.TransformPen(target_pen, transform)
            for path_data in extract_path_data(element.get("markup") or ""):
                try:
                    self.parse_path(path_data, pen)
                except Exception as exc:
                    print(f"경고: {glyph.get('name')} path를 건너뜀: {exc}", file=sys.stderr)

    def apply_hangul_metadata(self, font):
        os2 = font.get("OS/2")
        if os2 is None:
            return
        # OS/2 Unicode range bits: 28 Hangul Jamo, 56 Compatibility Jamo, 59 Hangul Syllables.
        os2.ulUnicodeRange1 = getattr(os2, "ulUnicodeRange1", 0) | (1 << 28)
        os2.ulUnicodeRange2 = getattr(os2, "ulUnicodeRange2", 0) | (1 << (56 - 32)) | (1 << (59 - 32))
        # Code page bits: 19 Korean Wansung, 21 Korean Johab.
        os2.ulCodePageRange1 = getattr(os2, "ulCodePageRange1", 0) | (1 << 19) | (1 << 21)
        os2.ulCodePageRange2 = getattr(os2, "ulCodePageRange2", 0)

    def apply_localized_names(self, font):
        name_table = font.get("name")
        if name_table is None or self.family == self.internal_family:
            return

        localized_full_name = f"{self.family} {self.style}"
        localized_unique = f"{self.family}-{self.style}; {self.ps_name}"
        localized_names = {
            1: self.family,
            2: self.style,
            3: localized_unique,
            4: localized_full_name,
            16: self.family,
            17: self.style,
        }
        for name_id, value in localized_names.items():
            for platform_id, enc_id in ((3, 1), (3, 10)):
                name_table.setName(value, name_id, platform_id, enc_id, 0x0412)


def extract_path_data(markup: str):
    if not markup.strip():
        return []
    wrapped = f'<svg xmlns="http://www.w3.org/2000/svg">{markup}</svg>'
    try:
        root = ET.fromstring(wrapped)
    except ET.ParseError:
        return re.findall(r'\sd="([^"]+)"', markup)
    paths = []
    for node in root.iter():
        if strip_ns(node.tag) == "path":
            d = node.attrib.get("d")
            if d:
                paths.append(d)
    return paths


def element_transform(element, baseline):
    tx = float(element.get("tx") or 0)
    ty = float(element.get("ty") or 0)
    sx = float(element.get("scaleX") or element.get("scale") or 1)
    sy = float(element.get("scaleY") or element.get("scale") or 1)
    angle = math.radians(float(element.get("rotate") or 0))
    cos_a = math.cos(angle)
    sin_a = math.sin(angle)
    return (
        sx * cos_a,
        -sx * sin_a,
        -sy * sin_a,
        -sy * cos_a,
        tx,
        baseline - ty,
    )


def clean_name(value):
    return re.sub(r"\s+", " ", str(value)).strip() or "Untitled"


def make_postscript_name(family, style):
    raw = f"{family}-{style}"
    family_ascii = compact_ascii_name(family)
    style_ascii = ascii_style_name(style)
    if family_ascii:
        ascii_name = f"{family_ascii}-{style_ascii}"
    else:
        digest = hashlib.sha1(raw.encode("utf-8")).hexdigest()[:8]
        ascii_name = f"Kolyph-{digest}-{style_ascii}"
    return ascii_name[:63]


def make_internal_family_name(family):
    family_ascii = spaced_ascii_name(family)
    if family_ascii:
        return family_ascii[:31]
    digest = hashlib.sha1(clean_name(family).encode("utf-8")).hexdigest()[:8]
    return f"Kolyph {digest}"


def ascii_style_name(style):
    return compact_ascii_name(style) or "Regular"


def compact_ascii_name(value):
    return re.sub(r"[^A-Za-z0-9]+", "", clean_name(value))


def spaced_ascii_name(value):
    return re.sub(r"[^A-Za-z0-9 ._-]+", "", clean_name(value)).strip()


def safe_filename(value):
    return re.sub(r'[\\/:*?"<>|]+', "-", clean_name(value)).strip(" .")


def make_glyph_name(name, char, used):
    base = re.sub(r"[^A-Za-z0-9_.-]", "_", name).strip("_") or f"uni{ord(char[0]):04X}"
    if base[0].isdigit():
        base = "g_" + base
    candidate = base
    suffix = 2
    while candidate in used:
        candidate = f"{base}_{suffix}"
        suffix += 1
    return candidate


def strip_ns(tag):
    return tag.rsplit("}", 1)[-1] if "}" in tag else tag


def copy_font(font):
    import copy

    return copy.deepcopy(font)


if __name__ == "__main__":
    raise SystemExit(main())
