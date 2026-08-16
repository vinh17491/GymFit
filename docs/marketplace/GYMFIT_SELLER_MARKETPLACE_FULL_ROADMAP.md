# GymFit Seller Marketplace — Roadmap triển khai đầy đủ

> Final status — 30/07/2026: SELLER-012 `COMPLETE`; SELLER-013 `COMPLETE`; Marketplace MVP `READY WITH VERIFICATION EXCEPTIONS`. Security/API regression, current-schema acceptance, historical 0104→forward migration, canonical integrity, build and handover passed. Authenticated browser automation and live SMTP are environment-only verification exceptions. See `MARKETPLACE_MVP_FINAL_HANDOVER.md`. Team Summary: `NOT FOUND`.

**Phiên bản:** 2.0 — cập nhật ngày 29/07/2026  
**Trạng thái:** SELLER-000 đến SELLER-007 đã hoàn thành theo log dự án; Task tiếp theo là SELLER-008  
**Phạm vi:** Nhánh Seller/Marketplace Commerce  
**Không thuộc phạm vi roadmap này:** Coach/Workout do thành viên khác phụ trách; AI/Chatbox/AI Review tiếp tục đóng băng  
**Repository nguồn chính thức:** `https://github.com/vinh17491/GymFit` — branch chuẩn `main`  
**Thư mục log:** `D:\Log\Log Gymfit for seller`

> Tài liệu này là nguồn định hướng nghiệp vụ và phạm vi Task chính thức cho ChatGPT, Codex và nhóm.  
> Khi source thực tế khác với giả định, Codex phải dừng ở mức báo cáo trong log, không được âm thầm đổi business rule.

---

# 0. Trạng thái triển khai hiện tại

| Task | Trạng thái | Kết quả nền tảng |
|---|---|---|
| SELLER-000 | COMPLETE | Discovery repository, database, RBAC, Product, Cart, Order, Payment, migration và conflict map |
| SELLER-001 | COMPLETE | Seller Application, role `SELLER`, Admin duyệt/từ chối, rate limit và session handling |
| SELLER-002 | COMPLETE | Shop foundation, một Seller–một Shop, GymFit Official và backfill Product cũ |
| SELLER-003 | COMPLETE | BrandRequest và Admin moderation |
| SELLER-004 | COMPLETE | Product ownership theo Shop, public/Seller/Admin scope và compatibility Product ID `0` |
| SELLER-005 | COMPLETE | Seller Product/Variant/Image/Inventory và submit moderation |
| SELLER-006 | COMPLETE | Admin Product moderation, suspend/republish và audit |
| SELLER-007 | COMPLETE | Marketplace listing, search/filter/sort, Product Detail và public Shop page |
| SELLER-008 | COMPLETE | Multi-Shop Order Architecture; historical 0104→forward acceptance PASS |
| SELLER-008A | COMPLETE | Persistent Server-side Cart |
| SELLER-009 | COMPLETE | Checkout/payment/refund/voucher; deterministic mail acceptance PASS |
| SELLER-010 | COMPLETE | Seller fulfillment and hub logistics |
| SELLER-011 | COMPLETE | Commission, settlement and Seller revenue |
| SELLER-011A | COMPLETE | Complaint, fault decision and lightweight replacement |
| SELLER-012 | COMPLETE | Product and Shop reviews |
| SELLER-013 | COMPLETE | Security/API regression/integrity/docs PASS; browser and live SMTP are verification exceptions |

## 0.1. Baseline bắt buộc trước mỗi Task

Codex phải:

1. Chạy Git guard.
2. Ghi branch, HEAD, origin và `git status`.
3. Không reset, restore, clean, stash, checkout hoặc ghi đè WIP không thuộc Task.
4. Đọc log Task trước và log Task hiện tại nếu đã tồn tại.
5. Xác nhận migration đã apply/pending/checksum trước khi tạo migration mới.
6. Kiểm tra source thực tế trước khi chốt tên bảng, cột, enum, API hoặc route.
7. Không tự bắt đầu Task kế tiếp.
8. Không commit/push trừ khi Prompt của Task cho phép rõ ràng.

---

# 1. Mục tiêu

Chuyển GymFit từ website B2C một cửa hàng thành:

> **Managed Multi-vendor B2C Marketplace** — sàn thương mại điện tử B2C đa nhà bán, chuyên biệt cho sản phẩm thể thao, tập luyện và chăm sóc sức khỏe.

Seller mục tiêu là:

- Thương hiệu.
- Cửa hàng thể thao nhỏ và vừa.
- Store chưa có kênh bán hàng online.
- Đơn vị kinh doanh hợp pháp hoặc bán chuyên nghiệp được GymFit xét duyệt.

Không hỗ trợ:

- Member bán lại cho Member.
- Hàng cá nhân đã qua sử dụng.
- Mô hình C2C.
- Tài khoản Seller tự kích hoạt mà không qua Admin.

---

# 2. Quy trình làm việc

```text
Nhóm thảo luận và chốt yêu cầu
→ ChatGPT cập nhật Roadmap và viết Prompt
→ Codex kiểm tra repository và baseline
→ Codex thực hiện đúng một Task
→ Codex build/test khi cần và khi môi trường cho phép
→ Codex ghi log đầy đủ
→ Nhóm review kết quả
→ Nhóm quyết định Task tiếp theo
```

## 2.1. Quy tắc log

Mỗi Task có một file log riêng:

```text
D:\Log\Log Gymfit for seller\Log <tên Task>.md
```

Ví dụ:

```text
Log SELLER-000 Marketplace Repository Discovery.md
Log SELLER-008 Multi Shop Cart and Order Architecture.md
Log SELLER-008A Persistent Server Side Cart.md
```

Nếu chạy lại cùng Task:

- Không tạo folder mới.
- Không tạo file log mới.
- Append `RUN-02`, `RUN-03` vào đúng file log của Task.

Log phải ghi:

- Task, repository, branch và commit nền.
- Thời gian bắt đầu/kết thúc.
- Git guard.
- Trạng thái trước khi làm.
- File đã đọc và thay đổi.
- Migration/database.
- Backend/frontend.
- Build, lint, typecheck, API/browser verification.
- Acceptance pass/fail/not run.
- Vấn đề phát hiện.
- Git status cuối.
- Phần chưa hoàn thành và hướng tiếp tục.

Không ghi:

- Secret.
- Password.
- Token.
- Nội dung `.env`.
- Thông tin thanh toán nhạy cảm.
- Kết quả test không thực sự chạy.

## 2.2. Trạng thái Task hợp lệ

```text
COMPLETE
PARTIALLY COMPLETE
BLOCKED
FAILED
```

Không được ghi `COMPLETE` nếu chưa có bằng chứng phù hợp.

---

# 3. Các quyết định nghiệp vụ đã chốt

## D01 — Seller Application

Seller đăng ký qua **Kênh người bán riêng**, không dùng checkbox trong form đăng ký tài khoản thông thường.

Luồng:

```text
User đăng nhập
→ /seller/apply
→ tạo hồ sơ DRAFT
→ hoàn thiện hồ sơ
→ chủ động SUBMIT
→ PENDING
→ Admin APPROVED hoặc REJECTED
```

Quy tắc:

- Chỉ hồ sơ đã submit mới xuất hiện trong hàng chờ Admin.
- Một user chỉ có một hồ sơ đang xử lý.
- Có rate limit.
- Hồ sơ bị từ chối được chỉnh sửa và gửi lại theo policy.
- Khi được duyệt, tài khoản nhận role `SELLER`.
- MVP dùng một role chính cho một tài khoản.
- Seller không mua hàng trong MVP.
- `MEMBER` và `COACH` là buyer của Commerce.

## D02 — Seller và Shop

```text
Một Seller → một Shop
Một Shop → nhiều Product
Một Product → thuộc đúng một Shop
```

Không làm trong MVP:

- Một Seller có nhiều Shop.
- Nhiều Seller cùng quản lý một Shop.
- Nhân viên Shop.
- Phân quyền nội bộ Shop.

## D03 — Product thuộc Shop

Mỗi Shop tạo Product riêng.

Ví dụ:

```text
Product 101 — Thảm yoga Adidas — Shop FitHome
Product 205 — Thảm yoga Adidas — Shop ABC Sports
```

Hai Product có thể giống tên/Brand nhưng khác:

- Product ID.
- Shop.
- Giá.
- Variant.
- Inventory.
- Số lượng đã bán.
- Rating/review.
- Nội dung và hình ảnh.

Không dùng:

- Catalog Product chung.
- Seller Listing/Offer.
- Merge Product giữa các Shop.

## D04 — Category, Brand và Product moderation

Category:

- Do Admin quản lý.
- Seller chỉ chọn Category có sẵn trong MVP.

Brand:

- Seller chọn Brand có sẵn.
- Nếu không có, Seller gửi `BrandRequest`.
- BrandRequest phải được Admin duyệt.
- Seller không tự xuất bản Brand.
- Cho phép Brand `Không có thương hiệu/Generic`.

Product moderation:

```text
DRAFT
→ PENDING_REVIEW
→ PUBLISHED
hoặc REJECTED
hoặc SUSPENDED
```

## D05 — Multi-Shop Cart và Checkout

Một Cart có thể chứa sản phẩm từ nhiều Shop.

Một lần checkout tạo:

```text
Parent Order
├── ShopOrder — Shop A
│   ├── OrderItem A1
│   └── OrderItem A2
└── ShopOrder — Shop B
    └── OrderItem B1
```

Quy tắc:

- Member/Coach thanh toán một lần cho GymFit.
- Payment gắn với Parent Order.
- Fulfillment, commission, settlement và Seller ownership gắn với ShopOrder.
- Seller chỉ xem ShopOrder của Shop mình.
- Product giống nhau từ hai Shop vẫn tạo hai nhóm item riêng.
- Backend là nguồn cuối cùng của giá, Product, Variant, Shop và Inventory tại checkout.

### Cart tạm thời trong SELLER-008

- Tiếp tục sử dụng Cart hiện tại trong `localStorage`.
- Cart hiện tại là browser-persisted Cart, không phải database Cart.
- Frontend nhóm item theo Shop.
- Không tin giá hoặc tổng tiền do frontend gửi lên.
- Không reserve hàng khi chỉ thêm vào Cart.

### Cart ổn định sau SELLER-008

- SELLER-008A tạo `Carts` và `CartItems`.
- Buyer đăng nhập có persistent Cart trên backend.
- Guest Cart vẫn dùng `localStorage`.
- Merge Guest Cart vào Server Cart khi đăng nhập theo rule của Task.
- SELLER-008A phải hoàn thành trước SELLER-009.

## D06 — Thanh toán trước, Seller kiểm tra tồn kho vật lý sau

Luồng chuẩn:

```text
Buyer checkout
→ backend kiểm tra Product/Variant/Shop/giá/Inventory
→ reserve Inventory
→ tạo Parent Order + ShopOrders
→ ShopOrder = PENDING_PAYMENT
→ hiển thị QR
→ Buyer thanh toán
→ Admin xác nhận Payment = PAID
→ ShopOrder = PENDING_STOCK_CHECK
→ Seller kiểm tra hàng vật lý
```

Ý nghĩa:

- Inventory Seller nhập là nguồn chính để Buyer quyết định mua.
- Backend phải kiểm tra và reserve Inventory lúc checkout.
- `PENDING_STOCK_CHECK` không phải bước Seller phê duyệt đơn trước thanh toán.
- Đây là lần kiểm tra vật lý thứ hai để phát hiện lệch tồn kho, hàng hỏng, thất lạc hoặc dữ liệu chưa cập nhật.
- Luồng thành công mặc định vẫn dựa trên Inventory Seller đã nhập.

Seller đủ hàng:

```text
PENDING_STOCK_CHECK
→ PREPARING
→ READY_FOR_PICKUP
```

Seller không đủ hàng:

```text
PENDING_STOCK_CHECK
→ UNABLE_TO_FULFILL
→ CANCELLED
```

Khi Seller không đủ hàng:

- Hủy toàn bộ ShopOrder của Seller đó.
- Không chỉ hủy riêng item bị thiếu.
- Release Inventory đúng các OrderItem thuộc ShopOrder bị hủy.
- Không release Inventory của ShopOrder khác.
- Refund toàn bộ giá trị merchandise thuộc ShopOrder bị hủy.
- Xử lý outbound shipping refund theo rule được chốt trước SELLER-009.
- Gửi thông báo xin lỗi.
- Gửi email nếu mail đã cấu hình.
- Cấp voucher cho lần thanh toán sau.
- ShopOrder khác trong Parent Order tiếp tục hoạt động.

Voucher không thay thế refund.

## D07 — Quyền xử lý ShopOrder

Không sử dụng:

```text
PENDING_ACKNOWLEDGEMENT
ACKNOWLEDGED
```

Seller thao tác trên ShopOrder của mình:

```text
PENDING_STOCK_CHECK
→ PREPARING
→ READY_FOR_PICKUP
```

Ngoại lệ:

```text
PENDING_STOCK_CHECK
→ UNABLE_TO_FULFILL
```

Phân quyền theo Task:

- SELLER-008: Seller Order UI read-only.
- SELLER-009: Payment transition, stock-check confirmation và `UNABLE_TO_FULFILL`.
- SELLER-010: `PREPARING → READY_FOR_PICKUP` và fulfillment/logistics.

Admin:

- Xác nhận Payment.
- Xử lý cancel/refund.
- Cấp voucher.
- Điều phối lấy hàng.
- Xác nhận hàng về hub.
- Kiểm hàng tại hub.
- Gom hàng.
- Điều phối giao cho Buyer.
- Đánh dấu SHIPPED/DELIVERED.
- Can thiệp trạng thái có reason và audit.

## D08 — Hoa hồng, doanh thu và đối soát theo tuần

Luồng tài chính:

```text
Buyer thanh toán cho GymFit
→ GymFit ghi nhận tiền theo Parent Order và ShopOrder
→ ShopOrder giao thành công
→ ghi nhận doanh thu tuần của Seller
→ chờ đủ 7 ngày
→ Settlement = ELIGIBLE
→ Admin đưa vào kỳ đối soát tuần
→ Admin đánh dấu PAID
```

### Hoa hồng

- Có tỷ lệ mặc định toàn sàn.
- Lưu trong cấu hình/database.
- Có thể khởi tạo là 5%, nhưng không hardcode trong business logic.
- ShopOrder lưu `commission_rate_snapshot`.
- Commission tính trên merchandise subtotal của ShopOrder.
- Không tính commission trên outbound shipping fee.
- Thay đổi cấu hình không làm thay đổi commission của ShopOrder cũ.

### Doanh thu Seller

- ShopOrder được ghi nhận vào doanh thu tuần khi `DELIVERED`.
- Không gọi toàn bộ tiền bán hàng là “profit/lợi nhuận” vì GymFit không biết giá vốn và chi phí nội bộ của Seller.
- Giao diện Seller nên phân biệt:
  - Doanh thu tuần.
  - Hoa hồng GymFit.
  - Điều chỉnh.
  - Đang chờ đối soát.
  - Đủ điều kiện thanh toán.
  - Đã thanh toán.
  - Doanh thu ròng dự kiến.

### Settlement

```text
PENDING
→ HELD
→ ELIGIBLE
→ PAID
```

Hoặc khi không có vấn đề:

```text
PENDING
→ ELIGIBLE
→ PAID
```

Quy tắc:

- `earned_at` được ghi khi ShopOrder `DELIVERED`.
- `eligible_at = delivered_at + 7 ngày lịch`.
- Khoảng chờ tính riêng cho từng ShopOrder.
- Complaint `OPEN`/`UNDER_REVIEW` không tự hold settlement; chỉ Admin kết luận `SELLER_FAULT` mới hold settlement chưa `PAID`.
- Xử lý xong thì settlement có thể trở lại `ELIGIBLE`.
- Admin đối soát thủ công theo tuần.
- Không hardcode một thứ cụ thể trong tuần nếu chưa có yêu cầu vận hành.
- `PAID` chỉ có nghĩa Admin xác nhận GymFit đã thanh toán Seller bằng phương thức bên ngoài.
- Không payout ngân hàng tự động trong MVP.
- Không tự động thu hồi tiền Seller sau khi đã `PAID`; trường hợp muộn xử lý qua Ticket/manual support.

## D09 — Logistics qua điểm tập kết GymFit

Luồng:

```text
Seller kiểm tra hàng
→ Seller chuẩn bị hàng
→ GymFit điều phối lấy hàng lần đầu tại Seller
→ GymFit chịu phí Seller → hub lần đầu
→ hàng về hub GymFit
→ GymFit kiểm tra lần hai
→ GymFit gom hàng
→ GymFit giao một lần đến Buyer
→ Buyer chịu một outbound shipping fee
```

Quy tắc:

- GymFit chịu inbound shipping từ Seller đến hub ở lượt lấy hàng đầu tiên.
- Buyer trả một outbound shipping fee cho Parent Order.
- Không cộng phí vận chuyển theo số ShopOrder cho Buyer.
- Commission không tính trên shipping fee.
- Phí outbound ghi ở Parent Order.
- Không theo dõi hoặc tự động tính inbound shipping cost trong MVP.
- Không xây SLA acknowledge/preparation/hub arrival trong MVP.
- Không tự động hủy ShopOrder vì trễ SLA.
- MVP chưa tích hợp carrier API.
- Carrier và tracking có thể nhập thủ công nếu source hiện tại hỗ trợ.

ShopOrder logistics:

```text
READY_FOR_PICKUP
→ PICKED_UP
→ IN_TRANSIT_TO_HUB
→ RECEIVED_AT_HUB
→ HUB_CHECK_PASSED
hoặc HUB_CHECK_FAILED
```

Parent Order logistics:

```text
WAITING_FOR_SHOPS
→ CONSOLIDATING
→ READY_TO_SHIP
→ SHIPPED
→ DELIVERED
```

Quy tắc kiểm hàng tại hub:

- Seller phải tự kiểm tra đúng sản phẩm, số lượng, màu, kích thước và tình trạng trước khi bàn giao.
- GymFit kiểm tra lại tại hub.
- `HUB_CHECK_PASSED` không đồng nghĩa Settlement đã `PAID`.
- Khi hàng đạt tại hub, GymFit chịu trách nhiệm logistics đầu ra theo policy.
- Hàng lỗi tại hub được xử lý trước khi giao Buyer.

## D10 — Hủy, refund, khiếu nại và thay thế tối thiểu

### Trước khi Payment được xác nhận

- Buyer có thể hủy toàn bộ Parent Order theo rule.
- Release Inventory đúng một lần.
- Không tạo refund tiền thật nếu Payment chưa `PAID`.

### Sau khi Payment = `PAID`

- Buyer gửi yêu cầu hủy.
- Admin xử lý toàn bộ Parent Order hoặc một ShopOrder.
- Refund toàn phần hoặc một phần.
- Không refund tự động qua ngân hàng trong MVP.

### Seller không đủ hàng

```text
ShopOrder = UNABLE_TO_FULFILL
→ CANCELLED
→ release Inventory theo ShopOrder
→ refund
→ apology notification/email
→ voucher
```

### Sau khi Order đã rời hub

- Không hủy trực tiếp theo luồng trước giao.
- Chuyển sang Ticket/khiếu nại.
- Full Return/RMA/Exchange vẫn ngoài MVP.
- MVP chỉ làm khiếu nại và thay thế tối thiểu để bảo vệ settlement.

Fault party tối thiểu:

```text
SELLER_FAULT
BUYER_FAULT
GYMFIT_OR_CARRIER
UNDETERMINED
```

#### Khi lỗi thuộc Seller

- Seller phải cung cấp sản phẩm thay thế đúng phản hồi đã được Admin xác minh.
- Sản phẩm thay thế không tạo Order mới.
- Không tạo doanh thu mới.
- Không tính commission lần thứ hai.
- Seller chịu phí vận chuyển từ Seller đến hub cho lần thay thế.
- GymFit không tự động tính hoặc theo dõi phí này trong MVP.
- Chỉ khi Admin kết luận `SELLER_FAULT`, settlement chưa `PAID` mới chuyển `HELD`.
- Nếu thay thế thành công, giao dịch ban đầu tiếp tục và settlement được giải phóng theo rule.
- Nếu Seller không thể hoặc từ chối thay thế, Admin có thể refund và điều chỉnh settlement.

#### Khi lỗi thuộc Buyer

- Admin từ chối yêu cầu với reason và bằng chứng.
- Settlement tiếp tục theo lịch bình thường.
- Không khấu trừ Seller.

#### Khi lỗi thuộc GymFit hoặc carrier

- Seller không bị khấu trừ chỉ vì lỗi logistics sau khi hub đã xác nhận hàng đạt.
- GymFit chịu trách nhiệm xử lý với Buyer.
- Carrier reimbursement không thuộc phạm vi đồ án.

#### Khi chưa xác định lỗi

- Settlement tiếp tục lịch bình thường khi fault còn `UNDETERMINED`; không tự hold.
- Admin phải ghi reason, evidence hoặc ghi chú trước khi kết luận.

## D11 — Product Review và Shop Review

Product Review:

- Gắn với OrderItem.
- Chỉ Buyer đã mua.
- OrderItem phải giao thành công.
- Một OrderItem review một lần.

Shop Review:

- Gắn với ShopOrder.
- ShopOrder phải giao thành công.
- Một ShopOrder review Shop một lần.

Moderation:

```text
PENDING
→ PUBLISHED
hoặc HIDDEN
hoặc REJECTED
```

AI reply và Seller reply chưa thuộc MVP này.

## D12 — Search, Store Page và Product Detail

Marketplace listing:

- Hiển thị nhiều Product giống nhau nếu thuộc Shop khác.
- Mỗi card thể hiện Shop, Brand, giá, sold count, rating, review count, comment count.

Search/filter:

- Product name.
- Brand.
- Shop.
- Category.
- Giá.
- Rating.
- Còn hàng.
- Sort bán chạy, đánh giá, giá, mới nhất và liên quan.

Store Page:

```text
/shops/:shopSlug
```

Product Detail:

```text
/products/:productId
```

Có:

- Thông tin Shop.
- Product reviews.
- Shop rating.
- Related Products.
- Sản phẩm khác của cùng Shop.

SEO và công thức ranking nâng cao để sau.

---

# 4. Quyền sở hữu và bảo mật bắt buộc

Seller chỉ được thao tác dữ liệu thuộc Shop của mình.

Backend phải chặn:

- Seller A sửa/xóa Product của Seller B.
- Seller A xem hoặc chỉnh Inventory của Seller B.
- Seller A xem ShopOrder/OrderItem của Seller B.
- Seller A xem finance, settlement hoặc complaint riêng của Seller B.
- Seller tự duyệt SellerApplication, BrandRequest hoặc Product.
- Seller xác nhận Payment.
- Seller sửa commission, refund hoặc settlement.
- Seller tự xác định fault party cuối cùng.
- Seller thay rating, sold count hoặc aggregate.
- Seller truy cập dữ liệu Buyer không cần thiết.

Admin có quyền toàn sàn, nhưng mọi hành động quan trọng phải có audit:

- Seller approval/rejection.
- Product moderation.
- Payment confirmation.
- Cancel/refund.
- Voucher.
- Logistics override.
- Hub check.
- Complaint classification.
- Settlement hold/release/paid.

Frontend route guard chỉ phục vụ UX; ownership và authorization phải nằm ở backend.

---

# 5. Decision Gate còn lại

Các quyết định dưới đây không được hardcode trước khi đến Task tương ứng.

| Quyết định | Trạng thái | Thời điểm phải chốt |
|---|---|---|
| Tỷ lệ commission mặc định | Chưa chốt giá trị cuối | Trước SELLER-011 |
| Voucher theo số tiền hay phần trăm | Chưa chốt | Trước SELLER-009 |
| Giá trị voucher mặc định | Chưa chốt | Trước SELLER-009 |
| Thời hạn voucher | Chưa chốt | Trước SELLER-009 |
| Refund outbound fee khi partial cancel | Chưa chốt | Trước SELLER-009 |
| Refund status model | Chưa chốt chi tiết | Trước SELLER-009 |
| Cart merge conflict policy | Chưa chốt chi tiết | Trước SELLER-008A |
| Ngày chạy batch đối soát tuần | Không cần hardcode cho MVP | Quy trình vận hành |
| Settlement waiting period | Đã chốt: 7 ngày lịch sau `DELIVERED` | SELLER-011 |
| Seller acknowledge SLA | Loại khỏi MVP | Optional backlog |
| Preparation/hub SLA | Loại khỏi MVP | Optional backlog |
| Inbound shipping cost tracking | Loại khỏi MVP | Optional backlog |
| Carrier API | Ngoài MVP | Sau đồ án nếu cần |

## 5.1. Quyết định Discovery đã được xử lý

- Product cũ đã được gán vào Shop `GymFit Official`.
- Product ID cũ, bao gồm Product ID `0`, phải tiếp tục hoạt động.
- Migration Seller phải dùng dải đã được xác nhận trong log hiện tại; trước mỗi migration mới Codex phải kiểm tra số thực tế.
- `Orders` được ưu tiên giữ làm Parent Order để tương thích.
- Payment và Payment History tiếp tục gắn Parent Order.
- API/UI Order cũ phải được giữ tương thích trong giai đoạn migration.
- Không được dùng routine release toàn Parent Order cho partial ShopOrder cancellation.

---

# 6. Roadmap triển khai

# PHASE 0 — Discovery và bảo vệ baseline

## SELLER-000 — Marketplace Repository Discovery

**Trạng thái:** COMPLETE

**Mục tiêu:** Audit source và database trước khi thay đổi kiến trúc.

**Phạm vi:**

- Git guard.
- Branch, HEAD, origin và git status.
- Audit role/RBAC/session.
- Audit Product/Variant/Inventory.
- Audit Cart store và checkout.
- Audit Orders/OrderItems/history/payment/reservation.
- Audit coupons, notifications, invoices và tickets liên quan.
- Audit migration runner và migration hiện có.
- Audit frontend routes/sidebar/access policy.
- Audit phần Coach đang được thành viên khác sửa.
- Lập conflict map.
- Xác nhận các Product hiện tại sẽ thuộc Shop nào.
- Đề xuất migration allocation.
- Đề xuất REUSE/EXTEND/REPLACE/DEPRECATED.

**Không làm:**

- Không tạo migration lớn.
- Không thêm role Seller.
- Không sửa Order schema.
- Không rewrite Cart.

**Đầu ra:**

- Discovery report.
- Entity/API/UI impact matrix.
- Migration strategy.
- Conflict list với nhánh Coach.
- Updated implementation roadmap nếu source thực tế khác giả định.

**Acceptance:**

- Không làm mất WIP.
- Không sửa source ngoài tài liệu/log nếu không cần.
- Chỉ ghi COMPLETE khi đã audit đầy đủ.
- Log: `Log SELLER-000 Marketplace Repository Discovery.md`.

---

# PHASE 1 — Seller và Shop foundation

## SELLER-001 — Seller Application và Role Foundation

**Trạng thái:** COMPLETE

**Mục tiêu:** Tạo quy trình đăng ký Seller riêng và Admin xét duyệt.

**Backend/database:**

- `SELLER` role.
- `SellerApplications`.
- DRAFT/SUBMITTED/PENDING/APPROVED/REJECTED/WITHDRAWN theo thiết kế cuối.
- Ownership, validation và rate limit.
- Admin list/detail/review.
- Role/session invalidation khi được duyệt nếu cần.

**Frontend:**

- Kênh người bán.
- Form application.
- Trang theo dõi trạng thái.
- Admin inbox xét duyệt.

**Acceptance:**

- Application DRAFT không xuất hiện Admin inbox.
- Một user không tạo nhiều application đang mở.
- Admin approval đúng role.
- Rejection có reason.
- Cross-user access bị chặn.
- Build/typecheck/API verification.
- Log: `Log SELLER-001 Seller Application and Role Foundation.md`.

---

## SELLER-002 — Shop Foundation và GymFit Official

**Trạng thái:** COMPLETE

**Mục tiêu:** Tạo Shop và quan hệ một Seller–một Shop.

**Backend/database:**

- `Shops`.
- `owner_user_id`.
- name, slug, logo, banner, description, pickup address, status.
- verified/suspended state.
- Shop aggregate placeholders.
- Unique ownership rules.
- Tạo Shop khi Seller được duyệt hoặc qua onboarding.

**Migration dữ liệu:**

- Tạo Shop hệ thống `GymFit Official`.
- Gán Product cũ vào GymFit Official.
- Không làm mất Product ID cũ hoặc Product ID `0`.

**Frontend:**

- Seller Shop profile.
- Public Shop page skeleton.
- Admin Shop detail/suspension.

**Acceptance:**

- Một Seller chỉ sở hữu một Shop.
- Slug unique.
- Seller không sửa Shop khác.
- Product cũ không bị orphan.
- Log: `Log SELLER-002 Shop Foundation and Product Ownership Baseline.md`.

---

## SELLER-003 — Brand Request

**Trạng thái:** COMPLETE

**Mục tiêu:** Cho Seller đề xuất Brand mới có kiểm duyệt.

**Backend/database:**

- `BrandRequests`.
- Dedupe cơ bản theo normalized name.
- PENDING/APPROVED/REJECTED.
- Admin approval tạo Brand chính thức.
- Liên kết Product draft nếu có.

**Frontend:**

- “Không tìm thấy thương hiệu”.
- Form đề xuất Brand.
- Seller xem trạng thái.
- Admin inbox xét duyệt.

**Acceptance:**

- Seller không tạo Brand công khai trực tiếp.
- Brand được duyệt xuất hiện trong selector.
- Brand trùng được cảnh báo.
- Audit Admin action.
- Log: `Log SELLER-003 Brand Request and Moderation.md`.

---

# PHASE 2 — Seller Product và moderation

## SELLER-004 — Product Ownership Migration

**Trạng thái:** COMPLETE

**Mục tiêu:** Gắn Product với Shop mà không phá Catalog hiện tại.

**Backend/database:**

- `Products.shop_id`.
- NOT NULL sau backfill hợp lệ.
- Index theo Shop/status/category/brand.
- Query public chỉ trả Product được publish và Shop hoạt động.
- Admin query toàn sàn.
- Seller query owner-scoped.

**Compatibility:**

- Giữ Product ID cũ.
- Giữ Product images/variants/inventory.
- Giữ Product ID `0`.
- Không mất Product public hiện tại.

**Acceptance:**

- Không có Product orphan.
- Public Product API vẫn hoạt động.
- Admin Product CRUD regression.
- Seller ownership query pass.
- Log: `Log SELLER-004 Product Ownership Migration.md`.

---

## SELLER-005 — Seller Product, Variant, Image và Inventory

**Trạng thái:** COMPLETE

**Mục tiêu:** Seller quản lý hàng hóa của Shop mình.

**Seller được:**

- Tạo Product DRAFT.
- Chọn Category/Brand.
- Dùng BrandRequest.
- Tạo/sửa Variant.
- Upload/xóa/chọn primary image.
- Nhập và điều chỉnh Inventory.
- Gửi Product xét duyệt.
- Xem reason khi bị reject.

**Bảo mật:**

- Owner-scoped Product/Variant/Image/Inventory.
- Không truy cập Shop khác.
- Validation frontend/backend.
- Audit giá và Inventory.

**Acceptance:**

- CRUD hợp lệ cho Shop owner.
- Cross-Shop IDOR bị chặn.
- Upload limits/fallback tiếp tục hoạt động.
- Inventory invariant không bị phá.
- Log: `Log SELLER-005 Seller Product Variant Image Inventory.md`.

---

## SELLER-006 — Admin Product Moderation

**Trạng thái:** COMPLETE

**Mục tiêu:** Admin xét duyệt Product Seller trước khi xuất bản.

**Backend/database:**

- Approval status.
- Review reason.
- Submitted/reviewed/published timestamps.
- Moderation history/audit.
- Suspend/re-publish.

**Frontend:**

- Admin moderation inbox.
- Filter theo Shop/status/category/brand/date.
- Product preview.
- Approve/reject/suspend dialog.

**Acceptance:**

- Seller không tự publish.
- Rejected Product không public.
- Suspended Product không mua được.
- Admin reason được Seller nhìn thấy.
- Log: `Log SELLER-006 Admin Product Moderation.md`.

---

# PHASE 3 — Marketplace storefront

## SELLER-007 — Marketplace Product Listing, Search và Shop Page

**Trạng thái:** COMPLETE

**Mục tiêu:** Chuyển storefront thành listing đa Shop.

**Product Card:**

- Product.
- Brand.
- Shop.
- Giá.
- Sold count.
- Average rating.
- Review count.
- Comment count.
- Availability.

**Search/filter/sort:**

- Product/Brand/Shop/Category.
- Giá/rating/còn hàng.
- Bán chạy/đánh giá/giá/mới/liên quan.

**Pages:**

- `/shops/:shopSlug`.
- Product Detail mở rộng.
- Related Products.
- Sản phẩm khác của cùng Shop.

**Không làm:**

- SEO đầy đủ.
- Advanced ranking.
- Product merge.

**Acceptance:**

- Sản phẩm giống nhau của Shop khác hiển thị thành card riêng.
- Search trả đúng Shop/Brand.
- Inactive Shop/Product không public.
- Existing Catalog regression.
- Product ID `0` và GymFit Official tiếp tục hoạt động.
- Log: `Log SELLER-007 Marketplace Storefront Search and Shop Page.md`.

---

# PHASE 4 — Multi-Shop Commerce core

## SELLER-008 — Multi-Shop Order Architecture

**Trạng thái:** NEXT

**Mục tiêu:** Chuyển Order sang Parent Order + ShopOrder mà không phá Cart/checkout/payment hiện tại.

### Database/domain

- Giữ `Orders` làm Parent Order nếu source thực tế cho phép.
- Tạo `ShopOrders`.
- Mỗi ShopOrder thuộc đúng một Parent Order và một Shop.
- Thêm `OrderItems.shop_order_id`.
- Giữ `OrderItems.order_id` trong giai đoạn compatibility nếu source hiện tại cần.
- Lưu Shop subtotal.
- Tạo ShopOrder history hoặc mở rộng history hiện tại theo kiến trúc phù hợp.
- Định nghĩa trạng thái ban đầu:
  - `PENDING_PAYMENT`.
  - `PENDING_STOCK_CHECK`.
  - `PREPARING`.
  - `READY_FOR_PICKUP`.
  - `UNABLE_TO_FULFILL`.
  - `CANCELLED`.
- SELLER-008 không triển khai transition fulfillment; chỉ dựng domain tương thích.
- Không tạo SLA fields.
- Không tạo inbound shipping cost fields.
- Không tính commission/refund/settlement.
- Không tạo payout logic.

### Checkout compatibility

- Một checkout tạo atomically:
  - một Parent Order;
  - một ShopOrder cho mỗi Shop;
  - các OrderItem gắn đúng ShopOrder.
- Giữ payment và payment history ở Parent Order.
- Giữ reservation behavior hiện tại, không rewrite partial release trong Task này.
- Backend tải lại Product, Variant, Shop, giá và Inventory.
- Không tin Shop hoặc tổng tiền từ frontend.

### Cart tạm thời

- Giữ `localStorage` Cart hiện tại.
- Nhóm item theo Shop trên Cart và Checkout UI.
- Hiển thị Shop subtotal và Parent subtotal/total.
- Không tạo `Carts` hoặc `CartItems`.
- Không làm guest/server Cart merge.

### Quy tắc tiền

```text
ShopOrder.subtotal
= tổng OrderItem.line_total thuộc ShopOrder

Parent.subtotal
= tổng ShopOrder.subtotal

Parent.total
= Parent.subtotal
- Parent.discount
+ Parent.tax
+ Parent.outbound_shipping_fee
```

- Discount, tax và outbound shipping ở Parent.
- Không phân bổ outbound shipping xuống ShopOrder trong SELLER-008.
- Không tính commission hoặc Seller net.

### Migration

- Existing Order phải có ShopOrder tương ứng.
- Existing Order một cửa hàng được backfill vào ShopOrder của GymFit Official hoặc Shop được suy ra hợp lệ.
- Không mất Order history/payment history/reservation history.
- Migration phải chạy được khi database có hoặc không có Order lịch sử.
- Không đổi migration đã apply.
- Không làm mất Product ID `0`.

### API/read model

- Buyer xem Parent Order và `shopOrders`.
- Admin xem toàn bộ Parent + child.
- Seller xem ShopOrder thuộc Shop mình.
- Seller Order UI read-only.
- Seller không thấy dữ liệu Buyer ngoài mức cần thiết để fulfillment sau này.
- DTO có thể giữ `items` phẳng tạm thời để UI cũ không vỡ.
- API cũ phải được giữ tương thích hoặc có migration path rõ ràng.

### Không làm trong SELLER-008

- Server-side Cart.
- Payment workflow mới.
- Payment → `PENDING_STOCK_CHECK` transition hoàn chỉnh nếu thuộc SELLER-009.
- Seller stock-check action.
- Partial ShopOrder cancel/refund.
- ShopOrder-scoped reservation release.
- Voucher/apology.
- Seller fulfillment action.
- Hub logistics.
- SLA.
- Inbound cost tracking.
- Commission/settlement.
- Complaint/replacement.
- Không tự bắt đầu SELLER-008A.

### Acceptance

- Cart nhiều Shop hiển thị đúng nhóm.
- Một checkout tạo đúng số ShopOrder.
- Mọi OrderItem thuộc đúng ShopOrder.
- Tổng tiền Parent và Shop không lệch.
- Existing Orders đọc được.
- Payment history vẫn thuộc Parent.
- Buyer/Admin/Seller read model đúng quyền.
- Cross-Shop IDOR bị chặn.
- Seller UI chỉ read-only.
- Existing Catalog/Auth/Product regression không bị phá nghiêm trọng.
- Migration status/checksum hợp lệ.
- Backend/frontend build/typecheck và API verification khi môi trường cho phép.
- Log: `Log SELLER-008 Multi Shop Cart and Order Architecture.md`.

---

## SELLER-008A — Persistent Server-side Cart

**Trạng thái:** PLANNED

**Mục tiêu:** Chuyển Cart của Buyer đăng nhập từ browser-only sang persistent Cart trên backend trước khi mở rộng checkout/payment.

### Database/domain

- `Carts`.
- `CartItems`.
- Cart thuộc `MEMBER` hoặc `COACH`.
- Một Buyer có tối đa một active Cart.
- CartItem định danh Product + Variant theo invariant source thực tế.
- Hỗ trợ Product ID `0`.
- Không lưu giá frontend làm giá checkout.
- Không reserve Inventory khi thêm vào Cart.

### API

- Get active Cart.
- Add item.
- Update quantity.
- Remove item.
- Clear Cart.
- Resolve Product/Variant/Shop/availability từ backend.
- Chặn Product/Variant/Shop không còn đủ điều kiện public/purchase.

### Guest Cart và merge

- Guest Cart tiếp tục dùng `localStorage`.
- Khi đăng nhập, merge Guest Cart vào Server Cart.
- Dedupe theo Product/Variant.
- Quantity sau merge phải tuân theo validation và giới hạn Inventory.
- Merge phải idempotent.
- Không tạo item thuộc Shop không còn active.
- Conflict policy cuối cùng phải được chốt trước Prompt SELLER-008A.

### Frontend

- Cart UI tiếp tục nhóm theo Shop.
- Đồng bộ add/update/remove với backend khi Buyer đăng nhập.
- Loading/empty/error/retry state.
- Không hiển thị giá localStorage như nguồn cuối cùng.
- Sau checkout thành công, xóa đúng CartItem đã mua.

### Không làm

- Reserve Inventory trong Cart.
- Saved-for-later.
- Multiple named carts.
- Cart sharing.
- Cross-account Cart.
- Dynamic pricing engine.

### Acceptance

- Cart tồn tại sau logout/login và đổi trình duyệt.
- Guest Cart merge không tạo duplicate.
- Product ID `0` hoạt động.
- Giá/tồn kho được backend resolve.
- Cross-user Cart access bị chặn.
- Cart nhiều Shop vẫn checkout được.
- Existing checkout regression pass.
- Log: `Log SELLER-008A Persistent Server Side Cart.md`.

---

## SELLER-009 — Checkout, Payment, Reservation và Partial Cancellation

**Trạng thái:** PLANNED

**Mục tiêu:** Hoàn thiện QR/payment hiện tại trong mô hình nhiều Shop và xử lý thất bại theo ShopOrder.

### Luồng

```text
Checkout
→ validate price/availability
→ reserve Inventory theo OrderItem
→ create Parent Order + ShopOrders
→ ShopOrders = PENDING_PAYMENT
→ show QR
→ Buyer payment notification
→ Admin PAID/FAILED
```

Khi Admin xác nhận Parent Payment = `PAID`:

```text
ShopOrder PENDING_PAYMENT
→ PENDING_STOCK_CHECK
```

Seller kiểm tra hàng:

```text
PENDING_STOCK_CHECK
→ PREPARING
```

Hoặc:

```text
PENDING_STOCK_CHECK
→ UNABLE_TO_FULFILL
```

### Reservation

- Reserve theo OrderItem.
- Không double reserve.
- Release theo ShopOrder hoặc danh sách OrderItem cụ thể.
- Không gọi routine release toàn Parent khi chỉ hủy một ShopOrder.
- Mọi thao tác reserve/release phải transaction-safe và idempotent.

### Failure theo Shop

- ShopOrder `UNABLE_TO_FULFILL`.
- Hủy toàn bộ ShopOrder.
- Release Inventory của ShopOrder.
- Parent Order tiếp tục nếu còn ShopOrder hợp lệ.
- Tạo refund record toàn phần hoặc một phần.
- Không ảnh hưởng payment history của ShopOrder khác.

### Voucher/apology

- Notification in-app.
- Email nếu cấu hình.
- Voucher bồi thường.
- Reason/audit.
- Voucher không thay refund.

### Decision gate trước implementation

- Voucher amount/type/expiry.
- Partial refund của outbound shipping fee.
- Refund status model.

### Không làm

- Hub logistics.
- Commission.
- Settlement.
- Full complaint/RMA.
- Automated bank refund.

### Acceptance

- Không double reserve/release.
- Payment confirmation chuyển đúng ShopOrder sang `PENDING_STOCK_CHECK`.
- Seller đủ hàng chuyển `PREPARING`.
- Seller thiếu hàng chuyển `UNABLE_TO_FULFILL`.
- Partial cancel không hủy ShopOrder khác.
- Refund amount chính xác.
- Payment history vẫn đúng ở Parent.
- Audit đầy đủ.
- Log: `Log SELLER-009 Checkout Payment Refund and Compensation.md`.

---

# PHASE 5 — Fulfillment tập trung qua GymFit hub

## SELLER-010 — Seller Fulfillment và Hub Logistics

**Trạng thái:** PLANNED

**Mục tiêu:** Seller chuẩn bị hàng, GymFit lấy hàng và gom tại hub.

### Seller

```text
PREPARING
→ READY_FOR_PICKUP
```

- Seller chỉ cập nhật ShopOrder của Shop mình.
- Seller không được bỏ qua stock-check/payment gate.
- Seller không tự đánh dấu picked up, received at hub, shipped hoặc delivered.

### Inbound logistics

```text
READY_FOR_PICKUP
→ PICKED_UP
→ IN_TRANSIT_TO_HUB
→ RECEIVED_AT_HUB
→ HUB_CHECK_PASSED
hoặc HUB_CHECK_FAILED
```

### Parent Order

```text
WAITING_FOR_SHOPS
→ CONSOLIDATING
→ READY_TO_SHIP
→ SHIPPED
→ DELIVERED
```

### Admin

- Pickup scheduling fields tối thiểu nếu source hỗ trợ.
- Carrier/tracking thủ công nếu cần.
- Hub receipt.
- Hub check result và reason.
- Consolidation.
- Outbound carrier/tracking.
- Delivery completion.
- Audit mọi override quan trọng.

### Bỏ khỏi MVP

- Seller acknowledge SLA.
- Preparation SLA.
- Hub arrival SLA.
- Tự động phát hiện giao trễ.
- Tự động hủy vì trễ.
- Inbound shipping fee per ShopOrder.
- Fixed/manual inbound cost.
- Carrier API.
- Dynamic shipping.

### Acceptance

- Seller chỉ cập nhật ShopOrder của mình.
- Admin điều phối toàn bộ.
- Hub check pass/fail có reason.
- Buyer theo dõi được từng Shop và trạng thái tổng.
- Parent chỉ `DELIVERED` khi quy tắc hoàn thành thỏa mãn.
- Không tính settlement `PAID` chỉ vì hub check pass.
- Log: `Log SELLER-010 Seller Fulfillment and Hub Logistics.md`.

---

# PHASE 6 — Commission, settlement và Seller finance

## SELLER-011 — Commission, Weekly Settlement và Seller Revenue

**Trạng thái:** PLANNED

**Mục tiêu:** Tính doanh thu nền tảng, khoản phải trả Seller và đối soát thủ công theo tuần.

### Database/domain

- Marketplace settings.
- Default commission rate.
- `commission_rate_snapshot`.
- Commission base/amount.
- Seller net amount.
- `earned_at`.
- `eligible_at`.
- Settlement status/history.
- Settlement hold reason.
- Manual adjustment amount/reason nếu cần cho refund hoặc vận hành.
- Không cần inbound logistics cost.
- Không cần estimated platform margin dựa trên inbound cost.

### Rule

- Commission theo ShopOrder.
- Không tính commission trên shipping.
- Hủy/refund điều chỉnh commission.
- ShopOrder `DELIVERED` ghi nhận doanh thu Seller.
- `eligible_at = delivered_at + 7 ngày lịch`.
- Complaint `OPEN`/`UNDER_REVIEW` không tự hold; Admin kết luận `SELLER_FAULT` mới hold settlement chưa `PAID`.
- Đến `eligible_at`, settlement `PENDING` vẫn chuyển `ELIGIBLE` nếu chưa có Seller-fault hold.
- Admin đánh dấu `PAID` thủ công.
- Thay đổi config không sửa snapshot Order cũ.
- Không payout ngân hàng tự động.

### Frontend

Seller revenue page:

- Doanh thu tuần.
- Commission.
- Điều chỉnh.
- Pending.
- Held.
- Eligible.
- Paid.
- Net estimated.

Admin settlement inbox:

- Filter theo Shop/status/date.
- Weekly batch selection.
- Hold/release.
- Mark paid.
- Reason/audit.

### Decision gate

- Default commission rate.
- Cách xử lý refund sau `DELIVERED` nhưng trước `PAID`.
- Cách xử lý yêu cầu phát sinh sau `PAID` ở mức manual support.

### Acceptance

- ShopOrder chuyển `ELIGIBLE` sau đủ 7 ngày nếu chưa bị hold bởi Seller-fault decision.
- `HELD` chặn batch payment.
- Admin manual `PAID` có audit.
- Seller chỉ thấy finance của mình.
- Không tuyên bố payout tự động.
- Log: `Log SELLER-011 Commission Settlement and Seller Revenue.md`.

---

## SELLER-011A — Lightweight Complaint, Fault Decision và Replacement

**Trạng thái:** IMPLEMENTED (30/07/2026)

**Mục tiêu:** Hỗ trợ khiếu nại tối thiểu trong khoảng chờ đối soát mà không xây full Return/RMA/Exchange.

### Complaint

- Buyer chỉ tạo complaint cho OrderItem/ShopOrder đã giao thành công.
- Complaint phải thuộc Order của Buyer.
- Thời gian complaint ảnh hưởng settlement: trong 7 ngày từ `delivered_at`.
- Complaint sau khi settlement `PAID` chuyển Ticket/manual support, không tự động thu hồi tiền.

### Status tối thiểu

```text
OPEN
→ UNDER_REVIEW
→ REPLACEMENT_REQUIRED
→ RESOLVED
hoặc REJECTED
```

Có thể thêm `CANCELLED` nếu source cần.

### Fault party

```text
SELLER_FAULT
BUYER_FAULT
GYMFIT_OR_CARRIER
UNDETERMINED
```

Admin là bên kết luận cuối cùng và phải ghi reason.

### Settlement integration

- `OPEN`/`UNDER_REVIEW` với `UNDETERMINED` không tự hold settlement.
- Chỉ khi Admin kết luận `SELLER_FAULT`, settlement `PENDING`/`ELIGIBLE` mới chuyển `HELD`.
- Complaint rejected do Buyer fault thì release settlement.
- Seller fault mặc định yêu cầu replacement do Admin phê duyệt; mỗi Complaint chỉ có một attempt.
- Refund chỉ là fallback khi replacement không thể hoàn thành.
- GymFit/carrier fault không khấu trừ Seller.
- Settlement đã `PAID` bất biến; xử lý manual support/carry-forward adjustment thủ công, không clawback.

### Replacement tối thiểu

- Seller cung cấp hàng thay thế cho giao dịch gốc.
- Không tạo Order mới.
- Không tạo doanh thu mới.
- Không tính commission lần thứ hai.
- Seller chịu phí Seller → hub của lần thay thế.
- Không tự động tính hoặc thu phí replacement shipping trong hệ thống MVP.
- GymFit kiểm tra lại và giao lại.
- Khi resolved, settlement quay lại luồng eligibility phù hợp.
- Nếu replacement thất bại, Admin có thể refund/adjust settlement.

### Không làm

- Full RMA.
- Return warehouse.
- Automated return labels.
- Carrier API.
- Automated evidence scoring.
- Advanced dispute arbitration.
- Automated clawback sau `PAID`.

### Acceptance

- Buyer không khiếu nại Order người khác.
- Complaint `OPEN`/`UNDER_REVIEW` không tự hold; Seller-fault decision mới giữ settlement chưa `PAID`.
- Admin fault decision có audit.
- Seller replacement không tạo doanh thu/commission mới.
- Buyer fault không khấu trừ Seller.
- GymFit/carrier fault không khấu trừ Seller.
- Full RMA vẫn ngoài phạm vi.
- Log: `Log SELLER-011A Lightweight Complaint and Replacement.md`.

---

# PHASE 7 — Trust và đánh giá

## SELLER-012 — Product Review và Shop Review

**Trạng thái:** COMPLETE — commit `182f50e`.

**Mục tiêu:** Tạo review verified-purchase thật, không dùng random/static.

### Quyết định moderation đã thay đổi

Quyết định cũ mô tả Review đi qua `PENDING → PUBLISHED/HIDDEN/REJECTED`.

Quyết định áp dụng cho Marketplace MVP:

- Buyer submission hợp lệ được tạo trực tiếp ở `PUBLISHED` và xuất hiện công khai ngay sau commit.
- Buyer không được sửa, xóa hoặc gửi lại Review sau khi tạo.
- Không có pre-moderation inbox và flow mới không tạo `PENDING`.
- Admin có action soft moderation `PUBLISHED → HIDDEN/REJECTED`; mọi action cần reason, actor, timestamp, AuditLog và immutable history.
- Admin có thể restore `HIDDEN/REJECTED → PUBLISHED` với reason; giữ nguyên rating, comment và publication time ban đầu.
- Seller chỉ đọc Review `PUBLISHED` thuộc Shop của mình; không reply hoặc moderation.

Thay đổi này ảnh hưởng trực tiếp SELLER-012, security/regression ở SELLER-013 và định nghĩa Marketplace MVP. `PENDING` chỉ được giữ trong schema để tương thích roadmap/legacy, không dùng trong Buyer submission.

### Product Review

- Verified purchase được backend resolve từ đúng Parent Order → ShopOrder → OrderItem.
- Gắn duy nhất một Review cho mỗi OrderItem, kể cả sau hide/reject.
- Chỉ tạo khi Parent logistics là `DELIVERED`, `ShopOrders.delivered_at` có giá trị và child không canceled/unable.
- Rating nguyên 1–5; comment optional, trim, tối đa 2.000 ký tự.
- Product ID `0` là ID hợp lệ.

### Shop Review

- Verified purchase gắn đúng ShopOrder và Buyer sở hữu Parent Order.
- Duy nhất một Review/ShopOrder và chỉ sau giao thành công.

### Aggregate

- Query động từ Review `PUBLISHED`: Product/Shop average rating, review count và Product comment count.
- Product sold count lấy tổng quantity của original delivered OrderItems.
- Shop completed order count lấy số delivered ShopOrders.
- Hidden/rejected bị loại ngay; restore được tính lại ngay.
- Product list/detail/Card, rating filter/sort, best-selling sort và Shop page dùng cùng nguồn dữ liệu thật.

### Không làm

- Buyer edit/delete/resubmit, AI draft/summary/moderation, auto moderation.
- Seller reply/moderation, Review media/helpful votes/rewards.
- Replacement Review entitlement.

### Acceptance

- API acceptance disposable PASS 52 assertions; canonical integrity PASS.
- Cross-Buyer, undelivered, forged fields/status/verified, duplicate/concurrent submission và non-Admin moderation bị chặn.
- Public chỉ thấy `PUBLISHED`; moderation cập nhật aggregate đúng.
- Log: `Log SELLER-012 Product and Shop Reviews.md`.

---

# PHASE 8 — Security, regression và bàn giao

## SELLER-013 — Security, Regression và Final Acceptance

**Trạng thái:** COMPLETE — Marketplace MVP `READY WITH VERIFICATION EXCEPTIONS`.

**Mục tiêu:** Chứng minh Marketplace không phá Commerce cũ và không rò quyền Seller.

### Security

- RBAC.
- IDOR cross-Seller.
- Cross-Buyer Cart/Order/Complaint.
- Admin-only moderation/payment/refund/settlement/fault decision.
- Session revoke/role update.
- Rate limit SellerApplication/BrandRequest.
- Upload validation.
- Audit.

### Regression

- Auth Member/Coach/Admin/Seller.
- Product list/detail.
- Variant/inventory.
- Browser Cart và Server Cart.
- Cart merge.
- Cart nhiều Shop.
- Checkout.
- Reservation.
- Payment.
- Stock check.
- Partial cancel/refund.
- Hub fulfillment.
- Commission/weekly settlement.
- Settlement hold/release.
- Lightweight complaint/replacement.
- Product/Shop reviews.
- Existing GymFit Official Product/Order.
- Product ID `0`.

### Build/test

- Backend build/lint.
- Frontend typecheck/build.
- API acceptance.
- Browser acceptance khi môi trường cho phép.
- Migration status/checksum.
- Git status.

### Docs

- Feature status.
- API/database map.
- Setup.
- Known issues.
- Handover.
- Không ghi tính năng chưa có là COMPLETE.
- Cập nhật Roadmap và Team Summary theo trạng thái thực tế.

### Log

`Log SELLER-013 Security Regression and Final Acceptance.md`

---

# 7. Thứ tự phụ thuộc

```text
SELLER-000
→ SELLER-001
→ SELLER-002
→ SELLER-003
→ SELLER-004
→ SELLER-005
→ SELLER-006
→ SELLER-007
→ SELLER-008
→ SELLER-008A
→ SELLER-009
→ SELLER-010
→ SELLER-011
→ SELLER-011A
→ SELLER-012
→ SELLER-013
```

Có thể song song có kiểm soát:

```text
SELLER-003 Brand Request
và
một phần SELLER-002 Shop UI
```

Không nên chạy song song:

- SELLER-008 với thay đổi Order khác.
- SELLER-008A với checkout rewrite chưa ổn định.
- SELLER-009 với SELLER-010 khi ShopOrder state machine chưa ổn định.
- SELLER-011 với SELLER-011A khi settlement hold contract chưa chốt.
- Seller migration với Coach migration nếu chưa kiểm tra dải số.
- Hai Task cùng sửa RBAC/App routes/sidebar mà không có baseline commit.

---

# 8. Definition of Marketplace MVP

Marketplace MVP chỉ được xem là hoàn thành khi:

- SellerApplication hoạt động.
- Admin duyệt Seller.
- Một Seller có một Shop.
- Product thuộc Shop.
- Seller quản lý Product/Variant/Image/Inventory của mình.
- Admin duyệt Product.
- Marketplace hiển thị Product theo Shop.
- Có Store Page.
- Browser Cart nhiều Shop hoạt động trong SELLER-008.
- Persistent Server-side Cart hoạt động cho Buyer đăng nhập.
- Guest Cart merge hoạt động.
- Checkout tạo Parent Order + ShopOrders.
- Buyer thanh toán một lần cho GymFit.
- Payment confirmation chuyển ShopOrder sang `PENDING_STOCK_CHECK`.
- Seller kiểm tra tồn kho vật lý lần hai.
- Seller đủ hàng chuyển `PREPARING`.
- Seller thiếu hàng chuyển `UNABLE_TO_FULFILL`.
- Partial ShopOrder cancellation/refund hoạt động.
- Apology + voucher hoạt động.
- Seller chuẩn bị hàng.
- GymFit lấy hàng về hub lần đầu.
- GymFit chịu inbound shipping lần đầu theo policy.
- GymFit kiểm hàng tại hub.
- Buyer chịu một outbound shipping fee.
- Commission hoạt động theo ShopOrder.
- ShopOrder `DELIVERED` ghi nhận doanh thu tuần.
- Settlement chờ 7 ngày.
- Weekly manual settlement hoạt động.
- Admin kết luận `SELLER_FAULT` có thể `HELD` settlement chưa `PAID`; complaint chưa có kết luận không tự hold.
- Lightweight fault decision và replacement hoạt động.
- Product Review và Shop Review hoạt động.
- Cross-Seller/Cross-Buyer IDOR bị chặn.
- Commerce cũ không regression nghiêm trọng.
- Product ID `0` và GymFit Official tiếp tục hoạt động.
- Build và acceptance có bằng chứng phù hợp.
- Log đầy đủ cho từng Task.

---

# 9. Ngoài phạm vi Seller MVP

- C2C.
- Nhiều Shop cho một Seller.
- Shop staff.
- Shared Product Catalog.
- Product merge.
- Payment gateway marketplace.
- Split payment tự động.
- Payout ngân hàng tự động.
- Automated clawback.
- Escrow ngân hàng thật.
- COD.
- Carrier API.
- Dynamic shipping theo khoảng cách/trọng lượng.
- Inbound shipping cost tracking.
- Seller preparation/hub SLA.
- Automated late-order cancellation.
- Full Return/RMA/Exchange.
- Return warehouse.
- Advanced disputes.
- Automated fault detection.
- Seller reply review.
- AI/Chatbox/AI Review.
- Advanced ranking.
- SEO hoàn chỉnh.
- Mobile app.
- Recommendation AI.

---

# 10. Nguyên tắc thay đổi Roadmap

Nếu nhóm thay đổi quyết định:

1. Ghi rõ quyết định cũ.
2. Ghi quyết định mới.
3. Liệt kê Task bị ảnh hưởng.
4. Không sửa migration đã apply.
5. Không âm thầm thay đổi business rule trong Codex Prompt.
6. Cập nhật cả Roadmap và Team Summary.
7. Ghi thay đổi vào log của Task liên quan.
8. Không dùng nội dung hội thoại mới để vượt qua Roadmap nếu Roadmap chưa được cập nhật.
9. Nếu source buộc phải khác Roadmap, Codex phải báo `BLOCKED` hoặc `PARTIALLY COMPLETE` kèm bằng chứng, không tự thiết kế nghiệp vụ mới.

---

# 11. Lịch sử thay đổi chính thức

## Version 2.0 — 29/07/2026

### Quyết định cũ

- ShopOrder dùng `PENDING_ACKNOWLEDGEMENT → ACKNOWLEDGED`.
- SELLER-008 bao gồm Seller acknowledgement states và inbound cost placeholders.
- Cart backend chưa có Task riêng.
- Settlement chưa chốt khoảng chờ.
- Logistics yêu cầu SLA và inbound cost tracking.
- Khiếu nại/đổi hàng chỉ được nhắc chung, chưa gắn với settlement.

### Quyết định mới

- Loại bỏ `PENDING_ACKNOWLEDGEMENT` và `ACKNOWLEDGED`.
- Dùng `PENDING_PAYMENT → PENDING_STOCK_CHECK`.
- Inventory Seller nhập vẫn là nguồn chính; stock check là lớp kiểm tra vật lý lần hai sau Payment.
- SELLER-008 chỉ dựng Parent Order + ShopOrder và giữ browser Cart.
- Thêm SELLER-008A để tạo persistent Server-side Cart.
- Loại SLA và inbound cost tracking khỏi MVP chính.
- Settlement `eligible_at = delivered_at + 7 ngày`.
- Đối soát thủ công theo tuần.
- Complaint mở có thể chuyển settlement `HELD`.
- Thêm SELLER-011A cho complaint/fault/replacement tối thiểu.
- Seller fault phải thay hàng; lần thay thế không tạo doanh thu hoặc commission mới.
- Seller chịu phí Seller → hub của lần thay thế theo policy, nhưng hệ thống MVP không tự động tính phí.
- Buyer fault bị từ chối.
- GymFit/carrier fault không khấu trừ Seller.

### Task bị ảnh hưởng

- SELLER-008.
- SELLER-008A mới.
- SELLER-009.
- SELLER-010.
- SELLER-011.
- SELLER-011A mới.
- SELLER-013.
- Definition of Marketplace MVP.
- Outside-scope list.

## Version 2.1 — 30/07/2026 — SELLER-011A fault/hold decision

### Quyết định cũ

- Complaint hợp lệ đang mở chuyển settlement `HELD`.
- Seller fault yêu cầu replacement hoặc refund.

### Quyết định mới

- Complaint `OPEN`/`UNDER_REVIEW` với `UNDETERMINED` không tự hold settlement.
- Chỉ Admin kết luận `SELLER_FAULT` mới hold settlement chưa `PAID`.
- Replacement là phương án ưu tiên và phải được Admin phê duyệt.
- Mỗi Complaint chỉ có một replacement attempt chính thức.
- Refund là fallback khi replacement không thể hoàn thành.
- Settlement `PAID` không bị reopen, clawback hoặc tự động adjustment; Admin chỉ dùng manual support/carry-forward contract của SELLER-011.

### Task và định nghĩa bị ảnh hưởng

- SELLER-011.
- SELLER-011A.
- SELLER-013.
- Marketplace MVP definition.

Migration đã apply không bị sửa lịch sử.
