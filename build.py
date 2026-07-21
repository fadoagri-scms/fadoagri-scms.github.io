#!/usr/bin/env python3
"""
Build script — gộp các file module riêng lẻ trong src/ thành 1 file HTML
hoàn chỉnh để chia sẻ/xem, nằm ở dist/chuoi-cung-ung-dashboard.html

Cách dùng:
    python3 build.py

Khi cần sửa 1 module (ví dụ Xưởng sản xuất), chỉ cần sửa đúng file:
    src/partials/tab-04-xuong-san-xuat.html
rồi chạy lại lệnh trên để tạo bản HTML mới.
"""
import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, "src")
PARTIALS = os.path.join(SRC, "partials")
DIST = os.path.join(BASE, "dist")


def read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read().strip()


def main():
    shell = read(os.path.join(SRC, "shell.html"))

    replacements = {
        "{{HEAD_LINKS}}": read(os.path.join(SRC, "head-links.html")),
        "{{STYLES}}": read(os.path.join(SRC, "styles.css")),
        "{{LOGIN}}": read(os.path.join(PARTIALS, "login.html")),
        "{{BRAND}}": read(os.path.join(PARTIALS, "brand.html")),
        "{{NAV}}": read(os.path.join(PARTIALS, "nav.html")),
        "{{SIDEBAR_FOOT}}": read(os.path.join(PARTIALS, "sidebar-foot.html")),
        "{{TOPBAR}}": read(os.path.join(PARTIALS, "topbar.html")),
        "{{TAB_OVERVIEW}}": read(os.path.join(PARTIALS, "tab-01-tong-quan.html")),
        "{{TAB_RAW}}": read(os.path.join(PARTIALS, "tab-02-vung-nguyen-lieu.html")),
        "{{TAB_NCC}}": read(os.path.join(PARTIALS, "tab-03-nha-cung-cap.html")),
        "{{TAB_FACTORY}}": read(os.path.join(PARTIALS, "tab-04-xuong-san-xuat.html")),
        "{{TAB_QC}}": read(os.path.join(PARTIALS, "tab-05-danh-gia-chat-luong.html")),
        "{{TAB_LOGISTICS}}": read(os.path.join(PARTIALS, "tab-06-logistics.html")),
        "{{TAB_DOCS}}": read(os.path.join(PARTIALS, "tab-07-chung-tu.html")),
        "{{TAB_FEEDBACK}}": read(os.path.join(PARTIALS, "tab-08-feedback-kh.html")),
        "{{TAB_USERS}}": read(os.path.join(PARTIALS, "tab-09-quan-ly-tai-khoan.html")),
        "{{APP_JS}}": read(os.path.join(SRC, "app.js")),
    }

    output = shell
    for key, value in replacements.items():
        output = output.replace(key, value)

    os.makedirs(DIST, exist_ok=True)
    out_path = os.path.join(DIST, "chuoi-cung-ung-dashboard.html")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(output)

    # index.html chuyển hướng — để khi deploy lên hosting (Netlify...),
    # mở đúng link gốc (vd: https://xxx.netlify.app/) là vào thẳng dashboard
    # thay vì phải nhớ thêm tên file chuoi-cung-ung-dashboard.html
    index_path = os.path.join(DIST, "index.html")
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(
            '<!DOCTYPE html>\n'
            '<html lang="vi"><head><meta charset="UTF-8">\n'
            '<meta http-equiv="refresh" content="0; url=chuoi-cung-ung-dashboard.html">\n'
            '</head><body>\n'
            '<a href="chuoi-cung-ung-dashboard.html">Mở dashboard</a>\n'
            '</body></html>\n'
        )

    print(f"Đã build xong: {out_path}")
    print(f"Đã tạo trang chuyển hướng: {index_path}")


if __name__ == "__main__":
    main()
