# Chatbot Căn-tin 🍱

 Nhóm Sinh viên
- Mai Quốc Tuấn - MSSV : 2591324
- Ngô Quang Huy - MSSV : 2591305
- Nguyễn Phúc Minh  - MSSV : 2591313


Chatbot web thuần (chạy ngay trên trình duyệt) giúp **xem thực đơn, hỏi giá và đặt món** cho căn-tin.
- Hỗ trợ **gõ không dấu** (vd: `com ga`, `pho bo`).
- **Menu picker** hiện đại: lọc theo danh mục (chips), ô tìm kiếm, danh sách có sticky header, **phím tắt** (↑/↓, Enter, Esc).
- **Luồng đặt món (FSM)** rõ ràng: chọn món → size → số lượng → topping → độ cay → ghi chú → ăn tại chỗ/mang đi → thời gian → thanh toán → xác nhận.
- **Rule hỏi giá món** (giữ nguyên yêu cầu): “`<món> giá bao nhiêu/bn/mấy tiền`” trả lời tức thì.
- **Khớp mờ tên món**: gõ “cá kho” vẫn nhận “cơm cá kho”.

---

## Cách chạy (siêu nhanh)

> Cấu trúc repo hiện tại: **`index.html`** và **`app.js`** nằm chung 1 thư mục.

1. Mở file **`index.html`** trực tiếp bằng trình duyệt (double-click).
2. Xong. Không cần cài đặt thêm hay chạy server.

> 📌 Giao diện dùng Tailwind qua CDN. Cần internet để tải CSS từ CDN. 
---

## Cách dùng

- **Xem thực đơn & bảng giá**: gõ `thực đơn` / `menu` / `bảng giá`.
- **Bắt đầu đặt hàng**: gõ `đặt` (hoặc gõ trực tiếp tên món khi đang IDLE, vd: `cơm cá kho`).
- **Hỏi giá nhanh**: “`<món> giá bao nhiêu/bn/mấy tiền`” (vd: `phở bò giá bn`).
- **Picker**:
  - Lọc danh mục bằng **chips**.
  - Tìm nhanh (không dấu) trong ô search.
  - Dùng **phím tắt**: ↑/↓ để di chuyển, **Enter** để chọn, **Esc** để hủy.
- **Sau khi xác nhận đơn**: chọn *Đặt thêm* / *Hỏi thông tin* / *Kết thúc phiên*.

---

## Có gì trong repo?

- **`index.html`**  
  Khung giao diện chat (khối `#chat`, input, nút gửi, các pill trạng thái) và nhúng `app.js`.  
  Có thể chạy độc lập trên trình duyệt.

- **`app.js`**  
  Toàn bộ logic chatbot:
  - **Dữ liệu**:
    - `CATALOG`: danh mục & món (tên + giá).
    - `MENU`: sinh tự động từ `CATALOG`.
    - `SIZE_UP`, `ADDON_COST`, `PACK_FEE`, `ADDON_LIST`: cấu hình size & phụ phí.
  - **Không dấu & khớp mờ**:
    - `toAscii()` chuẩn hóa (bỏ dấu, thường hóa).
    - `NAME_INDEX` + `isMenuItem()` khớp mờ (token-based).
  - **Giao diện chat & menu**:
    - `msg()`, `msgRich()` in bong bóng.
    - `msgChoices()`, `msgChoicesMulti()` hiển thị lựa chọn.
    - `createMenuTableHTML()` dựng bảng giá.
    - `msgMenuPicker()` picker đẹp (chips + search + list + keyboard).
  - **Luồng đặt món (FSM)**:
    - `State`: định nghĩa các trạng thái.
    - `handleOrdering()` xử lý từng bước trong flow.
    - `handlePostDone()` xử lý sau khi chốt đơn.
  - **Router**:
    - `route(text)` điều phối theo mức ưu tiên: hỏi giá món → xem menu → mở flow → xử lý FSM → FAQ → gợi ý.
  - **FAQ/Info nhanh**:
    - `infoRules` + `matchInfo()` trả lời nhanh (giờ mở cửa, khuyến mãi, thanh toán…).
  - **Greeting có gợi ý câu hỏi**:
    - `showGreeting()` hiển thị các câu hỏi phổ biến để bấm nhanh.

---

## Tuỳ biến nhanh

- **Thêm/Sửa món**: chỉnh `CATALOG` trong `app.js` (không cần đụng tới `MENU`).
- **Sửa phí & size**: cập nhật `SIZE_UP`, `ADDON_COST`, `PACK_FEE`.
- **Sửa FAQ**: cập nhật mảng `infoRules`.
- **Chỉnh giao diện**: thay Tailwind CDN bằng CSS khác, hoặc đổi class/HTML trong `msgRich()`.

---

## Gợi ý kiểm thử

- `thực đơn` → xem bảng + picker, thử tìm `pho`, lọc danh mục “Bún/Phở”.
- `đặt` → đi hết flow: size → số lượng → topping → cay → ghi chú → mang đi → thời gian → thanh toán → xác nhận.
- `cơm gà giá bao nhiêu` / `pho bo gia bn`.
- Gõ **không dấu**: `com ga`, `ca kho`, `bun bo`.

---

## Khắc phục nhanh

- **Giao diện không đúng**: kiểm tra internet để tải Tailwind CDN; hoặc thay bằng CSS local.
- **Enter không chọn trong picker**: đảm bảo focus đang ở ô tìm kiếm/list; click 1 dòng trong list rồi bấm Enter.

---
