# Chuỗi cung ứng XK — Dashboard (project tách theo module)

## Cấu trúc thư mục

```
dashboard-project/
├── build.py                  ← chạy file này để gộp lại thành 1 trang HTML
├── build_artifact.py         ← chạy sau build.py, tạo bản để đăng lên link chia sẻ Claude Artifact
├── dist/
│   ├── chuoi-cung-ung-dashboard.html            ← file hoàn chỉnh để mở/gửi cho người khác
│   └── chuoi-cung-ung-dashboard-artifact.html   ← bản dùng riêng để đăng lên link Artifact (đừng gửi file này)
└── src/
    ├── shell.html             ← khung trang, ghép các phần lại (ít khi cần sửa)
    ├── styles.css              ← toàn bộ style/màu sắc dùng chung
    ├── app.js                  ← xử lý chuyển tab
    ├── head-links.html         ← link font, icon (ít khi cần sửa)
    └── partials/
        ├── brand.html                     ← logo + tên ở đầu sidebar
        ├── nav.html                       ← danh sách menu bên trái
        ├── sidebar-foot.html              ← dòng chữ nhỏ cuối sidebar
        ├── topbar.html                    ← thanh tiêu đề trên cùng
        ├── tab-01-tong-quan.html          ← module Tổng quan
        ├── tab-02-vung-nguyen-lieu.html   ← module Vùng nguyên liệu
        ├── tab-03-nha-cung-cap.html       ← module Nhà cung cấp
        ├── tab-04-xuong-san-xuat.html     ← module Xưởng sản xuất
        ├── tab-05-danh-gia-chat-luong.html← module Đánh giá chất lượng
        ├── tab-06-logistics.html          ← module Logistics
        ├── tab-07-chung-tu.html           ← module Chứng từ
        └── tab-08-feedback-kh.html        ← module Feedback KH
```

## Cách chỉnh sửa 1 module

Ví dụ muốn sửa module **Xưởng sản xuất**:

1. Mở file `src/partials/tab-04-xuong-san-xuat.html`
2. Sửa nội dung (thêm/bớt dòng bảng, đổi số liệu, đổi chữ...) — chỉ cần biết HTML cơ bản
3. Lưu file lại
4. Mở terminal, chạy:
   ```
   python3 build.py
   ```
5. File hoàn chỉnh mới sẽ nằm ở `dist/chuoi-cung-ung-dashboard.html` — mở bằng trình duyệt để xem, hoặc gửi cho người khác
6. Nếu muốn cập nhật link chia sẻ (Claude Artifact) đang dùng, chạy thêm:
   ```
   python3 build_artifact.py
   ```
   rồi nhờ Claude đăng lại file `dist/chuoi-cung-ung-dashboard-artifact.html` lên cùng link cũ (link không đổi).

**Chỉ cần cài Python 3 (có sẵn trên hầu hết máy Mac/Linux, Windows cần cài thêm) — không cần cài thêm thư viện gì khác.**

## Khi nào cần sửa các file dùng chung

- **Đổi màu sắc, font chữ, khoảng cách** → sửa `src/styles.css`
- **Thêm/bớt mục trong menu bên trái** → sửa `src/partials/nav.html`
- **Đổi cách chuyển tab, thêm hiệu ứng** → sửa `src/app.js`
- **Đổi tên hiển thị trên thanh tiêu đề khi bấm từng tab** → sửa object `titles` trong `src/app.js`

## Lưu ý

- File `dist/chuoi-cung-ung-dashboard.html` là **file để dùng/gửi đi** — không sửa trực tiếp file này, vì lần build tiếp theo sẽ ghi đè mất.
- Luôn sửa trong `src/` rồi chạy `python3 build.py` để tạo lại bản dùng được.
- Dữ liệu trong các module hiện tại vẫn là **dữ liệu mẫu minh họa** — chưa nối với dữ liệu thật.
