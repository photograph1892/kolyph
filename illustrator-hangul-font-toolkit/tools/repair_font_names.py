#!/usr/bin/env python3
"""Repair font name records after converting SVG Font with external tools.

SVG Font does not contain the full OpenType name table. Some converters create
invalid legacy Macintosh names or non-ASCII PostScript names from Korean family
names, which can make Adobe apps hide or mislabel the installed font.
"""

from __future__ import annotations

import argparse
import hashlib
import math
import re
import struct
from pathlib import Path


NAME_IDS = {
    1: "family",
    2: "subfamily",
    3: "unique",
    4: "full",
    5: "version",
    6: "postscript",
    16: "typographic family",
    17: "typographic subfamily",
}


def main() -> int:
    parser = argparse.ArgumentParser(description="Repair TTF/OTF name records for Adobe/Windows.")
    parser.add_argument("source", help="TTF/OTF file produced by an external converter")
    parser.add_argument("-o", "--output", help="Output font path. Defaults to *_fixed before the extension.")
    parser.add_argument("--family", required=True, help="Display family name, e.g. 바람결따라체")
    parser.add_argument("--style", default="Regular", help="Style name. Default: Regular")
    args = parser.parse_args()

    source = Path(args.source)
    output = Path(args.output) if args.output else source.with_name(f"{source.stem}_fixed{source.suffix}")
    repair_font_names(source, output, args.family, args.style)
    print(output)
    return 0


def repair_font_names(source: Path, output: Path, family: str, style: str):
    data = bytearray(source.read_bytes())
    tables = read_table_directory(data)
    if "name" not in tables or "head" not in tables:
        raise SystemExit("This does not look like a valid TTF/OTF with name/head tables.")

    digest = hashlib.sha1(f"{family}-{style}".encode("utf-8")).hexdigest()[:8]
    ps_name = make_postscript_name(family, style, digest)
    ascii_family = make_ascii_family(family, digest)
    version = "Version 1.001"
    unique = f"{family}-{style}; {ps_name}; repaired-{digest}"

    new_name = build_name_table(family, style, ascii_family, ps_name, version, unique)
    table_order = [(tag, data[offset:offset + length]) for tag, offset, length in tables]
    table_order = [(tag, new_name if tag == "name" else chunk) for tag, chunk in table_order]

    rebuilt = rebuild_font(data, table_order)
    output.write_bytes(rebuilt)


def read_table_directory(data: bytes):
    if len(data) < 12:
        raise SystemExit("Font file is too small.")
    num_tables = struct.unpack(">H", data[4:6])[0]
    tables = []
    for index in range(num_tables):
        offset = 12 + index * 16
        tag = data[offset:offset + 4].decode("latin1")
        _, table_offset, length = struct.unpack(">III", data[offset + 4:offset + 16])
        tables.append((tag, table_offset, length))
    return tables


def build_name_table(family, style, ascii_family, ps_name, version, unique):
    records = []

    def add(platform, encoding, language, name_id, value):
        records.append((platform, encoding, language, name_id, encode_name(platform, value)))

    windows_names = {
        1: family,
        2: style,
        3: unique,
        4: f"{family} {style}",
        5: version,
        6: ps_name,
        16: family,
        17: style,
    }
    for language in (0x0412, 0x0409):
        for name_id, value in windows_names.items():
            add(3, 1, language, name_id, value)
            add(3, 10, language, name_id, value)

    mac_names = {
        1: ascii_family,
        2: style,
        3: f"{ascii_family}-{style}; {ps_name}",
        4: f"{ascii_family} {style}",
        5: version,
        6: ps_name,
        16: ascii_family,
        17: style,
    }
    for name_id, value in mac_names.items():
        add(1, 0, 0, name_id, value)

    records.sort(key=lambda item: (item[0], item[1], item[2], item[3]))
    string_offset = 6 + 12 * len(records)
    record_bytes = bytearray()
    strings = bytearray()
    for platform, encoding, language, name_id, value in records:
        offset = len(strings)
        strings.extend(value)
        record_bytes.extend(struct.pack(">HHHHHH", platform, encoding, language, name_id, len(value), offset))
    return struct.pack(">HHH", 0, len(records), string_offset) + record_bytes + strings


def rebuild_font(original: bytes, tables):
    sfnt_version = original[:4]
    num_tables = len(tables)
    max_power = 2 ** int(math.log2(num_tables))
    search_range = max_power * 16
    entry_selector = int(math.log2(max_power))
    range_shift = num_tables * 16 - search_range

    header = bytearray(sfnt_version + struct.pack(">HHHH", num_tables, search_range, entry_selector, range_shift))
    directory = bytearray()
    chunks = []
    offset = 12 + 16 * num_tables
    head_offset = None

    for tag, chunk in tables:
        if tag == "head":
            chunk = chunk[:8] + b"\0\0\0\0" + chunk[12:]
        padded_length = len(chunk) + ((4 - len(chunk) % 4) % 4)
        directory.extend(tag.encode("latin1") + struct.pack(">III", checksum(chunk), offset, len(chunk)))
        if tag == "head":
            head_offset = offset
        chunks.append(chunk + b"\0" * (padded_length - len(chunk)))
        offset += padded_length

    font = bytearray(header + directory)
    for chunk in chunks:
        font.extend(chunk)
    if head_offset is None:
        raise SystemExit("Missing head table.")
    font[head_offset + 8:head_offset + 12] = struct.pack(">I", (0xB1B0AFBA - checksum(font)) & 0xFFFFFFFF)
    return font


def checksum(data: bytes):
    padded = data + b"\0" * ((4 - len(data) % 4) % 4)
    total = 0
    for offset in range(0, len(padded), 4):
        total = (total + struct.unpack(">I", padded[offset:offset + 4])[0]) & 0xFFFFFFFF
    return total


def encode_name(platform, value):
    return value.encode("mac_roman", "replace") if platform == 1 else value.encode("utf-16-be")


def make_postscript_name(family, style, digest):
    family_ascii = re.sub(r"[^A-Za-z0-9]+", "", family)
    style_ascii = re.sub(r"[^A-Za-z0-9]+", "", style) or "Regular"
    return (f"{family_ascii}-{style_ascii}" if family_ascii else f"Kolyph-{digest}-{style_ascii}")[:63]


def make_ascii_family(family, digest):
    family_ascii = re.sub(r"[^A-Za-z0-9 ._-]+", "", family).strip()
    return family_ascii[:31] if family_ascii else f"Kolyph {digest}"


if __name__ == "__main__":
    raise SystemExit(main())
