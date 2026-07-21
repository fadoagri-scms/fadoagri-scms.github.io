#!/usr/bin/env python3
"""
Build script (bước 2) — chuyển dist/chuoi-cung-ung-dashboard.html thành bản
"artifact-ready" để đăng lên link chia sẻ Claude Artifact.

Vì trang chia sẻ đó chặn tải font/icon từ CDN ngoài (Google Fonts, Tabler
Icons), script này thay các icon font <i class="ti ti-..."> bằng SVG nhúng
sẵn (không cần tải gì từ ngoài) và bỏ phần <html>/<head>/<body> bọc ngoài.

Cách dùng (sau khi đã chạy build.py):
    python3 build_artifact.py

Kết quả: dist/chuoi-cung-ung-dashboard-artifact.html
File này KHÔNG dùng để mở trực tiếp/gửi email — chỉ dùng để đăng lên link
Artifact. File để gửi/mở bình thường vẫn là chuoi-cung-ung-dashboard.html.
"""
import os
import re
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(BASE, "dist")
SRC_FILE = os.path.join(DIST, "chuoi-cung-ung-dashboard.html")
OUT_FILE = os.path.join(DIST, "chuoi-cung-ung-dashboard-artifact.html")

# CSS: đổi các selector bám theo thẻ `i` (icon font) sang class `.icon` (svg),
# bỏ các thuộc tính width cố định gây méo hình khi áp cho svg (phần tử "replaced").
CSS_RENAMES = [
    (".nav-item i{font-size:16px;width:18px;text-align:center;color:#8FA089;}",
     ".nav-item .icon{font-size:16px;text-align:center;color:#8FA089;}"),
    (".nav-icon i{width:auto;font-size:14px;color:#fff;}",
     ".nav-icon .icon{font-size:14px;color:#fff;}"),
    (".nav-item.active .nav-icon i{color:var(--forest-deep);}",
     ".nav-item.active .nav-icon .icon{color:var(--forest-deep);}"),
    (".nav-item.active i{color:var(--forest-deep);}",
     ".nav-item.active .icon{color:var(--forest-deep);}"),
    (".module-card .top-row i{font-size:19px;color:var(--ink-mute);}",
     ".module-card .top-row .icon{font-size:19px;color:var(--ink-mute);}"),
    (".stars i{font-size:13px;color:#DCD9CC;}",
     ".stars .icon{font-size:13px;color:#DCD9CC;}"),
    (".stars i.filled{color:var(--amber);}",
     ".stars .icon.filled{color:var(--amber);}"),
    (".checklist-icons i{font-size:16px;margin-right:10px;}",
     ".checklist-icons .icon{font-size:16px;margin-right:10px;}"),
]

ICON_BASE_CSS = (
    "\n  .icon{display:inline-block;width:1em;height:1em;vertical-align:-.15em;"
    "flex-shrink:0;fill:none;stroke:currentColor;stroke-width:2;"
    "stroke-linecap:round;stroke-linejoin:round;}\n"
    "  .icon.icon-filled{fill:currentColor;stroke:none;}\n"
)

# markup: mỗi icon font <i class="ti ti-..."> -> <svg class="icon ..."><use href="#icon-..."/></svg>
ICON_SWAPS = [
    ('<i class="ti ti-leaf"></i>', '<svg class="icon"><use href="#icon-leaf"/></svg>'),
    ('<i class="ti ti-layout-dashboard"></i>', '<svg class="icon"><use href="#icon-dashboard"/></svg>'),
    ('<i class="ti ti-coconut"></i>', '<svg class="icon"><use href="#icon-coconut"/></svg>'),
    ('<i class="ti ti-truck-delivery"></i>', '<svg class="icon"><use href="#icon-truck"/></svg>'),
    ('<i class="ti ti-building-factory-2"></i>', '<svg class="icon"><use href="#icon-factory"/></svg>'),
    ('<i class="ti ti-clipboard-check"></i>', '<svg class="icon"><use href="#icon-clipboard"/></svg>'),
    ('<i class="ti ti-route"></i>', '<svg class="icon"><use href="#icon-route"/></svg>'),
    ('<i class="ti ti-file-text"></i>', '<svg class="icon"><use href="#icon-file"/></svg>'),
    ('<i class="ti ti-message-star"></i>', '<svg class="icon"><use href="#icon-message-star"/></svg>'),
    ('<i class="ti ti-calendar" style="margin-right:6px;"></i>',
     '<svg class="icon" style="margin-right:6px;"><use href="#icon-calendar"/></svg>'),
    ('<i class="ti ti-check icon-ok"></i>', '<svg class="icon icon-ok"><use href="#icon-check"/></svg>'),
    ('<i class="ti ti-alert-triangle icon-warn"></i>', '<svg class="icon icon-warn"><use href="#icon-alert"/></svg>'),
    ('<i class="ti ti-x icon-warn"></i>', '<svg class="icon icon-warn"><use href="#icon-x"/></svg>'),
    ('<i class="ti ti-star-filled filled"></i>', '<svg class="icon icon-filled filled"><use href="#icon-star"/></svg>'),
    ('<i class="ti ti-star-filled"></i>', '<svg class="icon icon-filled"><use href="#icon-star"/></svg>'),
]

SPRITE = """<svg style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">
<defs>
<symbol id="icon-leaf" viewBox="0 0 24 24"><path d="M20 4c-9 0-16 6-16 15 0 .5 0 1 .1 1.4C13 20 20 13 20 4Z"/><path d="M5 20c3-6 8-11 13-13"/></symbol>
<symbol id="icon-dashboard" viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/></symbol>
<symbol id="icon-coconut" viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 5v3"/><path d="M9 8l3-3 3 3"/></symbol>
<symbol id="icon-truck" viewBox="0 0 24 24"><rect x="2" y="7" width="12" height="9" rx="1"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></symbol>
<symbol id="icon-factory" viewBox="0 0 24 24"><path d="M3 20V10l5 3V10l5 3V8l6 4v8H3Z"/><path d="M7 20v-4M12 20v-4M17 20v-4"/></symbol>
<symbol id="icon-clipboard" viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M9 12l2 2 4-4"/></symbol>
<symbol id="icon-route" viewBox="0 0 24 24"><circle cx="6" cy="6" r="2.2"/><circle cx="18" cy="18" r="2.2"/><path d="M6 8c0 6 4 4 6 6s2 4 6 4"/></symbol>
<symbol id="icon-file" viewBox="0 0 24 24"><path d="M7 2h7l4 4v16H7Z"/><path d="M14 2v4h4"/><path d="M9.5 13h5M9.5 16.5h5"/></symbol>
<symbol id="icon-message-star" viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4Z"/><path d="M12 7.5l1 2 2.2.3-1.6 1.6.4 2.2-2-1-2 1 .4-2.2-1.6-1.6 2.2-.3Z"/></symbol>
<symbol id="icon-calendar" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></symbol>
<symbol id="icon-check" viewBox="0 0 24 24"><path d="M4 12l5 5 11-11"/></symbol>
<symbol id="icon-alert" viewBox="0 0 24 24"><path d="M12 3.5l9.5 16.5H2.5Z"/><path d="M12 9.5v5"/><path d="M12 16.7v.1"/></symbol>
<symbol id="icon-x" viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19"/></symbol>
<symbol id="icon-star" viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.7-4.9 4.5 1.3 6.5L12 16.9l-5.9 3.3 1.3-6.5-4.9-4.5 6.6-.7Z"/></symbol>
</defs>
</svg>
"""


def main():
    if not os.path.exists(SRC_FILE):
        sys.exit(f"Không thấy {SRC_FILE} — chạy `python build.py` trước đã.")

    with open(SRC_FILE, "r", encoding="utf-8") as f:
        html = f.read()

    title = re.search(r"<title>(.*?)</title>", html, re.S).group(1)
    style = re.search(r"<style>(.*?)</style>", html, re.S).group(1)
    body = re.search(r"<body>(.*?)</body>", html, re.S).group(1)

    for old, new in CSS_RENAMES:
        if old not in style:
            print(f"CẢNH BÁO: không tìm thấy CSS rule để đổi: {old}", file=sys.stderr)
        style = style.replace(old, new)
    style = style.replace(
        "*{box-sizing:border-box;margin:0;padding:0;}",
        "*{box-sizing:border-box;margin:0;padding:0;}" + ICON_BASE_CSS,
    )

    for old, new in ICON_SWAPS:
        if old not in body:
            print(f"CẢNH BÁO: không tìm thấy icon để đổi: {old}", file=sys.stderr)
        body = body.replace(old, new)

    remaining = re.findall(r'<i class="ti[^"]*"[^>]*></i>', body)
    if remaining:
        print(f"CẢNH BÁO: còn icon chưa được thay: {remaining}", file=sys.stderr)

    out = f"<title>{title}</title>\n<style>{style}</style>\n{SPRITE}{body}"

    os.makedirs(DIST, exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        f.write(out)

    print(f"Đã tạo bản artifact-ready: {OUT_FILE}")


if __name__ == "__main__":
    main()
