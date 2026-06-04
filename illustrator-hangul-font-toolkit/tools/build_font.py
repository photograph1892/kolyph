#!/usr/bin/env python3
"""Build font files from a hangul-glyphs-lab font package JSON.

This script expects JSON exported from `hangul-glyphs-lab.html` with
the "폰트 빌드 JSON" button. It uses fontTools for actual font generation.
"""

from __future__ import annotations

import argparse
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


def main() -> int:
    parser = argparse.ArgumentParser(description="Build TTF/OTF/WOFF/WOFF2 from Hangul Glyphs Lab JSON.")
    parser.add_argument("package_json", help="폰트 빌드 JSON 파일")
    parser.add_argument("-o", "--out-dir", default="dist-font", help="출력 폴더")
    parser.add_argument(
        "-f",
        "--formats",
        nargs="+",
        choices=sorted(SUPPORTED_FORMATS),
        help="출력 형식. 생략하면 JSON 안의 formats 값을 사용합니다.",
    )
    args = parser.parse_args()

    package_path = Path(args.package_json)
    package = json.loads(package_path.read_text(encoding="utf-8"))
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
        self.ps_name = re.sub(r"[^A-Za-z0-9-]", "", f"{self.family}-{self.style}") or "HangulGlyphsLab-Regular"
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
            path = out_dir / f"{self.ps_name}{suffix}"
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
        fb.setupCFF(self.ps_name, {"FullName": f"{self.family} {self.style}", "FamilyName": self.family}, charstrings, {})
        path = out_dir / f"{self.ps_name}.otf"
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
        return fb.font

    def name_table(self):
        return {
            "familyName": self.family,
            "styleName": self.style,
            "uniqueFontIdentifier": self.ps_name,
            "fullName": f"{self.family} {self.style}",
            "psName": self.ps_name,
            "version": "Version 0.001",
        }

    def draw_glyph(self, glyph, target_pen):
        for element in glyph.get("elements") or []:
            transform = element_transform(element, self.baseline)
            pen = self.TransformPen(target_pen, transform)
            for path_data in extract_path_data(element.get("markup") or ""):
                try:
                    self.parse_path(path_data, pen)
                except Exception as exc:
                    print(f"경고: {glyph.get('name')} path를 건너뜀: {exc}", file=sys.stderr)


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
