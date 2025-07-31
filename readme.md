# Image Marker Plugin

## Mô tả
Plugin WordPress cho phép upload ảnh trong admin và gắn marker vào vị trí bất kỳ trên ảnh đó. Cách thức xử lý: Click vào vị trí trên ảnh sẽ tạo ra 1 marker với toạ độ tương ứng, các marker được phép kéo đến vị trí khác.

## Tính năng cần xử lý

### Admin (Backend)
- [ ] Upload hình ảnh qua WordPress Media Library
- [ ] Click trực tiếp vào hình ảnh để tạo marker
- [ ] Form nhập thông tin marker (tiêu đề, mô tả, link)
- [ ] Quản lý tất cả markers (xem, sửa, xóa)
- [ ] Export/Import markers
- [ ] Thống kê sử dụng

### Frontend (Public)
- [ ] Hiển thị hình ảnh với markers
- [ ] Click vào marker để xem thông tin
- [ ] Responsive design
- [ ] Shortcode để embed vào bài viết/trang

### Kỹ thuật
- [ ] Custom Post Type cho markers
- [ ] AJAX cho tương tác real-time
- [ ] Nonce verification cho bảo mật
- [ ] Internationalization (i18n)
- [ ] Hook system cho developers

## Cấu trúc thư mục
```
image-marker-plugin/
├── image-marker-plugin.php (main plugin file)
├── admin/
│   ├── admin-page.php
│   └── index.php
├── assets/
│   ├── css/
│   │   ├── admin.css
│   │   └── frontend.css
│   └── js/
│       ├── admin.js
│       └── frontend.js
├── includes/
│   └── class-image-marker.php
├── languages/
│   └── image-marker.pot
└── README.md
```

## Bước tiếp theo
1. Tạo file chính của plugin
2. Đăng ký Custom Post Type
3. Tạo admin interface
4. Implement AJAX handlers
5. Tạo frontend display
6. Testing và optimization

## Yêu cầu
- WordPress 5.0+
- PHP 7.4+
- JavaScript enabled

## License
GPL v2 or later 

## Features:
[+] Add custom CSS
[] Marker image
    [] Allow choose from suggest icon, apply change color for svg image
[] Allow select animation for marker
[] Allow select template show info when hover
[] Add option allow select range on image
[] Thêm api get note từ vnforge
[] Request premium feature
[] Report error