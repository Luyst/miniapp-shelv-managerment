# 📦 Shelf Manager (Mini App)

Ứng dụng nhỏ chuyên dụng để quản lý kệ hàng và quét mã serial nhập hàng vào kệ. Tách biệt hoàn toàn với ứng dụng chính nhưng sử dụng chung cấu trúc dữ liệu để dễ dàng đồng bộ sau này.

## ✨ Tính năng chính
- **Quản lý Kệ**: Tạo mới mã kệ (KE-01, KE-02, ...) và tên kệ.
- **Scanner Chuyên Dụng**:
  - Tìm kiếm hàng theo `inventory_code` hoặc tên.
  - Chế độ quét liên tục (Scan and Go): Tự động tính số lượng và lưu danh sách serial.
  - Cập nhật trực tiếp lên Supabase.
- **Giao diện Premium**: Sử dụng Dark Mode, Glassmorphism, và Micro-animations.

## 🚀 Hướng dẫn bắt đầu

1. **Cài đặt biến môi trường**:
   Mở file `.env.local` và điền thông tin Supabase của bạn:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

2. **Thiết lập Database**:
   Copy nội dung file `supabase_setup.sql` và chạy trong **SQL Editor** của Supabase Dashboard.

3. **Chạy ứng dụng**:
   ```bash
   cd mini-shelf-management
   npm install
   npm run dev
   ```

## 🛠 Tech Stack
- **Framework**: Next.js 15+ (App Router)
- **Database**: Supabase
- **Styling**: Vanilla CSS (Premium Design System)
- **Icons**: Lucide React
