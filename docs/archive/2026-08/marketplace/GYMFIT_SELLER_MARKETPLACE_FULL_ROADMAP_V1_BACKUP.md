# Status: HISTORICAL
# Do not use as implementation source of truth.
# Superseded by: `docs/marketplace/GYMFIT_SELLER_MARKETPLACE_FULL_ROADMAP.md`

# GymFit Seller Marketplace — Roadmap triển khai đầy đủ

**Trạng thái:** Roadmap được nhóm thống nhất để chuẩn bị viết Prompt cho Codex  
**Phạm vi:** Nhánh Seller/Marketplace Commerce  
**Không thuộc phạm vi roadmap này:** Coach/Workout do thành viên khác phụ trách; AI/Chatbox/AI Review tiếp tục đóng băng  
**Repository nguồn chính thức:** `https://github.com/vinh17491/GymFit` — branch chuẩn `main`  
**Thư mục log:** `D:\Log\Log Gymfit for seller`

---

## 1. Mục tiêu

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

## 2. Quy trình làm việc

```text
Nhóm thảo luận và chốt yêu cầu
→ ChatGPT dựng roadmap và Prompt
→ Codex kiểm tra repository
→ Codex thực hiện code
→ Codex build/test khi cần và khi môi trường cho phép
→ Codex ghi log đầy đủ
→ Nhóm review kết quả và quyết định Task tiếp theo
```

### 2.1. Quy tắc log

Mỗi Task có một file log riêng:

```text
D:\Log\Log Gymfit for seller\Log <tên Task>.md
```

Ví dụ:

```text
Log SELLER-000 Marketplace Repository Discovery.md
Log SELLER-001 Seller Application and Shop Foundation.md
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

### 2.2. Trạng thái Task hợp lệ

```text
COMPLETE
PARTIALLY COMPLETE
BLOCKED
FAILED
```

Không được ghi `COMPLETE` nếu chưa có bằng chứng phù hợp.

---

## 3. Các quyết định nghiệp vụ đã chốt

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

## D04 — Category, Brand và moderation

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

- Member/Coach thanh toán một lần cho GymFit.
- Payment gắn với Parent Order.
- Fulfillment, commission, settlement và Seller ownership gắn với ShopOrder.
- Seller chỉ xem ShopOrder của Shop mình.

## D06 — Thanh toán ngay, không chờ Seller duyệt trước

Luồng chuẩn:

```text
Checkout
→ kiểm tra tồn kho
→ reserve tồn kho
→ tạo Parent Order + ShopOrder
→ hiển thị QR
→ buyer thanh toán
→ Admin xác nhận Payment
→ Seller chuẩn bị hàng
```

Nếu Seller không đủ hàng:

- Hủy toàn bộ ShopOrder của Seller đó.
- Không chỉ hủy riêng item bị thiếu.
- Release Inventory của toàn ShopOrder bị hủy.
- Refund toàn bộ giá trị thuộc ShopOrder bị hủy.
- Gửi thông báo xin lỗi.
- Gửi email nếu mail đã cấu hình.
- Cấp voucher cho lần thanh toán sau.
- ShopOrder khác trong Parent Order tiếp tục hoạt động.

Voucher không thay thế refund.

## D07 — Quyền xử lý Order

Seller thao tác trên ShopOrder của mình:

```text
PENDING_ACKNOWLEDGEMENT
→ ACKNOWLEDGED
→ PREPARING
→ READY_FOR_PICKUP
```

Ngoại lệ:

```text
PENDING_ACKNOWLEDGEMENT
→ UNABLE_TO_FULFILL
```

Admin:

- Xác nhận Payment.
- Xử lý refund.
- Cấp voucher.
- Điều phối lấy hàng.
- Xác nhận hàng về hub.
- Gom hàng.
- Điều phối giao cho buyer.
- Đánh dấu SHIPPED/DELIVERED.
- Can thiệp trạng thái có audit.

## D08 — Hoa hồng và đối soát

```text
Buyer thanh toán cho GymFit
→ GymFit ghi nhận tiền theo ShopOrder
→ ShopOrder hoàn thành
→ GymFit giữ commission
→ phần còn lại đối soát cho Seller
```

Hoa hồng:

- Có tỷ lệ mặc định toàn sàn.
- Lưu trong cấu hình/database.
- Có thể khởi tạo là 5%, nhưng không hardcode trong business logic.
- ShopOrder lưu `commission_rate_snapshot`.
- Không tính commission trên phí vận chuyển.

Settlement:

```text
PENDING
→ ELIGIBLE
→ PAID
hoặc HELD
```

Không làm payout ngân hàng tự động trong MVP.

## D09 — Logistics qua điểm tập kết GymFit

Luồng:

```text
Seller chuẩn bị hàng
→ GymFit điều phối lấy hàng tại Seller
→ GymFit chịu phí Seller → hub
→ hàng về hub GymFit
→ GymFit kiểm tra và gom hàng
→ GymFit giao một lần đến buyer
→ buyer chịu một phí giao hàng đầu ra
```

Quy tắc:

- GymFit chịu inbound shipping từ Seller đến hub.
- Buyer trả một outbound shipping fee cho Parent Order.
- Không cộng phí vận chuyển theo số ShopOrder cho buyer.
- Commission không tính trên shipping fee.
- Phí inbound ghi riêng theo ShopOrder.
- Phí outbound ghi ở Parent Order.
- MVP chưa tích hợp carrier API.
- Admin nhập carrier, tracking và chi phí thủ công hoặc theo cấu hình đơn giản.

ShopOrder logistics:

```text
READY_FOR_PICKUP
→ PICKED_UP
→ IN_TRANSIT_TO_HUB
→ RECEIVED_AT_HUB
```

Parent Order logistics:

```text
WAITING_FOR_SHOPS
→ CONSOLIDATING
→ READY_TO_SHIP
→ SHIPPED
→ DELIVERED
```

## D10 — Hủy và refund

Trước khi Payment được xác nhận:

- Buyer có thể hủy toàn bộ Parent Order theo rule.
- Release Inventory.

Sau khi Payment = `PAID`:

- Buyer gửi yêu cầu hủy.
- Admin xử lý toàn bộ Parent Order hoặc một ShopOrder.
- Refund toàn phần hoặc một phần.
- Không refund tự động qua ngân hàng trong MVP.

Seller không đủ hàng:

```text
ShopOrder → UNABLE_TO_FULFILL
→ CANCELLED
→ release Inventory
→ refund
→ apology notification/email
→ voucher
```

Sau khi Parent Order đã rời hub để giao:

- Không hủy trực tiếp.
- Chuyển sang Ticket/khiếu nại.
- Return/RMA/Exchange để sau.

## D11 — Product Review và Shop Review

Product Review:

- Gắn với OrderItem.
- Chỉ buyer đã mua.
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

## 4. Quyền sở hữu và bảo mật bắt buộc

Seller chỉ được thao tác dữ liệu thuộc Shop của mình.

Backend phải chặn:

- Seller A sửa/xóa Product của Seller B.
- Seller A xem hoặc chỉnh Inventory của Seller B.
- Seller A xem ShopOrder/OrderItem của Seller B.
- Seller tự duyệt SellerApplication, BrandRequest hoặc Product.
- Seller xác nhận Payment.
- Seller sửa commission, refund hoặc settlement.
- Seller thay rating, sold count hoặc aggregate.
- Seller truy cập dữ liệu buyer không cần thiết.

Admin có quyền toàn sàn, nhưng mọi hành động quan trọng phải có audit.

Frontend route guard chỉ phục vụ UX; ownership và authorization phải nằm ở backend.

---

## 5. Các quyết định chưa chặn roadmap nhưng phải khóa trước Task tương ứng

Những giá trị sau không nên hardcode và chưa cần chốt ngay:

| Quyết định | Thời điểm phải chốt |
|---|---|
| Tỷ lệ commission mặc định | Trước SELLER-010 |
| Voucher theo số tiền hay phần trăm | Trước SELLER-009 |
| Giá trị voucher mặc định | Trước SELLER-009 |
| Thời hạn voucher | Trước SELLER-009 |
| Thời hạn Seller acknowledge/prepare | Trước SELLER-008 |
| Phí outbound mặc định | Trước SELLER-007 |
| Cách ghi inbound shipping fee | Trước SELLER-008 |
| SLA ShopOrder về hub | Trước SELLER-008 |
| Refund outbound fee khi partial cancel | Trước SELLER-009 |
| Thời điểm settlement trở thành ELIGIBLE | Trước SELLER-010 |

### Quyết định kiến trúc còn bắt buộc trong Discovery

1. Product hiện tại sẽ được gán vào Shop nào.  
   Candidate đề xuất: `GymFit Official`.

2. Dải migration Seller và Coach để tránh trùng số.

3. Chiến lược chuyển Order hiện tại sang Parent Order + ShopOrder.

4. Cách giữ tương thích API/UI Order cũ trong quá trình migration.

5. Cách xử lý payment/order fixtures và dữ liệu acceptance hiện tại.

---

# 6. Roadmap triển khai

## PHASE 0 — Discovery và bảo vệ baseline

## SELLER-000 — Marketplace Repository Discovery

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

## PHASE 1 — Seller và Shop foundation

## SELLER-001 — Seller Application và Role Foundation

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
- Form application nhiều bước hoặc một trang rõ ràng.
- Trang theo dõi trạng thái.
- Admin inbox xét duyệt.

**Không làm:**

- Chưa cho Seller tạo Product.
- Chưa tạo Order Seller.

**Acceptance:**

- Application DRAFT không xuất hiện Admin inbox.
- Một user không tạo nhiều application đang mở.
- Admin approval đúng role.
- Rejection có reason.
- Cross-user access bị chặn.
- Build/typecheck/API verification.
- Log: `Log SELLER-001 Seller Application and Role Foundation.md`.

---

## SELLER-002 — Shop Foundation và GymFit Official Decision

**Mục tiêu:** Tạo Shop và quan hệ một Seller–một Shop.

**Backend/database:**

- `Shops`.
- `owner_user_id`.
- name, slug, logo, banner, description, pickup address, status.
- verified/suspended state.
- Shop aggregate placeholders.
- Unique ownership rules.
- Tạo Shop khi Seller được duyệt hoặc qua bước hoàn tất onboarding.

**Migration dữ liệu:**

- Thực hiện quyết định cho Product cũ.
- Nếu chốt `GymFit Official`, tạo Shop hệ thống và gán Product hiện tại.

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
- Giữ Product ID 0 nếu database hiện có.
- Không mất Product public hiện tại.

**Acceptance:**

- Không có Product orphan.
- Public Product API vẫn hoạt động.
- Admin Product CRUD regression.
- Seller ownership query pass.
- Log: `Log SELLER-004 Product Ownership Migration.md`.

---

## SELLER-005 — Seller Product, Variant, Image và Inventory

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
- Cross-shop IDOR bị chặn.
- Upload limits/fallback tiếp tục hoạt động.
- Inventory invariant không bị phá.
- Log: `Log SELLER-005 Seller Product Variant Image Inventory.md`.

---

## SELLER-006 — Admin Product Moderation

**Mục tiêu:** Admin xét duyệt Product Seller trước khi xuất bản.

**Backend/database:**

- Approval status.
- review reason.
- submitted/reviewed/published timestamps.
- moderation history/audit.
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
- Log: `Log SELLER-007 Marketplace Storefront Search and Shop Page.md`.

---

# PHASE 4 — Multi-Shop Commerce core

## SELLER-008 — Multi-Shop Cart và Order Architecture

**Mục tiêu:** Chuyển Cart/Order sang Parent Order + ShopOrder.

**Database/domain:**

- `Orders` là Parent Order hoặc tạo domain parent tương thích.
- `ShopOrders`.
- `OrderItems.shop_order_id`.
- Shop subtotal.
- Shop shipping/inbound cost fields.
- Seller acknowledgement/fulfillment states.
- Commission/refund/settlement placeholders.
- Histories phù hợp.

**Cart:**

- Nhóm item theo Shop.
- Checkout một lần.
- Tổng tiền theo Shop và toàn Order.

**Migration:**

- Existing Order phải có ShopOrder tương ứng.
- Không mất Order history/payment history.

**Acceptance:**

- Cart nhiều Shop.
- Một checkout tạo đúng ShopOrder.
- Tổng tiền không lệch.
- Existing Orders đọc được.
- Cross-shop access bị chặn.
- Log: `Log SELLER-008 Multi Shop Cart and Order Architecture.md`.

---

## SELLER-009 — Checkout, Payment, Reservation và Partial Cancellation

**Mục tiêu:** Tái sử dụng QR/payment hiện tại trong mô hình nhiều Shop.

**Luồng:**

```text
Checkout
→ validate price/availability
→ reserve Inventory theo OrderItem
→ create Parent Order + ShopOrders
→ show QR
→ buyer payment notification
→ Admin PAID/FAILED
```

**Failure theo Shop:**

- ShopOrder `UNABLE_TO_FULFILL`.
- Hủy toàn bộ ShopOrder.
- Release Inventory của ShopOrder.
- Parent Order tiếp tục nếu còn ShopOrder hợp lệ.
- Refund record toàn phần hoặc một phần.

**Voucher/apology:**

- Notification in-app.
- Email nếu cấu hình.
- Voucher bồi thường.
- Reason/audit.

**Decision gate trước implementation:**

- Voucher amount/type/expiry.
- Partial refund của outbound shipping fee.
- Refund status model.

**Acceptance:**

- Không double reserve/release.
- Partial cancel không hủy ShopOrder khác.
- Refund amount chính xác.
- Payment history vẫn đúng.
- Log: `Log SELLER-009 Checkout Payment Refund and Compensation.md`.

---

# PHASE 5 — Fulfillment tập trung qua GymFit hub

## SELLER-010 — Seller Fulfillment và Hub Logistics

**Mục tiêu:** Seller chuẩn bị hàng, GymFit lấy hàng và gom tại hub.

**Seller:**

```text
PENDING_ACKNOWLEDGEMENT
→ ACKNOWLEDGED
→ PREPARING
→ READY_FOR_PICKUP
```

**Inbound:**

```text
READY_FOR_PICKUP
→ PICKED_UP
→ IN_TRANSIT_TO_HUB
→ RECEIVED_AT_HUB
```

**Parent Order:**

```text
WAITING_FOR_SHOPS
→ CONSOLIDATING
→ READY_TO_SHIP
→ SHIPPED
→ DELIVERED
```

**Admin:**

- Pickup scheduling fields.
- Carrier/tracking manual.
- Inbound shipping fee per ShopOrder.
- Hub receipt.
- Consolidation.
- Outbound carrier/tracking.
- Delivery completion.

**Decision gate:**

- Seller acknowledge/preparation SLA.
- Hub arrival SLA.
- Cách xử lý Shop giao trễ.
- Fixed/manual inbound fee.
- Outbound fee mặc định.

**Acceptance:**

- Seller chỉ cập nhật ShopOrder của mình.
- Admin điều phối toàn bộ.
- Buyer theo dõi được từng Shop và trạng thái tổng.
- Order chỉ DELIVERED khi quy tắc hoàn thành thỏa mãn.
- Log: `Log SELLER-010 Seller Fulfillment and Hub Logistics.md`.

---

# PHASE 6 — Commission, settlement và Seller finance

## SELLER-011 — Commission và Settlement

**Mục tiêu:** Tính doanh thu nền tảng và khoản phải trả Seller.

**Database/domain:**

- Marketplace settings.
- Default commission rate.
- Commission snapshot.
- Commission base/amount.
- Seller net amount.
- Inbound logistics cost.
- Estimated platform margin.
- Settlement status/history.

**Rule:**

- Commission theo ShopOrder.
- Không tính trên shipping.
- Hủy/refund điều chỉnh commission.
- ELIGIBLE theo rule sau giao hàng.
- Admin đánh dấu PAID/HELD.

**Decision gate:**

- Default commission rate.
- Settlement waiting period.
- Cách xử lý partial refund sau DELIVERED nếu có.

**Frontend:**

- Seller revenue page.
- Admin settlement inbox.
- Commission breakdown.

**Acceptance:**

- Thay đổi config không sửa Order cũ.
- Seller chỉ thấy finance của mình.
- Admin audit đầy đủ.
- Không tuyên bố payout tự động.
- Log: `Log SELLER-011 Commission Settlement and Seller Revenue.md`.

---

# PHASE 7 — Trust và đánh giá

## SELLER-012 — Product Review và Shop Review

**Mục tiêu:** Tạo review thật, không dùng random/static.

**Product Review:**

- Verified purchase.
- Gắn OrderItem.
- Rating 1–5.
- Comment optional.
- Một review/OrderItem.

**Shop Review:**

- Gắn ShopOrder.
- Một review/ShopOrder.
- Chỉ sau giao thành công.

**Moderation:**

```text
PENDING
→ PUBLISHED
hoặc HIDDEN
hoặc REJECTED
```

**Aggregate:**

- Product average rating.
- Product review count.
- Product comment count.
- Product sold count.
- Shop rating/review count.
- Shop completed order count.

**Không làm:**

- AI draft/reply.
- Auto moderation.
- Seller reply.
- Coach expert recommendation.

**Acceptance:**

- Chưa mua không review được.
- Review Shop khác/Order khác bị chặn.
- Aggregate chính xác.
- Card/detail/shop page hiển thị đúng.
- Log: `Log SELLER-012 Product and Shop Reviews.md`.

---

# PHASE 8 — Security, regression và bàn giao

## SELLER-013 — Security, Regression và Final Acceptance

**Mục tiêu:** Chứng minh Marketplace không phá phần Commerce cũ và không rò quyền Seller.

**Security:**

- RBAC.
- IDOR cross-Seller.
- Admin-only moderation/payment/refund/settlement.
- Session revoke/role update.
- Rate limit SellerApplication/BrandRequest.
- Upload validation.
- Audit.

**Regression:**

- Auth Member/Coach/Admin/Seller.
- Product list/detail.
- Variant/inventory.
- Cart nhiều Shop.
- Checkout.
- Reservation.
- Payment.
- Partial cancel/refund.
- Hub fulfillment.
- Commission/settlement.
- Product/Shop reviews.
- Existing GymFit Official Product/Order nếu có.

**Build/test:**

- Backend build/lint.
- Frontend typecheck/build.
- API acceptance.
- Browser acceptance khi môi trường cho phép.
- Migration status/checksum.
- Git status.

**Docs:**

- Feature status.
- API/database map.
- Setup.
- Known issues.
- Handover.
- Không ghi tính năng chưa có là COMPLETE.

**Log:**

`Log SELLER-013 Security Regression and Final Acceptance.md`

---

## 7. Thứ tự phụ thuộc

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
→ SELLER-009
→ SELLER-010
→ SELLER-011
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
- SELLER-009 với SELLER-010 khi schema chưa ổn định.
- Seller migration với Coach migration nếu chưa chia dải số.
- Hai Task cùng sửa RBAC/App routes/sidebar mà không có baseline commit.

---

## 8. Definition of Marketplace MVP

Marketplace MVP chỉ được xem là hoàn thành khi:

- SellerApplication hoạt động.
- Admin duyệt Seller.
- Một Seller có một Shop.
- Product thuộc Shop.
- Seller quản lý Product/Variant/Image/Inventory của mình.
- Admin duyệt Product.
- Marketplace hiển thị Product theo Shop.
- Có Store Page.
- Multi-Shop Cart hoạt động.
- Checkout tạo Parent Order + ShopOrder.
- Buyer thanh toán một lần cho GymFit.
- Seller chuẩn bị hàng.
- GymFit lấy hàng về hub.
- GymFit chịu inbound shipping.
- Buyer chịu một outbound shipping fee.
- Partial ShopOrder cancellation/refund hoạt động.
- Apology + voucher hoạt động.
- Commission và settlement hoạt động ở mức nội bộ.
- Product Review và Shop Review hoạt động.
- Cross-Seller IDOR bị chặn.
- Commerce cũ không regression nghiêm trọng.
- Build và acceptance có bằng chứng phù hợp.
- Log đầy đủ cho từng Task.

---

## 9. Ngoài phạm vi Seller MVP

- C2C.
- Nhiều Shop cho một Seller.
- Shop staff.
- Shared Product Catalog.
- Product merge.
- Payment gateway marketplace.
- Split payment tự động.
- Payout ngân hàng tự động.
- COD.
- Carrier API.
- Dynamic shipping theo khoảng cách/trọng lượng.
- Return/RMA/Exchange đầy đủ.
- Advanced disputes.
- Seller reply review.
- AI/Chatbox/AI Review.
- Advanced ranking.
- SEO hoàn chỉnh.
- Mobile app.
- Recommendation AI.

---

## 10. Nguyên tắc thay đổi roadmap

Nếu nhóm thay đổi quyết định:

1. Ghi rõ quyết định cũ.
2. Ghi quyết định mới.
3. Liệt kê Task bị ảnh hưởng.
4. Không sửa migration đã apply.
5. Không âm thầm thay đổi business rule trong Codex Prompt.
6. Cập nhật cả Roadmap và Team Summary.
7. Ghi thay đổi vào log của Task liên quan.
