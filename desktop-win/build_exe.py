#!/usr/bin/env python3
"""
Builds a standalone, zero-dependency Windows x64 Desktop executable (blue.ai.exe)
embedding the compiled Vite dist/ bundle, native Win32 disk storage, and custom PE icon.
"""
import math
import os
import struct
import subprocess
import sys
import zlib
from pathlib import Path

MIME_MAP = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.txt': 'text/plain; charset=utf-8',
}


def make_monochrome_png(size: int) -> bytes:
    """Renders a crisp anti-aliased pure black & white geometric blue.ai icon as PNG."""
    cx = (size - 1) / 2.0
    cy = (size - 1) / 2.0
    half = size / 2.0
    corner_r = size * 0.22

    r_outer_1 = size * 0.30
    r_outer_2 = size * 0.34
    r_core = size * 0.145
    r_pupil = size * 0.055

    raw_rows = bytearray()
    for y in range(size):
        raw_rows.append(0)
        for x in range(size):
            dx = abs(x - cx) - (half - corner_r - 0.5)
            dy = abs(y - cy) - (half - corner_r - 0.5)
            outside_x = max(dx, 0.0)
            outside_y = max(dy, 0.0)
            sdf_box = math.hypot(outside_x, outside_y) + min(max(dx, dy), 0.0) - corner_r

            alpha = max(0.0, min(1.0, 0.5 - sdf_box))
            if alpha <= 0.0:
                raw_rows.extend((0, 0, 0, 0))
                continue

            dist = math.hypot(x - cx, y - cy)
            ring_band = 1.0 - max(
                max(0.0, (r_outer_1 - dist) * 1.3),
                max(0.0, (dist - r_outer_2) * 1.3),
            )
            ring_band = max(0.0, min(1.0, ring_band))

            angle = math.atan2(y - cy, x - cx)
            dash = 1.0 if math.cos(angle * 8.0) > -0.25 else 0.15
            ring_val = ring_band * dash

            core_val = max(0.0, min(1.0, 0.5 + (r_core - dist) * 1.35))
            pupil_cut = max(0.0, min(1.0, 0.5 + (r_pupil - dist) * 1.5))

            white = max(ring_val, core_val * (1.0 - pupil_cut))
            c = int(round(max(0.0, min(1.0, white)) * 255))
            a = int(round(alpha * 255))
            raw_rows.extend((c, c, c, a))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack('>I', len(data))
            + tag
            + data
            + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw_rows), 9)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', idat) + chunk(b'IEND', b'')


def build_win32_icon_res(res_path: Path) -> None:
    """Writes a standard Win32 .res binary containing multi-DPI RT_ICON + RT_GROUP_ICON."""
    sizes = [256, 64, 48, 32, 16]
    png_blobs = [make_monochrome_png(s) for s in sizes]

    def make_res_entry(res_type: int, res_id: int, data: bytes) -> bytes:
        hdr = (
            struct.pack('<II', len(data), 32)
            + struct.pack('<HH', 0xFFFF, res_type)
            + struct.pack('<HH', 0xFFFF, res_id)
            + struct.pack('<I', 0)          # DataVersion
            + struct.pack('<H', 0x1030)     # MemoryFlags
            + struct.pack('<H', 0x0409)     # LanguageId (en-US)
            + struct.pack('<I', 0)          # Version
            + struct.pack('<I', 0)          # Characteristics
        )
        pad = (4 - (len(data) % 4)) % 4
        return hdr + data + (b'\x00' * pad)

    out = bytearray()
    # Mandatory 32-byte empty lead record in Win32 .res format
    out.extend(
        struct.pack('<IIHHHH', 0, 32, 0xFFFF, 0, 0xFFFF, 0)
        + b'\x00' * 16
    )

    # RT_ICON = 3 (IDs 1..N)
    grp_dir = bytearray(struct.pack('<HHH', 0, 1, len(sizes)))
    for idx, (s, blob) in enumerate(zip(sizes, png_blobs), start=1):
        out.extend(make_res_entry(3, idx, blob))
        w = 0 if s == 256 else s
        h = 0 if s == 256 else s
        # GRPICONDIRENTRY (14 bytes)
        grp_dir.extend(struct.pack('<BBBBHHIH', w, h, 0, 0, 1, 32, len(blob), idx))

    # RT_GROUP_ICON = 14 (ID 1)
    out.extend(make_res_entry(14, 1, bytes(grp_dir)))
    res_path.write_bytes(bytes(out))


def generate_assets_header(dist_dir: Path, header_path: Path) -> None:
    files = []
    for root, _dirs, filenames in os.walk(dist_dir):
        for fname in sorted(filenames):
            if fname.lower().endswith('.exe'):
                continue
            full = Path(root) / fname
            rel = '/' + full.relative_to(dist_dir).as_posix()
            ext = full.suffix.lower()
            mime = MIME_MAP.get(ext, 'application/octet-stream')
            data = full.read_bytes()
            files.append((rel, mime, data))

    lines = [
        '#pragma once',
        '#include <cstddef>',
        '',
        'struct EmbeddedAsset {',
        '  const char* path;',
        '  const char* mime;',
        '  const unsigned char* data;',
        '  size_t size;',
        '};',
        '',
    ]

    for idx, (_rel, _mime, data) in enumerate(files):
        hex_bytes = ','.join(f'0x{b:02x}' for b in data)
        lines.append(f'static const unsigned char ASSET_DATA_{idx}[] = {{{hex_bytes}}};')

    lines.append('')
    lines.append('static const EmbeddedAsset EMBEDDED_ASSETS[] = {')
    for idx, (rel, mime, data) in enumerate(files):
        lines.append(f'  {{"{rel}", "{mime}", ASSET_DATA_{idx}, {len(data)}u}},')
    lines.append('};')
    lines.append(f'static const size_t EMBEDDED_ASSETS_COUNT = {len(files)}u;')
    lines.append('')

    header_path.write_text('\n'.join(lines), encoding='utf-8')


def main() -> int:
    if len(sys.argv) < 4:
        print('Usage: build_exe.py <zig_bin> <dist_dir> <out_exe>')
        return 1

    zig_bin = Path(sys.argv[1]).resolve()
    dist_dir = Path(sys.argv[2]).resolve()
    out_exe = Path(sys.argv[3]).resolve()
    repo_dir = Path(__file__).resolve().parent

    work_dir = Path('/tmp/blue-ai-winbuild')
    work_dir.mkdir(parents=True, exist_ok=True)

    res_path = work_dir / 'app.res'
    build_win32_icon_res(res_path)

    header_path = work_dir / 'assets_data.h'
    generate_assets_header(dist_dir, header_path)

    env = os.environ.copy()
    env['ZIG_GLOBAL_CACHE_DIR'] = '/tmp/zig-cache'

    out_exe.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        str(zig_bin),
        'c++',
        '-target',
        'x86_64-windows-gnu',
        '-std=c++17',
        '-Os',
        '-s',
        f'-I{work_dir}',
        str(repo_dir / 'main.cpp'),
        str(res_path),
        '-Wl,--subsystem,windows',
        '-lws2_32',
        '-lshell32',
        '-lole32',
        '-ladvapi32',
        '-luser32',
        '-o',
        str(out_exe),
    ]

    print('Compiling Windows x64 executable...')
    subprocess.run(cmd, env=env, check=True)
    print(f'Built {out_exe} ({out_exe.stat().st_size / 1024:.1f} KB)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
