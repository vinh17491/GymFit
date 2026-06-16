# KẾT NỐI SQL SERVER — LOCALHOST (WINDOWS AUTH)

## Cấu hình

File `.env` đã set sẵn:

```env
DB_HOST=localhost
DB_PORT=1433
DB_NAME=GymFit
```

Không cần user/password — dùng Windows Auth (tài khoản Windows của bạn).

> Nếu SQL Server chạy trên máy khác, sửa `DB_HOST` thành tên máy (VD: `DESKTOP-0PI1Q6Q`) hoặc IP.

## Chạy

```powershell
cd ecommerce-goshop-main\backend
npx tsc              # Build
node dist/index.js   # Start server
```

Server: `http://localhost:3000`

## Yêu cầu

- SQL Server đang chạy (service `MSSQLSERVER`)
- TCP/IP port 1433 đã bật (SQL Server Configuration Manager)
- Database `GymFit` đã được tạo (chạy file `database/GymFit.sql`)
- Quyền Windows của bạn được cấp quyền truy cập SQL Server (mặc định admin Windows có sẵn)