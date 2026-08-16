# GYMFIT — PROFESSIONAL UI/UX OVERHAUL (UI-ONLY)

## 0. MỤC TIÊU

Nâng cấp toàn bộ trải nghiệm giao diện GYMFIT từ mức khó hiểu/khô/cứng thành một sản phẩm:

- Dễ hiểu ngay lần đầu sử dụng.
- Phân cấp thông tin rõ.
- Mỗi vai trò biết việc tiếp theo cần làm.
- Đẹp, hiện đại, thống nhất.
- Có hiệu ứng mượt nhưng không phô trương.
- Không giật, không layout shift, không hover flicker.
- Responsive tốt trên mobile, tablet và desktop.
- Không thay đổi bất kỳ nghiệp vụ, API, quyền, database hoặc luồng dữ liệu nào.

Đây là một nhiệm vụ **UI/UX-only**. Source chức năng hiện tại đã hoạt động và phải được bảo toàn.

---

# 1. REPOSITORY VÀ BASELINE

```text
Repository: vinh17491/GymFit
Functional baseline branch: coach
Functional baseline commit: 3b4bf6f59f5fa754bd60ced95898c116c33ede5c
Recommended UI branch: ui/ux-overhaul
```

Bắt đầu bằng:

```bash
git status --short
git branch --show-current
git rev-parse HEAD
git log -1 --oneline
```

Nếu đang ở `coach` tại baseline hợp lệ, tạo branch UI riêng:

```bash
git switch -c ui/ux-overhaul
```

Nếu branch đã tồn tại thì không tạo lại, không reset, không force.

Không được:

```text
git reset --hard
git clean -fd
git push --force
```

---

# 2. RÀNG BUỘC TUYỆT ĐỐI

## 2.1. Không được thay đổi chức năng

Không sửa:

```text
backend/**
db/**
frontend/src/services/**
frontend/src/api/**
frontend/src/stores/**
frontend/src/types/**
frontend/src/auth/accessPolicy.ts
```

Không đổi:

- API endpoint.
- HTTP method.
- Request payload.
- Response DTO.
- Authentication.
- Authorization.
- Role.
- Route path.
- Query parameter.
- Form field name được backend sử dụng.
- ID.
- Trạng thái nghiệp vụ.
- Database.
- Migration.
- Booking rules.
- Workout rules.
- Seller rules.
- Admin rules.
- Member scope.
- Coach scope.

Không xóa hoặc thay đổi event handler nghiệp vụ hiện có.

Không thay đổi điều kiện `if`, validation, mutation, submit hoặc data fetch trừ khi chỉ tách component mà giữ nguyên logic từng dòng.

## 2.2. Không phát triển thêm tính năng

Không thêm:

- Chat.
- Notification.
- AI.
- Search backend mới.
- API mới.
- Dashboard statistic mới cần backend.
- Recommendation engine.
- Tour framework nặng.
- Theme builder.
- Realtime.
- Calendar integration.
- Payment.
- Video call.

Chỉ được thêm nội dung hướng dẫn, tooltip, helper text, quick-start card và visual affordance dựa trên route/chức năng đã tồn tại.

## 2.3. Không làm giao diện giả

Không:

- Fake số liệu.
- Hard-code danh sách nghiệp vụ.
- Random dữ liệu.
- Thêm nút không hoạt động.
- Thêm biểu đồ giả.
- Thêm badge giả.
- Dùng placeholder thay dữ liệu thật.
- Đổi lỗi backend thành “thành công”.
- Ẩn lỗi để giao diện trông đẹp.

---

# 3. AUDIT TRƯỚC KHI SỬA

Trước khi code, phải chạy app và ghi nhận:

## 3.1. Viewport

```text
375x812
768x1024
1024x768
1440x900
1920x1080
```

## 3.2. Vai trò

```text
Guest
Member
Coach
Admin
Seller
```

## 3.3. Route trọng yếu

### Guest

```text
/
/login
/register
/coaches
/coaches/:id
/products
/products/:id
/about
/contact
```

### Member

```text
/dashboard
/appointments
/appointments/:id
/workouts
/progress
/orders
/reviews
/loyalty
/referral
/tickets
/settings
```

### Coach

```text
/coach
/coach/profile
/coach/appointments
/coach/appointments/:id
/coach/exercises
/coach/workout-programs
/coach/members
/coach/assignments
/coach/schedules
/coach/sessions
/coach/progress
/settings
```

### Admin

```text
/admin
/admin/coaches
/admin/exercises
/admin/workouts
/admin/seller-applications
/admin/orders
/admin/refunds
/admin/settlements
/admin/products
/admin/inventory
/admin/analytics
/admin/audit
```

### Seller

```text
/seller
/seller/shop
/seller/products
/seller/orders
/seller/revenue
/seller/complaints
/seller/reviews
/settings
```

## 3.4. Audit output

Trước khi sửa, tạo báo cáo ngắn:

```text
UI_AUDIT
- confusing navigation:
- duplicated visual patterns:
- inconsistent spacing:
- inconsistent language:
- unclear primary action:
- dead/misleading controls:
- overflow:
- sidebar jitter reproduction:
- layout shift:
- unreadable tables/forms:
- routes with weak loading/empty/error states:
```

Chụp screenshot trước thay đổi nếu browser tooling cho phép.

---

# 4. HƯỚNG THIẾT KẾ

## 4.1. Design direction

Phong cách:

```text
Premium dark fitness operations platform
```

Đặc điểm:

- Nền tối sâu, không đen tuyệt đối trên mọi lớp.
- Surface phân cấp rõ.
- Lime chỉ dùng cho hành động chính và active state.
- Blue cho thông tin.
- Amber cho pending/warning.
- Red cho destructive/error.
- White cho tiêu đề chính.
- Slate cho nội dung phụ.
- Ít gradient.
- Không glassmorphism trên mọi card.
- Không glow quá mạnh.
- Không scale card 1.05 làm giao diện rung.
- Không animation liên tục gây mất tập trung.

## 4.2. Visual hierarchy

Mỗi trang phải có cấu trúc dễ hiểu:

```text
Breadcrumb hoặc context
→ Page title
→ Mô tả ngắn: trang này dùng để làm gì
→ Primary action
→ Summary/status
→ Main content
→ Secondary action/help
```

Người dùng phải trả lời được trong 3 giây:

```text
Tôi đang ở đâu?
Trang này để làm gì?
Tôi cần bấm nút nào tiếp theo?
```

## 4.3. Typography

- H1 rõ, không quá lớn.
- H2 phân tách section.
- Body tối thiểu 14px desktop, 15–16px với nội dung hướng dẫn.
- Line-height dễ đọc.
- Không dùng uppercase dài.
- Không dùng tracking quá rộng cho nội dung chính.
- Không trộn quá nhiều font weight.
- Không thêm font online nếu không cần thiết.

## 4.4. Spacing

Dùng spacing scale thống nhất:

```text
4, 8, 12, 16, 20, 24, 32, 40, 48
```

Không dùng margin/padding ngẫu nhiên ở mỗi page.

---

# 5. DESIGN SYSTEM TỐI THIỂU

Tổ chức component dùng chung trong phạm vi frontend, ví dụ:

```text
frontend/src/components/ui/
frontend/src/components/layout/
frontend/src/components/dashboard/
```

Tái sử dụng component hiện có thay vì tạo trùng.

Chuẩn hóa hoặc bổ sung các primitive UI:

```text
Button
IconButton
Card
PageHeader
SectionHeader
Breadcrumbs
FormField
Input
Select
Textarea
Checkbox/Switch visual
StatusBadge
Tabs
Table container
Pagination
Skeleton
EmptyState
ErrorState
InlineAlert
Tooltip
ConfirmDialog visual wrapper
Drawer
Modal surface
QuickStartCard
HelpHint
```

Không tạo một “framework UI” quá lớn.

Mỗi primitive phải có:

- Hover.
- Active.
- Focus-visible.
- Disabled.
- Loading nếu phù hợp.
- Dark contrast.
- Responsive.
- Reduced motion.

---

# 6. ƯU TIÊN SỐ 1 — SỬA SIDEBAR GIẬT

Người dùng báo menu bị giật khi đưa chuột vào góc trái, menu đẩy ra rồi rung/flicker.

## 6.1. Bắt buộc tìm root cause thật

Kiểm tra:

- CSS `:hover` làm đổi width.
- Invisible left-edge hover trigger.
- `onMouseEnter`/`onMouseLeave`.
- Pointer gap giữa trigger và sidebar.
- Transition đồng thời width + transform.
- Layout reflow làm con trỏ rời vùng hover.
- Multiple sidebar implementations.
- Media query chồng nhau.
- Framer Motion và CSS cùng animate một property.
- `overflow`, scrollbar hoặc border làm thay đổi kích thước.
- State toggle liên tục.
- Element nằm đè với `pointer-events`.

Không đoán rồi vá bằng tăng duration.

## 6.2. Desktop behavior mới

Không auto-expand bằng hover.

Dùng một trong hai cách ổn định:

### Cách ưu tiên

```text
Desktop >= 1024:
- Sidebar expanded cố định.
- Có nút thu gọn/mở rộng rõ ràng.
- State thay đổi bằng click, không bằng hover.
- Lưu trạng thái trong localStorage nếu phù hợp.
```

### Collapsed state

```text
Expanded: 260–280px
Collapsed: 72–80px
```

Khi collapsed:

- Chỉ hiện icon.
- Tooltip hiển thị label.
- Không tự mở khi hover.
- Không đổi layout liên tục.
- Active route vẫn rõ.
- Logo không bị méo.
- Profile/footer không overflow.

## 6.3. Animation sidebar

Chỉ animate property cần thiết:

```text
transform
opacity
grid-template-columns nếu đã test không layout shift
```

Không animate cùng lúc quá nhiều property.

Timing:

```text
180–220ms
cubic-bezier(0.2, 0.8, 0.2, 1)
```

Không dùng:

```text
transition: all
```

Không dùng spring bounce cho menu chính.

## 6.4. Mobile behavior

```text
< 1024:
- Sidebar là overlay drawer.
- Mở bằng nút hamburger.
- Slide bằng translateX.
- Backdrop fade.
- Không có left-edge hotzone.
- Click backdrop để đóng.
- Escape để đóng.
- Focus trap.
- Lock body scroll.
- Sau khi đóng trả focus về nút menu.
```

## 6.5. Jitter acceptance test

- Di chuột nhanh qua góc trái ít nhất 20 lần.
- Không auto mở nếu chưa click.
- Click thu gọn/mở rộng 20 lần.
- Không rung.
- Không nháy text.
- Không đổi scrollbar.
- Không horizontal overflow.
- Không layout shift bất thường.
- Không mất focus.
- Không duplicate menu.
- Không click nhầm item trong lúc animation.

---

# 7. APP SHELL VÀ TOPBAR

Nâng cấp `Layout`, `Sidebar`, topbar và content frame.

## 7.1. Shell

- Sidebar và content có chiều cao ổn định.
- Content không bị nhảy khi route thay đổi.
- Max width phù hợp dashboard.
- Page padding responsive.
- Background có chiều sâu nhẹ, không gây nhiễu.
- Sticky topbar không che nội dung.
- Z-index có hệ thống.

## 7.2. Topbar

Topbar phải hiển thị:

- Tên khu vực theo role.
- Breadcrumb/context ngắn.
- Nút mở menu trên mobile.
- Profile/avatar hoặc context hiện tại nếu đã có.
- Không để icon không rõ tác dụng.
- Không tạo search giả.

Nếu nút search hiện tại chưa có hành vi rõ:

- Chỉ nối với Command Menu đã tồn tại nếu không đổi permission/route.
- Hoặc bỏ khỏi UI.
- Không tạo backend search mới.

## 7.3. Route transition

Có thể dùng hiệu ứng nhẹ:

```text
opacity 0 → 1
translateY 4px → 0
duration 160–220ms
```

Không remount form hoặc mất state chỉ để chạy animation.

Không dùng animation làm chậm navigation.

---

# 8. INFORMATION ARCHITECTURE THEO VAI TRÒ

## 8.1. Member

Nhóm menu rõ:

```text
Tổng quan
Lịch hẹn Coach
Tập luyện
Mua sắm
Phần thưởng
Hỗ trợ
Tài khoản
```

Dashboard Member phải giải thích ngắn:

```text
1. Tìm Coach
2. Đặt lịch
3. Theo dõi lịch hẹn
4. Mở Workout được giao
```

Không tạo nghiệp vụ mới. Chỉ dùng quick action đến route hiện có.

## 8.2. Coach

Nhóm menu rõ:

```text
Tổng quan
Hồ sơ & lịch hẹn
Huấn luyện
Học viên
Theo dõi
Tài khoản
```

Luồng chính phải nổi bật:

```text
Cập nhật hồ sơ
→ Xử lý lịch hẹn
→ Tạo chương trình
→ Gán học viên
→ Theo dõi lịch workout/session/progress
```

Phải phân biệt trực quan:

```text
Coach Appointment
khác
Workout Schedule
```

Không dùng hai card giống nhau khiến người dùng nhầm.

## 8.3. Admin

Nhóm menu rõ:

```text
Tổng quan
Coach
Marketplace
Đơn hàng & tài chính
Nội dung
Báo cáo
Hệ thống
```

Không hiển thị một danh sách 20 mục không phân nhóm.

Giữ nguyên route và permission.

## 8.4. Seller

Nhóm menu rõ:

```text
Tổng quan Shop
Hồ sơ Shop
Sản phẩm
Đơn hàng
Khiếu nại & đánh giá
Doanh thu
Tài khoản
```

Primary tasks phải dễ thấy:

```text
Hoàn thiện Shop
Thêm sản phẩm
Xử lý đơn
Theo dõi doanh thu
```

## 8.5. Guest

Public navigation:

```text
Trang chủ
Coach
Bài tập/chương trình nếu đang public
Sản phẩm
Giới thiệu
Liên hệ
Đăng nhập
Đăng ký
```

Không làm guest menu giống dashboard.

---

# 9. NÂNG CẤP DASHBOARD

## 9.1. Nguyên tắc

Dashboard không chỉ là các ô số.

Mỗi dashboard cần:

- Greeting/context.
- 1 primary action.
- 3–4 metric có ý nghĩa.
- “Việc cần làm tiếp theo”.
- Recent/upcoming data.
- Empty state hướng dẫn.
- Không nhồi mọi module lên một màn hình.

## 9.2. Metric cards

- Giá trị lớn, label dễ hiểu.
- Icon nhỏ.
- Màu semantic.
- Không hover phóng to.
- Có skeleton.
- Không biến metric thành button nếu không click được.

## 9.3. Quick start

Thêm section hướng dẫn client-side, không cần backend:

### Member

```text
Bắt đầu với GYMFIT
1. Chọn Coach
2. Đặt lịch
3. Xem Workout
```

### Coach

```text
Thiết lập công việc
1. Hoàn thiện hồ sơ
2. Kiểm tra lịch hẹn
3. Tạo chương trình
4. Gán học viên
```

### Seller

```text
Bắt đầu bán hàng
1. Hoàn thiện hồ sơ Shop
2. Thêm sản phẩm
3. Kiểm tra đơn hàng
```

### Admin

```text
Công việc quản trị
1. Kiểm tra yêu cầu chờ duyệt
2. Theo dõi Coach
3. Theo dõi đơn/khiếu nại
```

Các bước chỉ link đến route có sẵn.

---

# 10. FORM UX

Áp dụng cho login, register, Coach profile, booking, program, assignment, seller, product và settings.

Bắt buộc:

- Label nằm ngoài input.
- Helper text rõ.
- Required được đánh dấu.
- Error gần field.
- Submit button rõ.
- Destructive action tách riêng.
- Disabled state rõ.
- Loading state không đổi chiều rộng button.
- Không reset form khi request fail.
- Không dùng placeholder thay label.
- Input height tối thiểu 44px.
- Textarea resize hợp lý.
- Mobile keyboard không che submit nếu có thể.

Không đổi field name hoặc payload.

---

# 11. TABLE VÀ LIST UX

Áp dụng cho Admin, Seller, Coach.

## 11.1. Desktop

- Header rõ.
- Row spacing dễ đọc.
- Status badge.
- Primary identifier nổi bật.
- Secondary metadata mờ hơn.
- Action không chiếm toàn bộ row.
- Sticky header nếu table dài và an toàn.
- Container có horizontal scroll thay vì phá layout.

## 11.2. Mobile

Không ép table rộng vào màn hình.

Dùng:

- Card list.
- Stacked metadata.
- Action menu rõ.
- Giữ đúng dữ liệu và handler cũ.

## 11.3. Empty/error/loading

Mỗi list phải có:

```text
Skeleton/loading
Empty state có hướng dẫn
Error state có retry
```

Không hiển thị trang trắng.

---

# 12. STATUS VÀ NGÔN NGỮ

## 12.1. Status badge

Chuẩn hóa visual:

```text
pending → amber
active/confirmed/completed → green hoặc blue theo ngữ cảnh
cancelled/inactive → slate
suspended/rejected/failed/no_show → red
draft → neutral
```

Không đổi giá trị status trong code/API.

## 12.2. Ngôn ngữ

UI chính dùng tiếng Việt thống nhất.

Giữ thuật ngữ kỹ thuật cần thiết:

```text
Coach
Workout
Session
Seller
Admin
```

Nhưng label phải dễ hiểu:

```text
Coach Dashboard → Tổng quan Coach
My Members → Học viên của tôi
Assignments → Phân công chương trình
Workout Schedule → Lịch workout
No-show → Vắng mặt
```

Không trộn Anh–Việt ngẫu nhiên trong cùng khu vực.

---

# 13. MICROCOPY VÀ KHẢ NĂNG TỰ HIỂU

Mỗi trang nghiệp vụ khó phải có mô tả 1–2 câu.

Ví dụ:

```text
Lịch hẹn học viên
Xử lý các yêu cầu đặt lịch trực tiếp với Coach. Phần này tách biệt với lịch workout được tạo từ chương trình tập.
```

```text
Phân công chương trình
Gán một chương trình tập đang hoạt động cho học viên thuộc phạm vi quản lý của bạn.
```

```text
Lịch workout
Theo dõi các buổi tập được sinh từ chương trình đã phân công.
```

Không viết đoạn văn dài.

Tooltip chỉ dùng cho icon hoặc thuật ngữ khó, không dùng thay label.

---

# 14. EFFECTS VÀ MOTION

Dùng `framer-motion` hiện có hoặc CSS transition hiện có. Không thêm animation library mới.

## 14.1. Được phép

- Page fade/slide nhẹ.
- Card hover nâng 1–2px.
- Button press scale 0.98.
- Skeleton shimmer nhẹ.
- Drawer slide.
- Modal fade/scale nhẹ.
- Tab indicator.
- Success state fade.
- Tooltip fade.

## 14.2. Không được

- Scale card 1.05 hàng loạt.
- Continuous floating.
- Particle background.
- Excessive glow.
- Bounce sidebar.
- Animation > 400ms cho thao tác chính.
- `transition-all` trên layout lớn.
- Animate width bằng hover.
- Motion làm mất focus.
- Animation lại mỗi khi state nhỏ đổi.
- Route animation làm mất form input.

## 14.3. Reduced motion

Bắt buộc hỗ trợ:

```css
@media (prefers-reduced-motion: reduce)
```

- Giảm hoặc tắt transform animation.
- Không bắt buộc người dùng xem animation.

---

# 15. ACCESSIBILITY

- Semantic heading.
- Button thật cho hành động.
- Link thật cho navigation.
- Không dùng `div onClick` nếu có thể.
- Focus-visible rõ.
- Contrast đủ.
- `aria-label` cho icon button.
- `aria-expanded` cho toggle.
- `aria-current="page"` cho menu active nếu phù hợp.
- Focus trap cho drawer/modal.
- Escape đóng drawer/modal.
- Không dựa duy nhất vào màu để biểu thị status.
- Touch target tối thiểu 44x44.
- Keyboard tab theo thứ tự hợp lý.
- Không auto focus gây nhảy trang ngoài dialog.

---

# 16. PERFORMANCE

- Không thêm dependency lớn.
- Không import toàn bộ icon package theo cách làm bundle tăng mạnh.
- Không thêm ảnh nền dung lượng lớn.
- Không render animation cho hàng trăm row.
- Memoize chỉ khi có lợi.
- Không tạo state cho mỗi visual nhỏ nếu CSS giải quyết được.
- Không gây re-fetch do tách component sai.
- Không thay dependency array nghiệp vụ.
- Không tạo infinite render.
- Không gây layout shift khi ảnh load; dùng aspect ratio.
- Không dùng backdrop blur mạnh trên toàn màn hình.

---

# 17. PHẠM VI FILE ĐƯỢC PHÉP

Được sửa chủ yếu:

```text
frontend/src/index.css
frontend/src/components/layout/**
frontend/src/components/dashboard/**
frontend/src/components/ui/**
frontend/src/pages/**
```

Có thể sửa import JSX trong page để sử dụng UI component mới.

Hạn chế sửa:

```text
frontend/src/App.tsx
```

Chỉ được sửa App nếu cần bọc layout visual hoặc import component visual, không được đổi route/path/guard.

Không sửa:

```text
backend/**
db/**
frontend/src/services/**
frontend/src/api/**
frontend/src/stores/**
frontend/src/types/**
frontend/src/auth/**
```

Sau task, chạy:

```bash
git diff --name-only
```

Nếu có file ngoài phạm vi, phải giải thích hoặc revert.

---

# 18. THỨ TỰ TRIỂN KHAI

## PHASE 1 — Foundation

1. Audit CSS token hiện có.
2. Loại style trùng/đá nhau.
3. Chuẩn hóa color, spacing, radius, shadow, motion.
4. Nâng cấp primitive dùng chung.
5. Không rewrite toàn bộ CSS trong một lần nếu dễ gây regression.

## PHASE 2 — App Shell

1. Sửa sidebar jitter.
2. Desktop explicit collapse.
3. Mobile drawer.
4. Topbar.
5. Content frame.
6. Breadcrumb/context.
7. Test keyboard/responsive.

## PHASE 3 — Core Dashboards

1. Member dashboard.
2. Coach dashboard.
3. Admin dashboard.
4. Seller dashboard.
5. Quick-start/help.
6. Metric/panel consistency.

## PHASE 4 — Core Task Flows

Ưu tiên theo mức dùng:

1. Login/Register.
2. Public Coach list/detail.
3. Member booking/appointments.
4. Coach appointments/profile.
5. Coach program/member/assignment/schedule pages.
6. Admin Coach and governance.
7. Seller product/order/shop pages.
8. Member order/workout/progress pages.

## PHASE 5 — Tables/Forms/States

1. Form fields.
2. Tables.
3. Pagination.
4. Status badge.
5. Empty/error/loading.
6. Confirm/destructive visuals.

## PHASE 6 — Motion/Polish

1. Micro-interaction.
2. Reduced motion.
3. Mobile overflow.
4. Focus/keyboard.
5. Remove dead visual effects.
6. Final consistency pass.

---

# 19. FUNCTIONAL INVARIANTS

Phải ghi và kiểm tra trước/sau:

```text
Routes unchanged
API calls unchanged
Request payloads unchanged
Response consumption unchanged
Role permissions unchanged
Auth flow unchanged
Booking state machine unchanged
Workout flow unchanged
Seller flow unchanged
Admin flow unchanged
Database untouched
Migration untouched
```

Dùng `git diff` để xác minh.

Không được kết luận UI-only nếu có backend/db/service diff.

---

# 20. TEST BẮT BUỘC

## 20.1. Static

```bash
cd frontend
npm ci
npx tsc --noEmit
npm run build
```

Nếu có lint script:

```bash
npm run lint
```

## 20.2. Browser smoke

Mỗi role:

```text
Login
Open dashboard
Open sidebar
Collapse/expand
Navigate through core routes
Submit one safe existing form flow
Verify loading/error/empty states where possible
Logout
```

## 20.3. Network invariants

Trong browser DevTools:

- Không có endpoint mới.
- Không có request lặp vô hạn.
- Không có request mất đi do UI refactor.
- Payload trước/sau giống nhau.
- Status handling giữ nguyên.

## 20.4. Console

Không được có:

- React key warning mới.
- Hydration warning.
- Unhandled promise rejection.
- Infinite update.
- Missing aria label nghiêm trọng do component mới.
- Runtime TypeError.
- CSS overflow warning nếu tooling báo.

## 20.5. Responsive

Kiểm tra:

```text
375x812
768x1024
1024x768
1440x900
1920x1080
```

PASS khi:

- Không horizontal overflow ngoài table container.
- Sidebar không giật.
- Drawer không tràn.
- Header không che nội dung.
- CTA không bị mất.
- Form không quá hẹp.
- Table chuyển layout phù hợp.
- Modal/drawer dùng được.

---

# 21. DEFINITION OF DONE

Chỉ kết luận `FULL_UI_UX_OVERHAUL_COMPLETE` khi:

- [ ] Không sửa backend.
- [ ] Không sửa database.
- [ ] Không sửa API/service contract.
- [ ] Không đổi route.
- [ ] Không đổi permission.
- [ ] Sidebar không còn hover jitter.
- [ ] Desktop sidebar dùng click state.
- [ ] Mobile drawer mượt.
- [ ] Menu được phân nhóm theo role.
- [ ] Dashboard có hierarchy rõ.
- [ ] Core forms dễ hiểu.
- [ ] Core tables responsive.
- [ ] Loading/empty/error thống nhất.
- [ ] Ngôn ngữ thống nhất.
- [ ] Motion nhẹ và có reduced-motion.
- [ ] Keyboard usable.
- [ ] TypeScript PASS.
- [ ] Build PASS.
- [ ] Browser smoke PASS 5 viewport.
- [ ] Guest PASS.
- [ ] Member PASS.
- [ ] Coach PASS.
- [ ] Admin PASS.
- [ ] Seller PASS.
- [ ] Console không có error mới.
- [ ] Network invariants PASS.
- [ ] `git diff --check` PASS.

Nếu thiếu browser test hoặc functional invariant:

```text
PARTIAL_UI_UX_OVERHAUL
```

---

# 22. OUTPUT BẮT BUỘC

Cuối task trả:

```text
FINAL VERDICT:
FULL_UI_UX_OVERHAUL_COMPLETE
hoặc
PARTIAL_UI_UX_OVERHAUL
hoặc
UI_UX_OVERHAUL_BLOCKED
```

```text
BRANCH:
START COMMIT:
END COMMIT:
```

## Root causes

```text
Sidebar jitter:
Navigation confusion:
Visual inconsistency:
Form/table usability:
```

## Files changed

```text
Layout:
Shared UI:
Member:
Coach:
Admin:
Seller:
Public:
CSS:
```

## Functional invariants

```text
Backend diff:
Database diff:
Service/API diff:
Route diff:
Permission diff:
Payload diff:
```

Tất cả phải là:

```text
NONE
```

hoặc giải thích chính xác.

## Verification

```text
TypeScript:
Frontend build:
Lint:
Guest browser:
Member browser:
Coach browser:
Admin browser:
Seller browser:
375x812:
768x1024:
1024x768:
1440x900:
1920x1080:
Sidebar jitter:
Keyboard:
Reduced motion:
Console:
Network:
git diff --check:
```

## UX improvements delivered

Liệt kê thay đổi thực tế, không dùng câu chung chung như “UI đẹp hơn”.

## Known limitations

Chỉ ghi giới hạn thật.

---

# 23. CODEX APP PROMPT

Dán lệnh sau vào Codex App sau khi đặt file này trong root repository:

```text
Hãy mở và đọc toàn bộ file `GYMFIT_UI_UX_OVERHAUL_UI_ONLY.md`.

Repository là `vinh17491/GymFit`. Functional baseline là branch `coach`, commit `3b4bf6f59f5fa754bd60ced95898c116c33ede5c`.

Đây là nhiệm vụ UI/UX-only. Không được sửa backend, database, migration, API, service, store, type contract, auth, permission, route path, request payload, response mapping hoặc nghiệp vụ hiện có.

Thực hiện theo đúng thứ tự:
1. Audit UI hiện tại trên Guest, Member, Coach, Admin và Seller.
2. Tái hiện và tìm root cause thật của sidebar bị giật khi đưa chuột vào góc trái.
3. Loại bỏ hoàn toàn cơ chế auto-expand bằng hover; dùng sidebar điều khiển bằng nút trên desktop và overlay drawer trên mobile.
4. Chuẩn hóa design system, app shell, navigation, dashboard, form, table, loading, empty, error và status.
5. Thêm hướng dẫn ngắn và quick-start dựa trên route/chức năng đã có, không tạo nghiệp vụ mới.
6. Thêm motion nhẹ, mượt, có prefers-reduced-motion.
7. Kiểm tra responsive tại 375x812, 768x1024, 1024x768, 1440x900 và 1920x1080.
8. Chạy TypeScript, frontend build, lint nếu có, browser smoke cho 5 role, console/network check và git diff --check.
9. Xác minh backend diff, database diff, service/API diff, route diff, permission diff và payload diff đều NONE.
10. Trả báo cáo đúng phần OUTPUT BẮT BUỘC.

Không thêm nút giả, dữ liệu giả, biểu đồ giả, API mới hoặc chức năng mới. Không báo FULL nếu sidebar vẫn giật, browser chưa test hoặc có thay đổi nghiệp vụ.
```
