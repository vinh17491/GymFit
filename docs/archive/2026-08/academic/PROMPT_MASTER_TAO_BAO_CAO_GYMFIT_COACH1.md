# MASTER PROMPT — TẠO BÁO CÁO WORD GYMFIT DỰA 100% TRÊN TEMPLATE NÔNG SẢN XANH

## 0. THÔNG TIN ĐẦU VÀO CỐ ĐỊNH

- File mẫu cấu trúc bắt buộc: `mẫu nông sản xanh.docx`
- Repository nghiệp vụ: `https://github.com/vinh17491/GymFit`
- Branch bắt buộc: `coach1`
- Tên đề tài: `GYMFIT`
- Môn học: `THƯƠNG MẠI ĐIỆN TỬ`
- Nhóm: `15`
- Nhóm trưởng: `Quách Gia Vinh — 23DH114075`
- Thành viên: `Diệp Tư Nguyên — 23DH112324`
- Giáo viên hướng dẫn: `Th.S Đỗ Đức Bích Ngân`
- Địa điểm: `TP.HCM`
- Tháng/năm mặc định: `tháng 08 năm 2026`
- Tên file đầu ra chính: `GYMFIT_BAO_CAO_TMDT_NHOM15.docx`

---

# STATE

Bạn là **Senior Software System Analyst, Technical Document Engineer và Word/OOXML Specialist**.

Nhiệm vụ của bạn không phải chỉ phân tích hoặc viết nội dung nháp. Bạn phải tạo ra **một file Word hoàn chỉnh cho dự án GYMFIT**, dùng trực tiếp file `mẫu nông sản xanh.docx` làm template gốc.

## Mục tiêu bắt buộc

1. Nội dung phải được viết lại hoàn toàn theo dự án GYMFIT trên branch `coach1`.
2. Cấu trúc trình bày phải bám sát file Nông Sản Xanh ở mức tối đa:
   - Khổ giấy.
   - Lề.
   - Section break.
   - Page break.
   - Header/footer.
   - Số trang.
   - Font.
   - Cỡ chữ.
   - Line spacing.
   - Paragraph spacing.
   - Heading.
   - Tab stop.
   - Indent.
   - Bảng.
   - Viền bảng.
   - Màu bảng.
   - Chiều rộng cột.
   - Vị trí hình.
   - Tỷ lệ hình.
   - Caption.
   - Cách ngắt bảng và ngắt trang.
3. Không tạo file Word trắng rồi tự dựng lại bằng cảm tính.
4. Phải nhân bản file mẫu, sau đó chỉnh trực tiếp trên bản sao.
5. File Nông Sản Xanh chỉ là **nguồn sự thật về cấu trúc và hình thức**.
6. Branch `coach1` chỉ là **nguồn sự thật về nghiệp vụ, code, database, chức năng, trạng thái triển khai và công nghệ**.
7. Không sao chép nội dung nghiệp vụ Nông Sản Xanh sang GYMFIT.
8. Không bịa chức năng, bảng dữ liệu, API, actor, công nghệ hoặc kết quả kiểm thử.
9. Không dừng ở báo cáo phân tích. Phải xuất file DOCX cuối cùng và các tài nguyên sơ đồ kèm theo.
10. Không được sửa, commit, push hoặc tạo file vào repository GYMFIT. Repository chỉ được đọc.

## Định nghĩa “giống 100%”

“Giống 100%” được hiểu là:

- Giữ nguyên template, style, cấu trúc trang và ngôn ngữ thiết kế.
- Giữ nguyên cách tổ chức chương, mục, bảng, hình và mật độ trình bày.
- Nội dung được thay thế tương ứng theo GYMFIT.
- Không yêu cầu số dòng từng đoạn giống tuyệt đối vì nội dung khác nhau.
- Không ép số trang bằng cách giảm font hoặc làm nội dung khó đọc.
- Microsoft Word mở file gốc là chuẩn hình ảnh cuối cùng.
- Nếu LibreOffice và Microsoft Word cho số trang khác nhau, không được phá layout để ép theo LibreOffice.

---

# TAILOR

## 1. THỨ TỰ NGUỒN SỰ THẬT

Khi có mâu thuẫn, áp dụng thứ tự ưu tiên sau:

### Cấp 1 — Source code và database thật trên branch `coach1`

Bắt buộc kiểm tra:

- `backend/src/app.ts`
- `backend/src/modules/**`
- `backend/src/middleware/**`
- `backend/src/scripts/**`
- `backend/package.json`
- `frontend/src/App.tsx`
- `frontend/src/pages/**`
- `frontend/src/components/**`
- `frontend/src/services/**`
- `frontend/src/api/**`
- `frontend/src/auth/**`
- `frontend/package.json`
- `db/migrations/**`
- Schema, migration, constraint, index, foreign key và status enum thật.
- Test/acceptance/integrity scripts đang tồn tại.

### Cấp 2 — Tài liệu active hiện hành

Đọc theo thứ tự:

1. `README.md`
2. `PROJECT_STATUS.md`
3. `ROADMAP.md`
4. `docs/README.md`
5. `docs/ARCHITECTURE.md`
6. `docs/API_AND_AUTHORIZATION.md`
7. `docs/DATABASE_AND_MIGRATIONS.md`
8. `docs/KNOWN_LIMITATIONS.md`
9. `docs/coach/COACH_MODULE_HANDOVER.md`
10. `docs/marketplace/MARKETPLACE_MVP_FINAL_HANDOVER.md`

### Cấp 3 — File mẫu Word

Dùng để lấy:

- Bố cục.
- Cỡ chữ.
- Khoảng cách.
- Cấu trúc chương.
- Cấu trúc bảng Use Case.
- Cách chia trang.
- Cách trình bày UML/ERD.
- Màu sắc bảng kỹ thuật.

### Nguồn không được dùng làm nguồn hiện hành

Không sử dụng làm nguồn sự thật:

- `docs/archive/**`
- `logs/**`
- Prompt cũ.
- Package tạm.
- File generated cũ.
- Nội dung trong `skill/**` hoặc `skills/**`.
- Tài liệu có nhãn historical, archived hoặc do-not-use-as-current-source-of-truth.

Nếu tài liệu và code mâu thuẫn, code/migration/route đang hoạt động thắng.

---

## 2. KHÓA SNAPSHOT TRƯỚC KHI VIẾT

Trước khi tạo nội dung:

1. Checkout đúng branch `coach1`.
2. Ghi lại:
   - Repository.
   - Branch.
   - Commit SHA hiện tại.
   - Ngày giờ kiểm tra.
3. Không tự chuyển sang `main`, `coach`, `seller_role_add` hoặc branch khác.
4. Không trộn code giữa các branch.
5. Mọi nhận định trong báo cáo phải gắn với snapshot đã khóa.
6. Nếu branch thay đổi trong lúc làm, tiếp tục dùng commit đã khóa, không tự cập nhật giữa chừng.

Tạo file nội bộ:

`GYMFIT_SOURCE_SNAPSHOT.md`

Nội dung gồm:

- Commit SHA.
- Danh sách tài liệu active đã đọc.
- Actor thực tế.
- Module thực tế.
- API route family.
- Bảng dữ liệu chính.
- Chức năng đã hoàn thành.
- Chức năng còn hạn chế.
- Chức năng chưa triển khai.
- Các mâu thuẫn tài liệu/code nếu có.

---

## 3. SỰ THẬT HỆ THỐNG GYMFIT CẦN KIỂM CHỨNG

Không được chép nguyên danh sách này vào báo cáo khi chưa kiểm tra code. Dùng nó làm checklist khám phá.

### Công nghệ dự kiến cần xác minh

Frontend:

- React 18.
- TypeScript.
- Vite.
- React Router.
- Zustand.
- Axios.
- TanStack React Query.
- Tailwind CSS.
- Recharts.
- PWA nếu thực sự được cấu hình.

Backend:

- Node.js.
- Express.
- TypeScript.
- SQL Server qua `mssql`.
- JWT.
- AuthSessions.
- Zod hoặc express-validator.
- Nodemailer.
- Multer/Sharp cho upload.
- Helmet, CORS, rate limiting, compression.
- Cron cho các quy trình thời gian nếu code thật có sử dụng.

Database:

- SQL Server.
- Ordered/checksummed migrations.
- Transaction.
- Lock/concurrency control.
- Foreign key.
- Unique constraint.
- Index.
- History/audit tables.

Không ghi Redis, CSRF, PWA, cron hoặc bất kỳ dependency nào là “đang sử dụng” chỉ vì có trong `package.json`. Phải xác minh code thực sự mount hoặc gọi nó.

### Nhóm actor cần xác minh

Ưu tiên kiểm tra actor:

- Guest/Public.
- MEMBER.
- COACH.
- SELLER.
- ADMIN.
- External payment/mail service chỉ là actor phụ nếu có tương tác thật.

Không tự tạo Shipper, Warehouse, Store Manager hoặc Cashier nếu role đó không tồn tại trong source GYMFIT.

Không dùng kế thừa actor MEMBER → SELLER nếu hệ thống thực tế chuyển role và không mô hình hóa quan hệ kế thừa.

### Nhóm nghiệp vụ cần kiểm kê

1. Authentication, session, profile và security.
2. Public catalog, product, shop và search/filter.
3. Persistent cart.
4. Checkout, Parent Order, ShopOrder và OrderItem.
5. Inventory reservation và release.
6. Payment notification, payment state và refund.
7. Seller application.
8. Seller shop.
9. Seller product, variant, image và inventory.
10. Product/shop moderation.
11. Seller fulfillment và hub logistics.
12. Commission, finance và settlement.
13. Complaint, fault, replacement.
14. Product/shop review.
15. Public Coach discovery.
16. Coach Appointment.
17. Coach self-profile và booking toggle.
18. Coach Program, Program Day và Program Exercise.
19. Coach–Member assignment và Workout Schedule.
20. Member Workout Session, snapshot, Set Log và Progress.
21. Admin Coach Management.
22. Admin Exercise Library.
23. Admin Workout Governance.
24. Các module Plans, Membership, Videos, CRM, Loyalty, Coupon, Referral, Ticket, Invoice, Analytics, Revenue, Audit, Backup hoặc Media chỉ đưa vào khi code thật chứng minh đang được mount và có giá trị với báo cáo.

---

## 4. PHÂN LOẠI TRẠNG THÁI CHỨC NĂNG

Mọi module phải được phân loại rõ:

- `ĐÃ TRIỂN KHAI VÀ ĐÃ XÁC MINH`
- `ĐÃ TRIỂN KHAI NHƯNG CÒN NGOẠI LỆ KIỂM CHỨNG`
- `ĐANG HOÀN THIỆN`
- `BỊ CHẶN BỞI THIẾT KẾ/HẠ TẦNG`
- `CHƯA TRIỂN KHAI`
- `HƯỚNG PHÁT TRIỂN`

Không biến known limitation thành completed feature.

Các trạng thái phải kiểm tra kỹ:

- Coach module.
- Marketplace/Seller module.
- CoachProfiles migration.
- Migration `0100`.
- Admin Program Builder.
- Live SMTP.
- Authenticated browser acceptance.
- Clean install toàn dự án.
- Automated payout/refund.
- Carrier integration.
- Seller wallet/escrow.
- AI moderation/chat/live coaching.

Chỉ ghi kết luận sau khi đối chiếu source, migration và acceptance evidence tại commit đã khóa.

---

## 5. QUY TẮC XỬ LÝ FILE WORD

### 5.1 Bắt buộc sao chép template

1. Sao chép:
   - Từ: `mẫu nông sản xanh.docx`
   - Sang: `GYMFIT_BAO_CAO_TMDT_NHOM15.docx`
2. Không sửa file gốc.
3. Tạo checksum trước và sau.
4. Không xóa section break.
5. Không đổi toàn bộ style bằng một lệnh normalize.
6. Không dùng Enter liên tục để ép sang trang.
7. Không dùng textbox cho nội dung chương.
8. Không thay đổi theme Word nếu không cần.
9. Giữ nguyên logo HUFLIT.
10. Không thêm màu nền hoặc trang trí mới.

### 5.2 Khổ giấy và lề

- A4 dọc.
- Lề trái gần 2,5 cm.
- Lề phải, trên, dưới gần 2,0 cm.
- Header/footer gần 1,27 cm.
- Giữ section-specific margin của file gốc.
- Không “chuẩn hóa” các giá trị OOXML bất thường nếu điều đó làm trôi trang.

### 5.3 Font và đoạn văn

- Font chính: Times New Roman.
- Nội dung thân bài: khoảng 12 pt.
- Bảng Use Case: khoảng 9–10 pt.
- Heading theo đúng paragraph tương ứng của mẫu.
- Body căn đều hai lề.
- Line spacing gần 1,15–1,20.
- Giữ khoảng cách trước/sau đoạn theo mẫu.
- Không dùng Calibri/Arial cho phần thân.
- Code có thể dùng monospace nếu không làm phá bố cục; nếu mẫu không dùng monospace rõ ràng thì giữ phong cách mẫu.

### 5.4 Bảng

- Giữ table layout fixed.
- Giữ độ rộng cột.
- Giữ cell margin.
- Giữ border.
- Giữ row split behavior.
- Bảng Use Case:
  - Hai cột `Thuộc tính | Nội dung`.
  - Viền đen mảnh.
  - Nền trắng.
  - Cột trái hẹp.
  - Cột phải rộng.
- Bảng danh sách Use Case:
  - Ba cột `Mã UC | Tên Use Case | Actor chính`.
- Bảng kỹ thuật Chương 5:
  - Header xanh đậm tương đương mẫu.
  - Chữ trắng, đậm.
  - Nội dung 9–10 pt.
- Không dùng Word AutoFit làm thay đổi chiều rộng cột sau khi thay text.

### 5.5 Hình

- Thay hình tại đúng image slot.
- Giữ width/height gần ảnh gốc.
- Không kéo méo.
- Không crop mất viền.
- PNG nền trắng.
- Độ phân giải đủ cao.
- Không chụp màn hình giao diện StarUML.
- Không dùng ảnh AI thay cho sơ đồ kỹ thuật.
- Không dùng Mermaid screenshot nếu mục tiêu là mô phỏng đúng phong cách StarUML.

---

## 6. CẤU TRÚC NỘI DUNG TỪNG TRANG

File mẫu có thể hiển thị khoảng 76–79 trang tùy engine. Không ép theo số trang của LibreOffice. Giữ cấu trúc và luồng trang của Microsoft Word.

### Trang 1 — Bìa

Giữ nguyên bố cục:

- Bộ Giáo dục và Đào tạo.
- Trường.
- Khoa.
- Logo HUFLIT.
- `ĐỒ ÁN MÔN THƯƠNG MẠI ĐIỆN TỬ`.
- `ĐỀ TÀI: GYMFIT`.
- GVHD.
- Nhóm 15.
- Hai thành viên.
- TP.HCM, tháng 08 năm 2026.

Không thêm slogan, ảnh gym hoặc nền màu.

### Trang 2 — GIỚI THIỆU

Viết lại hoàn toàn theo GYMFIT, gồm:

1. Bối cảnh số hóa lĩnh vực gym/fitness và thương mại điện tử.
2. Vấn đề khi quản lý hội viên, huấn luyện viên, lịch tập, tiến độ và sản phẩm gym rời rạc.
3. Nhu cầu tích hợp gym management, coaching và marketplace.
4. Mục tiêu của GYMFIT.
5. Ý nghĩa học thuật, kỹ thuật và thực tiễn.

Giữ số đoạn và mật độ gần mẫu.

### Trang 3 — LỜI CẢM ƠN

- Thay đúng tên đề tài.
- Thay đúng tên GVHD.
- Không sao chép nguyên văn nếu câu chữ gắn riêng với Nông Sản Xanh.
- Giữ bố cục và độ dài gần mẫu.

### Trang 4 — PHỤ LỤC VIẾT TẮT

Điền bảng/list viết tắt nếu có thể mà không phá bố cục:

- API.
- JWT.
- RBAC.
- DTO.
- SQL.
- ERD.
- UML.
- CRUD.
- PWA.
- MVP.
- FE.
- BE.
- UC.

Nếu mẫu không có bảng, giữ đúng kiểu trình bày của mẫu.

### Trang 5 — DANH MỤC HÌNH

Tạo danh mục hình tự động hoặc danh sách đúng format mẫu.

### Trang 6 — DANH MỤC BẢNG

Tạo danh mục bảng tự động hoặc danh sách đúng format mẫu.

### Trang 7–8 — MỤC LỤC

Giữ 2 trang nếu có thể.

Cấu trúc chương bắt buộc:

1. MÔ TẢ BÀI TOÁN VÀ XÁC ĐỊNH MỤC TIÊU
2. XÂY DỰNG KIẾN TRÚC HỆ THỐNG
3. MÔ HÌNH HÓA YÊU CẦU
4. THIẾT KẾ DỮ LIỆU
5. TRIỂN KHAI THỰC HIỆN – KẾT QUẢ ĐẠT ĐƯỢC
6. KẾT LUẬN – HƯỚNG PHÁT TRIỂN
7. ĐÁNH GIÁ NHÓM
8. TÀI LIỆU THAM KHẢO

Trong Chương 3 phải có:

- Use Case Diagram.
- Bảng tả Use Case.
- Activity Diagram.
- Sequence Diagram.
- Statechart Diagram.
- Class Diagram.
- Deployment Diagram.

Không để mục lục có heading không tồn tại trong thân báo cáo.

### Trang 9 — Chương 1, mục 1.1

Mô tả bài toán GYMFIT:

- Quản lý gym truyền thống bị phân mảnh.
- Member khó theo dõi lịch, Coach, workout, progress.
- Coach khó quản lý chương trình, lịch và member scope.
- Admin khó quản lý Coach, Exercise, Marketplace và governance.
- Seller cần shop, catalog, order, finance.
- Commerce cần cart, multi-shop order, payment, refund, fulfillment.
- Bảo mật, ownership, IDOR và concurrency là vấn đề cốt lõi.
- Dữ liệu cần nhất quán giữa user, coach, workout và marketplace.

Không mô tả GYMFIT như một website bán hàng đơn giản.

### Trang 10 — Mục 1.2 và mở Chương 2

Mục tiêu:

- Một nền tảng tích hợp quản lý gym, Coach, Member Workout và Marketplace.
- Client–server.
- Role-based access.
- Transactional data.
- Audit/history.
- Responsive frontend.
- Khả năng mở rộng.

Cuối trang mở Chương 2 theo đúng mẫu.

### Trang 11–15 — Chương 2

Viết theo đúng thứ tự mẫu:

- 2.1 Kiến trúc hệ thống TMĐT.
- 2.2 Cơ sở hạ tầng thương mại điện tử.
- 2.2.1 Khái niệm.
- 2.2.2 Thành phần.
- 2.2.3 Vai trò.
- 2.2.4 Đặc điểm TMĐT trong lĩnh vực gym/fitness.
- 2.2.5 Yêu cầu.
- 2.2.6 Liên hệ GYMFIT.
- 2.3 Kiến trúc và cơ sở hạ tầng phần mềm.

Kiến trúc phải phản ánh đúng flow thật:

`React/Vite UI -> Axios/API client -> Express route -> validation/auth/RBAC -> controller/service -> SQL Server`

Chỉ ghi event-driven, Redis, microservice hoặc Docker khi source thật chứng minh.

### Trang 16 — Use Case tổng quát

Vẽ một Use Case tổng quát cho toàn GYMFIT.

Actor:

- Guest.
- Member.
- Coach.
- Seller.
- Admin.
- External service chỉ khi cần.

System boundary: `GYMFIT`.

Không để sơ đồ quá dày. Có thể nhóm package:

- Identity.
- Gym/Coach.
- Workout.
- Marketplace.
- Administration.

Bắt đầu bảng danh sách Use Case ở nửa dưới như mẫu.

### Trang 17–33 — 18 Use Case chi tiết

Dùng đúng 18 Use Case để giữ mật độ trang tương đương mẫu.

#### Danh sách UC chuẩn

| Mã | Tên Use Case | Actor chính |
|---|---|---|
| UC01 | Đăng ký, đăng nhập và quản lý phiên | Guest/Member/Coach/Seller/Admin |
| UC02 | Tìm kiếm và lọc sản phẩm, cửa hàng | Guest/Member |
| UC03 | Xem chi tiết sản phẩm và cửa hàng | Guest/Member |
| UC04 | Quản lý giỏ hàng | Member |
| UC05 | Checkout và tạo đơn đa cửa hàng | Member |
| UC06 | Thanh toán, theo dõi và hủy đơn | Member |
| UC07 | Đăng ký trở thành Seller | Member |
| UC08 | Quản lý hồ sơ Shop | Seller |
| UC09 | Quản lý sản phẩm, biến thể, hình ảnh và tồn kho | Seller |
| UC10 | Xử lý đơn hàng và fulfillment | Seller |
| UC11 | Theo dõi doanh thu, hoa hồng và settlement | Seller |
| UC12 | Tìm kiếm và xem hồ sơ Coach | Guest/Member |
| UC13 | Đặt và quản lý lịch hẹn Coach | Member |
| UC14 | Quản lý lịch hẹn và hồ sơ Coach | Coach |
| UC15 | Xây dựng chương trình tập | Coach |
| UC16 | Gán Member và lập lịch tập | Coach |
| UC17 | Thực hiện buổi tập và theo dõi tiến độ | Member |
| UC18 | Quản trị Coach, Exercise và Marketplace | Admin |

Tên cuối cùng có thể điều chỉnh nếu source khác, nhưng phải giữ đúng 18 UC và không bịa.

#### Cấu trúc mỗi bảng UC

- Tên.
- Actor.
- Pre-condition.
- Post-condition.
- Trigger.
- Standard Flow.
- Alternative 1.
- Alternative 2.
- Alternative 3... khi cần.

#### Quy tắc đặc tả

- Step đặt tên B1, B2, B3...
- Mỗi flow phải khớp API và UI thật.
- Role check phải phản ánh backend.
- Ownership phải lấy từ JWT, không tin ID do client gửi nếu source làm như vậy.
- Business conflict dùng mô tả phù hợp như hết hàng, trùng lịch, trạng thái không hợp lệ, concurrent update.
- Không ghi VNPAY nếu branch không dùng VNPAY.
- Không ghi automated bank payout nếu MVP chỉ manual settlement.
- Không ghi booking tạo Coach–Member assignment nếu source tách riêng hai nghiệp vụ.

### Trang 33–40 — Activity Diagram

Tạo 14 Activity Diagram theo đúng slot hình của mẫu.

#### Activity tổng quát

- Toàn bộ journey Guest → Member → Coach/Seller/Admin.
- Không nhồi mọi chi tiết.
- Dùng swimlane rõ ràng.

#### 13 Activity chi tiết

1. Đăng nhập và kiểm tra live session.
2. Tìm kiếm/lọc sản phẩm.
3. Xem chi tiết sản phẩm/shop.
4. Quản lý persistent cart.
5. Checkout đa cửa hàng.
6. Thanh toán/theo dõi/hủy đơn.
7. Seller Application.
8. Seller quản lý Product/Variant/Image/Inventory.
9. Seller xử lý ShopOrder/Fulfillment.
10. Tìm Coach và đặt lịch.
11. Coach xử lý Appointment.
12. Coach tạo Program/Assignment/Schedule.
13. Member Start Session → Set Logs → Complete/Abandon → Progress.

Trang cuối Activity có thể dùng Admin Governance nếu slot thực tế cho phép; nếu không, tích hợp Admin vào Activity tổng quát.

#### Style StarUML

- Swimlane.
- Initial node.
- Final node.
- Action bo góc.
- Decision/merge.
- Guard condition `[điều kiện]`.
- Mũi tên một chiều.
- Nền trắng.
- Viền đen.
- Không dùng màu gradient.
- Export PNG độ phân giải cao.

### Trang 40–48 — Sequence, Statechart, Class, Deployment

Phải bảo đảm mục lục và thân bài nhất quán.

#### Sequence Diagram

Tạo các sequence chính, ưu tiên:

1. Login/refresh/live session validation.
2. Product search/detail.
3. Persistent cart update/merge.
4. Multi-shop checkout và inventory reservation.
5. Payment notification/order transition/refund.
6. Seller Application approval và role/session change.
7. Seller Product submit và Admin moderation.
8. Seller fulfillment và settlement eligibility.
9. Coach booking với overlap/concurrency guard.
10. Coach Program/Assignment/Schedule.
11. Member Workout Session snapshot/Set Logs/Complete.

Số lượng Sequence có thể giảm còn 7–8 để dành slot cho 3.5–3.7, nhưng không được bỏ luồng cốt lõi.

#### 3.5 Statechart Diagram

Tối thiểu 2 state machine trong cùng một hình hoặc hai hình:

1. Order/ShopOrder:
   - PENDING.
   - CONFIRMED.
   - PROCESSING.
   - SHIPPED.
   - DELIVERED.
   - CANCELLED khi được phép.
2. Coach Appointment hoặc Member Workout Session:
   - Appointment: pending/confirmed/cancelled/completed/no_show.
   - Workout Session: in-progress/completed/abandoned.

Tên trạng thái phải lấy đúng enum/status token trong source.

#### 3.6 Class Diagram

Vẽ class/domain diagram ở mức thiết kế, không biến thành ERD.

Nhóm class gợi ý:

- User/AuthSession.
- CoachProfile/CoachAppointment.
- WorkoutProgram/ProgramDay/ProgramExercise.
- Assignment/WorkoutSchedule.
- MemberWorkoutSession/SessionExercise/SetLog.
- Shop/Product/ProductVariant/Inventory.
- Cart/CartItem.
- Order/ShopOrder/OrderItem.
- Payment/Refund/Settlement.
- Complaint/Review.

Chỉ đưa method/service operation khi có giá trị; không bịa method.

#### 3.7 Deployment Diagram

Phản ánh deployment thực tế hoặc kiến trúc triển khai xác minh được:

- User browser/mobile web.
- React/Vite frontend.
- Express API.
- SQL Server.
- Upload/media storage.
- Mail service.
- Bank/QR integration nếu có.
- Reverse proxy/container chỉ khi source/setup chứng minh.

Không vẽ Kubernetes, microservices hoặc cloud services không tồn tại.

### Trang 49–53 — Logical Database Design

Chia ERD theo đúng mật độ hình của mẫu.

#### Trang 49

- Identity & Security.
- Coach Profile & Appointment.

#### Trang 50

- Workout Authoring:
  - Programs.
  - Days.
  - Exercises.
  - Assignments.
  - Schedules.
- Workout Execution:
  - Sessions.
  - Session Exercises.
  - Set Logs.
  - Progress.

#### Trang 51

- Seller Application & Shop.
- Catalog/Product/Variant/Image/Inventory.
- Cart/Order/ShopOrder/OrderItem.

#### Trang 52

- Một ERD Marketplace lớn:
  - Checkout.
  - Reservation.
  - Payment.
  - Fulfillment.
  - Histories.

#### Trang 53

- Refund/Voucher.
- Finance/Commission/Settlement.
- Complaint/Replacement/Review.

Nếu một bảng không tồn tại, không đưa vào.

### Trang 54 — Chi tiết bảng dữ liệu

Giữ 4 nhóm chính:

1. Users/AuthSessions.
2. CoachProfiles/CoachAppointments.
3. WorkoutPrograms/Assignments/Schedules/MemberWorkoutSessions.
4. Orders/ShopOrders/OrderItems/Payments.

Mỗi nhóm nêu:

- Mục đích.
- PK.
- FK.
- Field quan trọng.
- Constraint.
- Quan hệ.
- Lý do thiết kế.

Không đưa field không có thật.

### Trang 55 — Mục 4.3–4.5 và mở Chương 5

- 4.3 Bảng tham số.
- 4.4 Thuộc tính tối ưu tốc độ xử lý.
- 4.5 SQL theo biểu mẫu.
- 5.1 Triển khai thực hiện.
- Bảng công nghệ.

Nội dung tối ưu phải lấy từ index/constraint/query thật.

SQL chỉ trích đoạn ngắn, an toàn:

- Parameterized query.
- Transaction.
- Unique constraint/index.
- State transition.
- Ownership filter.

Không đưa connection string, password hoặc dữ liệu thật.

### Trang 56–58 — Kiến trúc, module và code

#### Bảng công nghệ

Chỉ liệt kê công nghệ đã xác minh.

#### Module nghiệp vụ

Tối thiểu:

- Auth/Security.
- Catalog/Marketplace.
- Cart/Order.
- Payment/Refund.
- Seller.
- Finance/Settlement.
- Complaint/Review.
- Coach/Appointment.
- Workout.
- Admin Governance.

#### Code minh họa

Chọn code thật, rút gọn:

1. Authentication middleware/live session.
2. Ownership/RBAC.
3. Checkout transaction và inventory reservation.
4. Coach booking overlap/concurrency.
5. Member Workout immutable snapshot.
6. Settlement/commission calculation.
7. Product upload validation hoặc moderation transition.

Mỗi đoạn code phải có:

- Đường dẫn file.
- Tên function/class.
- Giải thích 2–4 câu.
- Dấu `...` ở đoạn bỏ bớt.
- Không thay đổi logic thật.
- Không lộ secret.

### Trang 58–67 — ERD chi tiết Chương 5

Tạo 8 hình lớn:

- Hình 5.1: Identity & Security.
- Hình 5.2: Membership/Plans/CRM nếu thực tế có và đang dùng.
- Hình 5.3: Coach Profile & Appointment.
- Hình 5.4: Workout Program/Assignment/Schedule/Execution.
- Hình 5.5: Seller/Shop/Catalog/Inventory.
- Hình 5.6: Cart/Order/Payment/Fulfillment.
- Hình 5.7: Refund/Finance/Settlement/Complaint/Review.
- Hình 5.8: Audit/Analytics/Support/Media chỉ gồm bảng thật.

Giữ phong cách ERD xanh giống mẫu.

Không dùng StarUML cho ERD nếu làm mất phong cách. Có thể dùng dbdiagram.io hoặc công cụ tương đương.

### Trang 67–68 — Bảng chức năng theo vai trò và luồng nghiệp vụ

Bảng vai trò:

- Guest.
- Member.
- Coach.
- Seller.
- Admin.

Mô tả đúng scope từng role.

Luồng nghiệp vụ:

1. Đăng nhập và session.
2. Mua hàng đa Shop.
3. Seller onboarding.
4. Product moderation.
5. Fulfillment.
6. Payment/refund.
7. Settlement.
8. Coach booking.
9. Coach assignment/schedule.
10. Member workout.
11. Admin governance.

Security controls:

- JWT validation.
- Live session.
- Token version.
- Active user.
- Role check.
- Ownership scope.
- IDOR prevention.
- Validation.
- Parameterized SQL.
- Transaction/concurrency.
- Rate limit.
- Upload validation.
- Audit/history.
- Safe error serialization.

### Trang 69 — Kiểm thử

Tạo bảng:

- Nhóm kiểm thử.
- Tình huống.
- Kết quả mong đợi.
- Bằng chứng.
- Trạng thái.

Chỉ ghi PASS khi có acceptance/build/test evidence.

Nhóm kiểm thử:

- Build.
- TypeScript.
- Lint.
- Auth/RBAC.
- Ownership/IDOR.
- Cart/order/payment.
- Seller marketplace.
- Coach role.
- Coach booking.
- Member workout.
- Admin coach.
- Migration/integrity.
- Responsive/browser.
- Cleanup disposable database.

### Trang 70 — Kết quả đạt được

Tách:

- Kết quả nghiệp vụ.
- Kết quả kỹ thuật.
- Mức độ hoàn thiện theo module.

Không dùng “100% hoàn thành” cho toàn hệ thống nếu còn blocker hoặc verification exception.

### Trang 71 — Hạn chế

Bảng:

`Hạn chế | Ảnh hưởng | Hướng xử lý`

Phải kiểm tra các hạn chế thực tế:

- Migration clean-install conflict.
- Pending migration trên canonical database.
- Live SMTP chưa kiểm thử.
- Browser acceptance ngoại lệ của Marketplace.
- Automated payout/refund chưa có.
- Carrier API chưa có.
- Admin Program Builder bị chặn.
- Frontend lint script nếu chưa có.
- Large chunk warning.
- Các field Coach chưa tồn tại trong schema.

Không bịa limitation mới.

### Trang 72–74 — Kết luận và hướng phát triển

#### Kết luận

- Đánh giá đúng snapshot.
- Nêu GYMFIT là nền tảng tích hợp.
- Nêu các module cốt lõi đã đạt.
- Nêu trung thực phần còn giới hạn.

#### Roadmap

P0:

- Sửa blocker clean install/migration.
- Áp migration pending theo quy trình được duyệt.
- Hoàn tất browser smoke an toàn.

P1:

- Hoàn thiện monitoring, testing và deployment.
- Tối ưu bundle/query/index.
- Bổ sung automation cho payout/refund/carrier nếu thuộc định hướng.

P2:

- Các tính năng mở rộng như recommendation, AI moderation, live coaching hoặc chat chỉ ghi là hướng phát triển, không mô tả như đã có.

Mọi roadmap phải gắn với limitation thật.

### Trang 75 — ĐÁNH GIÁ NHÓM

Giữ bảng 4 cột:

- Họ tên.
- Công việc.
- Mức độ hoàn thành.
- % đóng góp.

Bắt buộc có:

- Quách Gia Vinh — 23DH114075.
- Diệp Tư Nguyên — 23DH112324.

Không tự bịa công việc và tỷ lệ đóng góp.

Ưu tiên:

1. Đối chiếu Git history nếu mapping tài khoản rõ ràng.
2. Đối chiếu tài liệu phân công nếu có.
3. Nếu không đủ bằng chứng, đánh dấu `[CẦN XÁC NHẬN PHÂN CÔNG]` trong bản nháp.
4. Trước khi giao bản cuối, yêu cầu người dùng cung cấp đúng công việc và phần trăm.
5. Tổng phần trăm phải bằng 100%.

### Trang 76 — TÀI LIỆU THAM KHẢO

Không để trống.

Tối thiểu:

- Source repository và commit snapshot.
- README/active docs của GYMFIT.
- React documentation.
- Express documentation.
- TypeScript documentation.
- Microsoft SQL Server documentation.
- UML/StarUML documentation.
- Tài liệu môn học nếu được cung cấp.

Không bịa tác giả, năm hoặc URL.

---

## 7. QUY CHUẨN UML BẰNG STARUML

### Bắt buộc

- Tạo project: `GYMFIT_UML_NHOM15.mdj`.
- Có package:
  - UseCase.
  - Activity.
  - Sequence.
  - Statechart.
  - Class.
  - Deployment.
- Mỗi diagram có tên rõ.
- Actor, entity và status nhất quán với Word.
- Export PNG vào:
  - `assets/uml/usecase/`
  - `assets/uml/activity/`
  - `assets/uml/sequence/`
  - `assets/uml/state/`
  - `assets/uml/class/`
  - `assets/uml/deployment/`

### Không được

- Vẽ sơ đồ bằng AI image generation.
- Dùng icon thay actor.
- Dùng flowchart tự do thay UML.
- Dùng ảnh mờ.
- Để nhãn tiếng Việt bị lỗi font.
- Dùng include/extend sai nghĩa.
- Gán quan hệ Actor sai với RBAC thật.
- Gộp Booking và Workout Schedule thành cùng một entity nếu source tách biệt.

---

## 8. QUY CHUẨN ERD

1. Đọc toàn bộ migration.
2. Không lấy database map từ README rồi đoán field.
3. Thể hiện:
   - PK.
   - FK.
   - Unique key.
   - Field trạng thái.
   - Field thời gian quan trọng.
4. Không cần đưa mọi field kỹ thuật nếu hình quá dày, nhưng không được làm sai quan hệ.
5. Chia theo bounded context.
6. Đảm bảo tên bảng đúng casing trong SQL Server.
7. Không đổi tên bảng sang tiếng Việt trong ERD.
8. Caption và giải thích bằng tiếng Việt.
9. Export PNG nền trắng, tối thiểu 1600 px chiều ngang cho hình ngang.
10. Hình dọc toàn trang phải đủ nét ở 100% zoom.

---

## 9. QUY TẮC VIẾT NỘI DUNG

- Văn phong học thuật, rõ ràng, không quảng cáo quá mức.
- Không dùng từ “siêu”, “hoàn hảo”, “100%” nếu không có bằng chứng.
- Không kể chuyện phát triển branch.
- Không đưa prompt, log nội bộ hoặc tên task Codex vào nội dung chính trừ khi dùng làm bằng chứng kiểm thử kỹ thuật.
- Không lặp lại cùng ý ở nhiều chương.
- Không ghi chức năng theo dự định vào mục kết quả đạt được.
- Không ghi Marketplace là ngoài phạm vi vì GYMFIT branch này có Marketplace/Seller.
- Không ghi GYMFIT chỉ có Member/Coach/Admin nếu code có SELLER.
- Không ghi hệ thống có Shipper/Warehouse nếu code không có role đó.
- Không ghi database PostgreSQL/Prisma/NestJS; GYMFIT dùng stack phải xác minh từ branch `coach1`.
- Không ghi mobile Expo/React Native nếu branch không có app mobile.
- Không ghi VNPAY nếu source không có.
- Không ghi automatic bank settlement nếu hiện tại payout thủ công.
- Không ghi AI/chatbot là đã triển khai nếu không có bằng chứng runtime.

---

# EVALUATE

## 1. SOURCE QA

Trước khi viết:

- [ ] Đúng repository.
- [ ] Đúng branch `coach1`.
- [ ] Có commit SHA.
- [ ] Đọc active docs.
- [ ] Đọc route files.
- [ ] Đọc migration.
- [ ] Đọc package files.
- [ ] Đọc frontend routes/pages.
- [ ] Đọc acceptance/integrity scripts.
- [ ] Có module inventory.
- [ ] Có actor matrix.
- [ ] Có status matrix.
- [ ] Có API map.
- [ ] Có database map.
- [ ] Có known limitations.
- [ ] Không sử dụng archive làm nguồn hiện hành.

## 2. CONTENT QA

- [ ] Không còn chữ “Nông Sản Xanh”.
- [ ] Không còn actor Seller/Store Manager/Warehouse/Shipper của mẫu nếu không khớp GYMFIT.
- [ ] Không còn PostgreSQL/NestJS/Prisma/Expo từ nội dung mẫu.
- [ ] Tên actor đồng nhất.
- [ ] Tên status đồng nhất.
- [ ] Tên table đồng nhất.
- [ ] Use Case khớp Activity.
- [ ] Activity khớp Sequence.
- [ ] Sequence khớp code/API.
- [ ] ERD khớp migration.
- [ ] Code snippet có file path thật.
- [ ] Kết quả kiểm thử có evidence.
- [ ] Limitation đúng source.
- [ ] Roadmap không được mô tả như completed.

## 3. WORD QA

Sau mỗi batch chỉnh sửa:

1. Render DOCX thành PDF/PNG.
2. Kiểm tra từng trang ở 100% zoom.
3. Sửa rồi render lại.

Phải đạt:

- [ ] Không tràn lề.
- [ ] Không cắt chữ.
- [ ] Không đè footer.
- [ ] Không mất số trang.
- [ ] Không đổi logo.
- [ ] Không có font thay thế trong file cuối.
- [ ] Không kéo méo ảnh.
- [ ] Không có ảnh mờ.
- [ ] Không có bảng vỡ cột.
- [ ] Header bảng đúng màu.
- [ ] TOC cập nhật đúng.
- [ ] Danh mục hình cập nhật đúng.
- [ ] Danh mục bảng cập nhật đúng.
- [ ] Caption đúng số.
- [ ] Heading có đúng cấp.
- [ ] Không có trang trắng ngoài mẫu.
- [ ] Không dùng font nhỏ để ép trang.
- [ ] Hai trang cuối dùng số trang thật, không để `Trang x`.

## 4. VISUAL COMPARISON QA

So sánh song song:

- Bìa với bìa.
- Trang giới thiệu với trang giới thiệu.
- Từng trang mục lục.
- Trang Use Case.
- Trang bảng Use Case.
- Trang Activity.
- Trang Sequence.
- Trang ERD.
- Trang bảng Chương 5.
- Trang hạn chế.
- Trang đánh giá nhóm.
- Trang tài liệu tham khảo.

Chênh lệch cho phép:

- Nội dung text.
- Tên sơ đồ.
- Số lượng dòng nhỏ do nội dung.

Chênh lệch không cho phép:

- Mất section.
- Sai lề.
- Sai font.
- Sai màu.
- Sai vị trí footer.
- Bảng tự co giãn.
- Ảnh lệch vị trí lớn.
- Heading đổi style.
- Sơ đồ có phong cách hoàn toàn khác mẫu.

## 5. SECURITY QA

- [ ] Không lộ `.env`.
- [ ] Không lộ password.
- [ ] Không lộ token.
- [ ] Không lộ connection string thật.
- [ ] Không lộ SMTP credential.
- [ ] Không lộ bank credential.
- [ ] Không chụp dữ liệu người dùng thật.
- [ ] Không chạy mutation acceptance trên `GYMFIT_DB`.
- [ ] Không sửa database canonical.
- [ ] Không push thay đổi lên GitHub.

---

# PLAN

## Bước 1 — Khóa template

- Copy file mẫu.
- Backup file gốc.
- Ghi checksum.
- Render baseline.
- Ghi số trang trong Microsoft Word và renderer.
- Không sửa style.

## Bước 2 — Khóa source snapshot

- Checkout `coach1`.
- Lấy commit SHA.
- Đọc tài liệu active.
- Không đổi branch.

## Bước 3 — Kiểm kê hệ thống

Tạo:

- `GYMFIT_MODULE_INVENTORY.md`
- `GYMFIT_ACTOR_MATRIX.md`
- `GYMFIT_API_MAP.md`
- `GYMFIT_DATABASE_MAP.md`
- `GYMFIT_STATUS_AND_LIMITATIONS.md`

## Bước 4 — Lập content map

Tạo bảng:

`Trang mẫu | Nội dung cũ | Nội dung GYMFIT thay thế | Số đoạn | Bảng/hình | Độ dài mục tiêu`

Không chỉnh Word trước khi content map hoàn tất.

## Bước 5 — Viết front matter

- Bìa.
- Giới thiệu.
- Lời cảm ơn.
- Viết tắt.
- Mục lục placeholder.

## Bước 6 — Viết Chương 1–2

- Viết theo source.
- Giữ mật độ chữ.
- Render kiểm tra.

## Bước 7 — Hoàn thiện 18 Use Case

- Xác minh endpoint/UI.
- Viết bảng danh sách.
- Viết 18 đặc tả.
- Kiểm tra consistency.

## Bước 8 — Tạo UML

- Use Case.
- Activity.
- Sequence.
- Statechart.
- Class.
- Deployment.
- Export PNG.
- Kiểm tra font và độ nét.

## Bước 9 — Thiết kế dữ liệu

- Đọc migration.
- Tạo ERD logical.
- Tạo 8 ERD chi tiết.
- Kiểm tra PK/FK/constraint.

## Bước 10 — Viết Chương 4

- Logical design.
- Chi tiết bảng.
- Tham số.
- Tối ưu.
- SQL mẫu.

## Bước 11 — Viết Chương 5

- Công nghệ.
- Kiến trúc.
- Module.
- Code thật.
- Vai trò.
- Security.
- Testing.
- Kết quả.
- Hạn chế.

## Bước 12 — Viết Chương 6

- Kết luận đúng snapshot.
- Roadmap theo priority.
- Không tô hồng blocker.

## Bước 13 — Đánh giá nhóm và tài liệu tham khảo

- Không tự bịa phân công.
- Tổng đóng góp 100%.
- Tài liệu tham khảo có thật.

## Bước 14 — Cập nhật field

- TOC.
- List of Figures.
- List of Tables.
- Caption.
- Page number.
- Cross-reference.

## Bước 15 — Render và sửa

- Render toàn bộ.
- Mở từng trang.
- Sửa layout.
- Render lại.
- Lặp đến khi sạch.

## Bước 16 — Final audit

- Search toàn file:
  - `Nông Sản Xanh`
  - `PostgreSQL`
  - `Prisma`
  - `NestJS`
  - `Expo`
  - `Warehouse`
  - `Shipper`
  - `Store manager`
  - `Trang x`
  - `[CẦN XÁC NHẬN]`
- Mọi kết quả không hợp lệ phải được sửa trước khi giao.

---

# OUTPUT CONTRACT

Phải xuất đầy đủ:

1. `GYMFIT_BAO_CAO_TMDT_NHOM15.docx`
2. `GYMFIT_BAO_CAO_TMDT_NHOM15.pdf`
3. `GYMFIT_UML_NHOM15.mdj`
4. `assets/uml/**`
5. `assets/erd/**`
6. `GYMFIT_SOURCE_SNAPSHOT.md`
7. `GYMFIT_CONTENT_MAP.md`
8. `GYMFIT_QA_CHECKLIST.md`

## Báo cáo cuối của agent

Chỉ kết luận `COMPLETED` khi:

- DOCX được tạo.
- DOCX đã render.
- Tất cả trang đã được kiểm tra.
- Không còn placeholder.
- UML/ERD đủ nét.
- Nội dung khớp source.
- Không có dữ liệu nhạy cảm.
- Không sửa repository hoặc database canonical.

Nếu chưa đạt, phải trả về:

`NOT_COMPLETE`

và liệt kê chính xác:

- File nào thiếu.
- Trang nào lỗi.
- Nội dung nào chưa xác minh.
- Dữ liệu đầu vào nào cần người dùng cung cấp.

Không được báo hoàn thành chỉ vì đã tạo nội dung text.