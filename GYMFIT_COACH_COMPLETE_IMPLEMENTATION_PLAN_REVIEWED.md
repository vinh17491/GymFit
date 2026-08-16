# GYMFIT — PROMPT PLAN HOÀN THIỆN TOÀN BỘ MODULE COACH

> **Mục tiêu:** Dùng toàn bộ file này làm prompt chính thức cho Codex/AI Coding Agent để rà soát, sửa lỗi và hoàn thiện toàn bộ phần Coach của dự án GYMFIT.
>
> **Nguyên tắc bắt buộc:** Không làm lệch kiến trúc hiện tại, không tạo chức năng ngoài phạm vi, không sửa Marketplace, không tạo code demo, không hard-code dữ liệu và không phá vỡ các luồng Coach–Member–Workout đã hoạt động.

---

# 1. STATE — TRẠNG THÁI HIỆN TẠI VÀ MỤC TIÊU

## 1.1. Trạng thái hiện tại

Dự án đã có phần Coach/Workout tương đối hoàn chỉnh ở các luồng:

- Exercise Library.
- Workout Program.
- Program Builder.
- Coach–Member assignment.
- Workout Assignment.
- Workout Schedule.
- Workout Session.
- Session Snapshot.
- Set Logs.
- Member Progress.
- Coach Dashboard integration.
- Member Dashboard integration.
- Authorization và IDOR cho phần Workout.

Tuy nhiên phần **Public Coach Booking / Coach Appointment** hiện đang bị lỗi nghiêm trọng và chưa hoàn thiện.

Các lỗi đã xác định:

1. Trang `/booking` sử dụng danh sách Coach hard-code, không lấy dữ liệu thật.
2. Tên Coach tại `/booking` khác với `/coaches`.
3. Trang `/booking` hiển thị “Booking Confirmed” nhưng không gọi API và không lưu database.
4. Trang `/coaches/:id` mở modal đặt lịch nhưng không submit booking thật.
5. Service Coach tự sinh rating, review, giá, chứng chỉ và slot bằng dữ liệu random.
6. Landing page có danh sách Coach hard-code khác.
7. Có nhiều nguồn dữ liệu Coach không đồng nhất.
8. Coach bị `SUSPENDED` có thể vẫn xuất hiện và được đặt lịch.
9. `/booking` cho phép cả Member, Coach và Admin truy cập trong khi backend chỉ hỗ trợ Member tạo booking.
10. Sidebar Coach gọi `/booking` là “Lịch tập”, gây nhầm giữa Coach Appointment và Workout Schedule.
11. Coach chưa có trang quản lý appointment riêng.
12. Member chưa có trang quản lý appointment riêng.
13. Availability chưa được kiểm tra đầy đủ.
14. Booking mới chỉ kiểm tra trùng `start_time`, chưa kiểm tra overlap.
15. Timezone có nguy cơ lệch ngày vì đang dùng UTC.
16. State transition của booking chưa được kiểm soát chặt.
17. Public Coach Profile đang hiển thị dữ liệu giả.
18. Các route Coach/Member liên quan đến lịch đang dư, trùng hoặc đặt tên gây nhầm.
19. Dashboard có thể hiển thị hành động booking không đúng vị trí.
20. Chưa có acceptance test đầy đủ cho Coach Appointment.

## 1.2. Mục tiêu cuối cùng

Hoàn thiện module Coach theo hai luồng tách biệt, rõ ràng:

### Luồng A — Coach Appointment

```text
Public xem danh sách Coach
→ Xem chi tiết Coach
→ Member đăng nhập
→ Chọn ngày và slot khả dụng
→ Tạo booking PENDING
→ Coach xác nhận
→ Appointment được hoàn thành, hủy hoặc đánh dấu no-show
```

### Luồng B — Workout Management

```text
Admin assign Coach cho Member
→ Coach tạo Workout Program
→ Coach assign Program
→ Coach tạo Workout Schedule
→ Member bắt đầu Workout Session
→ Member ghi Set Logs
→ Hệ thống tính Progress
```

Hai luồng phải độc lập về database, route, UI wording, API, state machine, permission, dashboard và test.

**Không được tự động biến một booking thành Coach–Member assignment.**


## 1.3. Thông tin đã đối chiếu trực tiếp với repository hiện tại

Các chi tiết dưới đây là ràng buộc theo source hiện tại, không được suy đoán khác đi:

```text
Current branch trong bản ZIP kiểm tra: coach
Current HEAD trong bản ZIP kiểm tra: 04f5841
Backend: Express + TypeScript + MSSQL
Validation: Zod
Frontend: React + Vite + TypeScript
Shared backend route prefix: /api
Booking route prefix: /api/bookings
Public Coach route prefix hiện có: /api/coaches
Business database: SQL Server
```

Các file lỗi đã được xác nhận trực tiếp:

```text
frontend/src/pages/booking/CoachBooking.tsx
frontend/src/pages/coaches/CoachProfilePage.tsx
frontend/src/services/coaches.ts
frontend/src/pages/landing/LandingPage.tsx
frontend/src/auth/accessPolicy.ts
frontend/src/components/layout/Sidebar.tsx
frontend/src/App.tsx
backend/src/modules/bookings/bookings.routes.ts
backend/src/modules/bookings/bookings.controller.ts
backend/src/modules/coaches/coach.controller.ts
db/migrations/0006_auth_session_security.sql
db/migrations/0009_admin_coach_management.sql
```

Không được đổi stack, ORM hóa lại toàn bộ backend hoặc chuyển database khỏi SQL Server.

---

# 2. TAILOR — PHẠM VI, KIẾN TRÚC VÀ RÀNG BUỘC

## 2.1. Repository và stack

Trước khi sửa code, phải tự rà soát repository hiện tại để xác định chính xác:

- Frontend framework.
- Backend framework.
- ORM hoặc SQL access layer.
- Database schema.
- Auth middleware.
- Role enum.
- Shared API client.
- Routing.
- Existing Coach modules.
- Existing Booking modules.
- Existing Workout modules.
- Existing migrations.
- Existing test structure.

Không được đoán stack nếu source code đã thể hiện rõ.

## 2.2. Phạm vi được phép sửa

Được phép sửa các phần liên quan trực tiếp tới:

```text
frontend/src/pages/coaches/**
frontend/src/pages/booking/**
frontend/src/pages/appointments/**
frontend/src/pages/coach/**
frontend/src/pages/dashboard/**
frontend/src/services/coaches.*
frontend/src/services/bookings.*
frontend/src/api/**
frontend/src/auth/accessPolicy.*
frontend/src/components/coach/**
frontend/src/components/booking/**
frontend/src/components/layout/**
frontend/src/routes/**
frontend/src/App.*
backend/src/modules/coaches/**
backend/src/modules/bookings/**
backend/src/modules/coach-*/**
backend/src/modules/workout-*/**
backend/src/middleware/**
backend/src/auth/**
backend/src/routes/**
db/migrations/**
docs/**
README*
ROADMAP*
PROJECT_STATUS*
```

Chỉ sửa shared files khi thực sự cần cho route, permission hoặc navigation.

## 2.3. Phạm vi tuyệt đối không được đụng vào

Không được thay đổi logic Marketplace:

```text
backend/src/modules/marketplace-*/**
backend/src/modules/products/**
backend/src/modules/cart/**
backend/src/modules/orders/**
backend/src/modules/refunds/**
backend/src/modules/seller-*/**
backend/src/modules/shops/**
backend/src/modules/brand-requests/**
backend/src/modules/complaints/**
backend/src/modules/reviews/**
backend/src/modules/product-moderation/**
db/migrations/0100_*.sql đến 0111_*.sql
```

Không được thay đổi Product, Cart, Order, Payment, Refund, Settlement, Seller, Marketplace RBAC, Marketplace schema hoặc Marketplace API contract.

Nếu phát hiện lỗi nằm ngoài Coach module:

```text
BLOCKED_OUT_OF_SCOPE
```

Ghi rõ trong báo cáo, không tự sửa.

## 2.4. Ràng buộc thiết kế bắt buộc

### Không được tạo dữ liệu giả

Tuyệt đối không sử dụng:

```typescript
Math.random()
mockCoach
fakeCoach
demoCoach
hardcodedCoach
sampleSlots
fakeReviews
fakeRating
```

Không được hard-code Coach ID, Coach name, price, rating, review, certification hoặc slot.

### Không được tạo code “tạm”

Không được để lại:

```text
TODO: call API later
API call would go here
mock implementation
temporary data
placeholder booking
```

Mọi chức năng được đưa vào UI phải hoạt động thật.

### Không được tạo module trùng

Trước khi tạo file mới phải tìm kiếm existing coach service, booking service, appointments route, DTO, model, migration và dashboard section.

Nếu chức năng đã có thì `EXTEND`, không `RECREATE`.

### Không được tự mở rộng scope

Không thêm:

- Thanh toán cho Coach.
- Commission Coach.
- Payroll Coach.
- Chat realtime.
- Video call.
- Livestream.
- Subscription Coach.
- AI Coach recommendation.
- Waitlist.
- Coach review nâng cao.
- Auto assignment.
- Google Calendar sync.
- Email/SMS integration.
- Push notification.
- Recurring booking.
- Multi-location schedule.
- Dynamic pricing.
- Coupon Coach.
- Coach marketplace.

Chỉ hoàn thiện luồng Coach Appointment cơ bản, an toàn và đủ dùng.

### Không được phá vỡ Workout flow

Không thay đổi các phần sau trừ khi phát hiện bug thật và có bằng chứng test:

```text
WorkoutPrograms
WorkoutProgramDays
WorkoutProgramExercises
CoachProgramAssignments
CoachProgramSchedules
MemberWorkoutSessions
MemberWorkoutSessionExercises
MemberWorkoutSetLogs
Progress calculation
Session snapshot
```

---

# 3. KIẾN TRÚC NGHIỆP VỤ BẮT BUỘC

## 3.1. Coach Appointment

Là buổi hẹn giữa Member và Coach.

Database chính:

```text
Bookings
```

Mục đích:

- Member gửi yêu cầu đặt lịch.
- Coach xác nhận.
- Hai bên theo dõi trạng thái.
- Coach hoàn thành hoặc đánh dấu no-show.
- Member hoặc Coach hủy theo rule.

## 3.2. Workout Schedule

Là lịch tập được Coach giao cho Member.

Database chính:

```text
CoachProgramSchedules
MemberWorkoutSessions
```

Không được dùng một bảng thay cho hai mục đích.

## 3.3. State machine Coach Appointment

State hợp lệ:

```text
PENDING
CONFIRMED
COMPLETED
CANCELLED
NO_SHOW
```

Transition hợp lệ:

```text
PENDING → CONFIRMED
PENDING → CANCELLED
CONFIRMED → COMPLETED
CONFIRMED → CANCELLED
CONFIRMED → NO_SHOW
```

Transition không hợp lệ phải trả lỗi rõ ràng.

## 3.4. Permission matrix

| Action | Guest | Member | Coach | Admin |
|---|---:|---:|---:|---:|
| Xem danh sách Coach | Yes | Yes | Yes | Yes |
| Xem Coach profile | Yes | Yes | Yes | Yes |
| Xem availability | Có thể | Yes | Không bắt buộc | Yes |
| Tạo booking | No | Yes | No | Không bắt buộc |
| Xem booking của chính mình | No | Yes | Yes | Yes |
| Member hủy booking | No | Chính chủ | No | Yes |
| Coach confirm | No | No | Coach sở hữu | Yes |
| Coach complete | No | No | Coach sở hữu | Yes |
| Coach no-show | No | No | Coach sở hữu | Yes |
| Admin xem tất cả | No | No | No | Yes |

Backend là lớp bảo mật chính. Frontend guard chỉ dùng để điều hướng và ẩn action.

## 3.5. Ownership rules

Member chỉ được truy cập:

```text
booking.member_id = authenticatedUser.id
```

Coach chỉ được truy cập:

```text
booking.coach_id = authenticatedUser.id
```

Không để client truyền `member_id` tùy ý khi tạo booking. Backend phải lấy `member_id` từ JWT/session.


## 3.6. Quy ước status theo source hiện tại

Database và backend hiện đang lưu status dạng chữ thường:

```text
pending
confirmed
completed
cancelled
no_show
```

UI có thể hiển thị chữ hoa hoặc tiếng Việt, nhưng API và database phải giữ đúng chữ thường để không phá compatibility.

Không được tự ý migration toàn bộ status sang:

```text
PENDING
CONFIRMED
COMPLETED
CANCELLED
NO_SHOW
```

Nếu tạo TypeScript enum/union, phải map chính xác về giá trị chữ thường.

---

# 4. PLAN — KẾ HOẠCH THỰC HIỆN CHI TIẾT

## PHASE 0 — SAFETY BASELINE

### P0.1. Tạo branch riêng

```bash
git checkout -b fix/coach-booking-complete
```

Không làm trực tiếp trên production branch hoặc Marketplace branch.

### P0.2. Ghi baseline

```bash
git status
git branch --show-current
git rev-parse HEAD
```

Ghi lại branch, start commit, modified files, untracked files và migration hiện tại.

Không reset hoặc xóa thay đổi của người khác.

### P0.3. Build baseline

Chạy đúng script của repository:

```text
Backend build
Frontend typecheck
Frontend build
Existing tests
git diff --check
```

Nếu baseline fail, ghi:

```text
BASELINE_FAILURE
```


### P0.4. Không tạo branch mù

Trước khi tạo branch phải kiểm tra:

```bash
git status --short
git branch --show-current
git rev-parse HEAD
```

Nếu working tree đang có thay đổi của người khác:

- Không reset.
- Không clean.
- Không checkout làm mất file.
- Không stash nếu chưa được yêu cầu.
- Tiếp tục trên branch mới chỉ khi việc checkout an toàn.

Tên branch là gợi ý, không phải bắt buộc nếu agent đang ở branch Coach hợp lệ.

---

## PHASE 1 — AUDIT TOÀN BỘ COACH MODULE

### P1.1. Inventory source

Tìm toàn bộ file có từ khóa:

```text
coach
coaches
booking
bookings
appointment
appointments
schedule
workout
member
availability
```

Phân loại:

```text
REUSE
EXTEND
REPLACE
REMOVE
OUT_OF_SCOPE
```

### P1.2. Audit route

Lập bảng toàn bộ route hiện tại:

```text
/coaches
/coaches/:id
/booking
/dashboard
/coach
/coach/members
/members
/crm
/coach/schedules
```

Xác định component, role, API, data source, route dư, route trùng và route đặt tên sai.

### P1.3. Audit API

Lập bảng:

```text
HTTP method
path
role
request DTO
response DTO
database table
ownership check
status validation
```

Tìm API trùng như:

```text
/api/coaches
/api/bookings/coaches
```

Chọn một contract chuẩn.

### P1.4. Audit database

Kiểm tra:

```text
Users
Bookings
Coach status
Coach assignment
Workout schedule
Indexes
Foreign keys
Existing migrations
```

Không tạo migration trước khi xác định schema hiện có.

### P1.5. Audit fake data

Tìm toàn repository:

```text
Math.random
Coach Mike
Coach Sarah
Coach Emma
Coach Alex
Alex Rivera
Sarah Chen
Marcus Thompson
Emma Rodriguez
NASM Certified
CrossFit Level 1
Booking Confirmed
API call would go here
```

Mọi dữ liệu Coach giả phải được loại bỏ.

---

## PHASE 2 — CHUẨN HÓA PUBLIC COACH API

### P2.1. API contract duy nhất

Ưu tiên:

```http
GET /api/coaches
GET /api/coaches/:coachId
GET /api/coaches/:coachId/availability?date=YYYY-MM-DD
```

Không duy trì hai nguồn danh sách Coach khác nhau.


### P2.1A. Quyết định endpoint canonical theo repository hiện tại

Endpoint canonical bắt buộc cho public Coach:

```http
GET /api/coaches
GET /api/coaches/:coachId
GET /api/coaches/:coachId/availability?date=YYYY-MM-DD
```

Endpoint legacy hiện có:

```http
GET /api/bookings/coaches
GET /api/bookings/coaches/:id/availability
```

Phải thực hiện một trong hai cách an toàn:

1. Chuyển toàn bộ frontend sang `/api/coaches` và để endpoint legacy gọi chung service/query trong thời gian tương thích.
2. Hoặc deprecate endpoint legacy sau khi xác nhận không còn caller.

Không được duy trì hai query/filter/DTO độc lập.

### P2.2. Filter Coach hợp lệ

Danh sách public chỉ trả Coach thỏa:

```sql
role = 'coach'
AND is_active = 1
AND coach_status = 'ACTIVE'
```

Không trả Coach:

```text
PENDING
SUSPENDED
REJECTED
INACTIVE
DELETED
```

### P2.3. Public Coach DTO

```typescript
interface PublicCoachDto {
  id: number;
  name: string;
  avatarUrl: string | null;
  specialty: string | null;
  bio: string | null;
  experienceYears: number | null;
  sessionMode: 'ONLINE' | 'IN_PERSON' | 'BOTH' | null;
  location: string | null;
  bookingEnabled: boolean;
}
```

Không trả password, token, internal status reason, admin notes hoặc dữ liệu Marketplace.

### P2.4. Coach detail

`GET /api/coaches/:id` phải:

- Validate ID.
- Chỉ trả Coach ACTIVE.
- Trả 404 nếu không tồn tại.
- Không rò rỉ Coach suspended.
- Không trả dữ liệu fake.
- Không trả review/rating nếu chưa có hệ thống thật.

---

## PHASE 3 — COACH PROFILE TỐI THIỂU

Chỉ tạo migration nếu schema thật sự thiếu.

Bảng tối thiểu:

```text
CoachProfiles
- id
- coach_id
- specialty
- bio
- experience_years
- session_mode
- location
- booking_enabled
- created_at
- updated_at
```

Ràng buộc:

```text
UNIQUE(coach_id)
FK coach_id → Users.id
experience_years >= 0
booking_enabled default true
```

Không thêm rating, review hoặc price nếu chưa có requirement thật.

Migration phải:

- Có số thứ tự tiếp theo đúng repository.
- Không sửa migration cũ đã chạy.
- Không drop bảng hiện có.
- Không tạo dữ liệu demo.
- Không ảnh hưởng Marketplace.
- Có rollback strategy nếu project hỗ trợ.

Không seed Coach giả.

---

## PHASE 4 — AVAILABILITY

### P4.1. Validation input

Endpoint availability nhận:

```text
coachId
date=YYYY-MM-DD
```

Validate:

- Coach ID hợp lệ.
- Date đúng format.
- Date không nhỏ hơn ngày hiện tại.
- Date không vượt quá 60 hoặc 90 ngày.
- Coach tồn tại.
- Coach ACTIVE.
- `booking_enabled = true`.

### P4.2. Timezone

Business timezone:

```text
Asia/Ho_Chi_Minh
```

Không dùng:

```typescript
new Date().toISOString().split('T')[0]
```

để xác định ngày nghiệp vụ Việt Nam.

Tạo utility dùng chung để parse date, so sánh today và validate past/future.

### P4.3. Duration MVP

Mỗi appointment:

```text
60 phút
```

Frontend gửi:

```text
coachId
date
startTime
note
```

Backend tự tính `endTime`.

### P4.4. Slot generation

Nếu chưa có availability table, dùng MVP business hours cố định trong backend constant, không hard-code rải rác.

Không tạo weekly availability phức tạp nếu chưa có requirement.

### P4.5. Conflict detection

Conflict khi:

```sql
existing.start_time < requested.end_time
AND existing.end_time > requested.start_time
```

Kiểm tra cả:

```text
Coach overlap
Member overlap
```

Chỉ xét booking giữ slot:

```text
PENDING
CONFIRMED
```

### P4.6. Concurrency

Phải chống hai request tạo cùng slot cùng lúc bằng transaction, isolation, database constraint hoặc atomic conflict check phù hợp stack.

Không chỉ kiểm tra frontend.


### P4.7. Giữ và đánh giá unique index hiện có

Repository đã có filtered unique index:

```sql
UX_Bookings_ActiveSlot
ON dbo.Bookings(coach_id, booking_date, start_time)
WHERE status IN (N'pending', N'confirmed')
```

Không được tạo lại index cùng tên và không được xóa nó nếu chưa có lý do.

Index này chỉ chặn cùng `start_time`; nó không chặn interval overlap. Vì vậy:

- Giữ index để chống duplicate exact slot.
- Bổ sung transaction/locking cho overlap.
- Kiểm tra migration idempotent.
- Không tạo index trùng gây lỗi khi chạy migration lại.

---

## PHASE 5 — CREATE BOOKING

### P5.1. Endpoint

```http
POST /api/bookings
```

Role:

```text
MEMBER only
```

Payload:

```typescript
interface CreateBookingRequest {
  coachId: number;
  date: string;
  startTime: string;
  note?: string;
}
```

Không nhận `memberId`, `status`, `endTime`, `createdBy`.

### P5.2. Validation

Kiểm tra:

- User là Member.
- Coach hợp lệ và ACTIVE.
- Booking enabled.
- Date/slot hợp lệ.
- Không trong quá khứ.
- Không conflict.
- Note tối đa 500 ký tự.
- Note được trim.
- Không chấp nhận status từ client.

### P5.3. Initial status

Booking mới luôn:

```text
PENDING
```

### P5.4. Response

Trả booking thật vừa lưu. Không trả “Booking Confirmed” khi status là `PENDING`.


### P5.5. Compatibility với payload cũ

Backend hiện nhận:

```text
coach_id
booking_date
start_time
end_time
notes
```

Mục tiêu mới có thể chuyển sang backend tự tính `end_time = start_time + 60 phút`, nhưng phải:

- Tìm toàn bộ caller cũ.
- Cập nhật frontend và acceptance scripts liên quan.
- Không để test auth/RBAC hoặc integration cũ bị hỏng vì payload đổi.
- Nếu cần backward compatibility ngắn hạn, có thể chấp nhận `end_time` nhưng phải verify đúng 60 phút và không tin giá trị client.
- Không giữ hai business rule duration khác nhau.

---

## PHASE 6 — MEMBER APPOINTMENTS

### P6.1. Route

Tạo:

```text
/appointments
/appointments/:bookingId
```

`/booking` chỉ redirect về `/coaches` hoặc route chọn Coach để giữ backward compatibility.

### P6.2. Member appointments page

Hiển thị:

- Coach avatar.
- Coach name.
- Date.
- Start time.
- End time.
- Status.
- Note.
- Created time.
- Cancel action hợp lệ.

Tabs:

```text
Upcoming: PENDING, CONFIRMED
History: COMPLETED, CANCELLED, NO_SHOW
```

### P6.3. Cancellation

Member chỉ hủy booking của chính mình.

Cho phép:

```text
PENDING
CONFIRMED
```

Không cho:

```text
COMPLETED
CANCELLED
NO_SHOW
```

### P6.4. Member Dashboard

Dashboard chỉ hiển thị summary:

- Booking sắp tới.
- Số booking pending.
- Nút “Tìm Coach”.
- Nút “Xem lịch hẹn”.

Không nhúng booking wizard vào Dashboard.

---

## PHASE 7 — PUBLIC COACH UI

### P7.1. `/coaches`

Trang phải:

- Gọi API thật.
- Có loading, empty, error, retry.
- Không dùng mock/random.
- Chỉ hiển thị Coach ACTIVE.
- Có nút xem profile.
- Có nút đặt lịch.

### P7.2. `/coaches/:coachId`

Không hiển thị fake rating, review, certificate, price, result metric, free consultation hoặc waitlist.

Nút đặt lịch:

- Guest: redirect login và giữ returnUrl.
- Member: mở booking flow cho Coach hiện tại.
- Coach/Admin/Seller: không hiển thị action tạo booking.

### P7.3. Booking wizard

```text
Step 1: Coach
Step 2: Date
Step 3: Available slot
Step 4: Note
Step 5: Review
Step 6: Submit
```

Yêu cầu:

- Fetch slot khi chọn ngày.
- Reset slot khi đổi ngày.
- Disable submit khi thiếu dữ liệu.
- Chặn double submit.
- Hiển thị lỗi 409 rõ ràng.
- Không optimistic-confirm sai.
- Thành công redirect `/appointments`.

### P7.4. Landing page

Coach section phải dùng cùng Coach API, không hard-code và không fallback bằng Coach giả.

---

## PHASE 8 — COACH APPOINTMENT MANAGEMENT

### P8.1. Route

```text
/coach/appointments
/coach/appointments/:bookingId
```

Không dùng `/booking` cho Coach.

### P8.2. Trang Coach appointments

Hiển thị:

```text
Pending requests
Confirmed upcoming
History
```

Action:

```text
Confirm
Cancel
Complete
Mark No-show
```

Action chỉ xuất hiện đúng state.

### P8.3. Ownership

Mọi API Coach thao tác booking phải kiểm tra:

```text
booking.coach_id = authenticatedCoach.id
```

### P8.4. Validation theo thời gian

- Confirm: chỉ `PENDING`, chưa quá hạn.
- Complete: chỉ `CONFIRMED`, đã đến giờ.
- No-show: chỉ `CONFIRMED`, đã qua giờ.
- Cancel: chỉ `PENDING` hoặc `CONFIRMED`.

### P8.5. Coach Dashboard

Thêm widget riêng:

```text
Pending appointment requests
Today's appointments
Upcoming appointments
```

Không trộn với Workout schedules, Assigned members hoặc Workout progress.

---

## PHASE 9 — ROUTE, MENU VÀ WORDING

Dùng thuật ngữ:

```text
Lịch hẹn Coach
Đặt lịch Coach
Lịch hẹn của tôi
Lịch hẹn học viên
Lịch workout
Buổi tập của tôi
Lịch tập học viên
```

Không dùng chung “Lịch tập” cho booking và workout.

Role access:

```text
Guest:
/coaches
/coaches/:id

Member:
/coaches
/coaches/:id
/coaches/:id/book
/appointments
/dashboard
/workouts
/progress

Coach:
/coach
/coach/appointments
/coach/members
/coach/programs
/coach/schedules
/coach/progress
```

Sửa access policy để `/booking` không còn cho Coach/Admin truy cập như Member.

Audit và xử lý route trùng:

```text
/coach/members
/members
/crm
/dashboard
/coach
```

Ưu tiên `/coach/members` là trang chính. Không xóa route của role khác khi chưa audit.

---

## PHASE 10 — FRONTEND API LAYER

Tất cả Coach/Booking API phải dùng shared client hiện có.

Không hard-code URL localhost.

Service functions tối thiểu:

```typescript
listPublicCoaches()
getPublicCoach(coachId)
getCoachAvailability(coachId, date)
createBooking(payload)
getMyBookings(params?)
getBookingById(id)
cancelMyBooking(id)
getCoachAppointments(params?)
confirmBooking(id)
cancelCoachBooking(id)
completeBooking(id)
markBookingNoShow(id)
```

Khai báo type rõ ràng, không dùng `any` tùy tiện.

Xử lý đúng:

```text
400 Validation
401 Unauthenticated
403 Forbidden
404 Not found
409 Conflict
500 Server error
```

---

## PHASE 11 — BACKEND HARDENING

- Mọi route khai báo role rõ.
- Dùng validation library hiện tại.
- Dùng parameterized query hoặc ORM.
- Dùng transaction khi cần.
- Dùng error format chung.
- Không client-controlled memberId.
- Không client-controlled status.
- Không leak PII.
- Không Seller access booking.
- Không Coach access booking Coach khác.

---

## PHASE 12 — TESTING

### Unit tests

- Date validation.
- Time validation.
- Overlap logic.
- State transition.
- Coach status filter.
- Note validation.
- Timezone helper.

### API integration tests

Public Coach:

- Guest thấy Coach ACTIVE.
- Suspended/Inactive không xuất hiện.
- Coach detail suspended trả 404.

Member booking:

- Member tạo booking PASS.
- Coach/Admin/Seller tạo booking FAIL theo policy.
- Booking ban đầu PENDING.
- Past slot FAIL.
- Duplicate slot FAIL.
- Coach overlap FAIL.
- Member overlap FAIL.
- Note > 500 FAIL.

Ownership:

- Member A không xem/hủy booking Member B.
- Coach A không xem/confirm/complete booking Coach B.

State machine:

- PENDING → CONFIRMED PASS.
- PENDING → COMPLETED FAIL.
- CONFIRMED → COMPLETED PASS khi đến giờ.
- CONFIRMED → NO_SHOW PASS khi quá giờ.
- COMPLETED → CANCELLED FAIL.
- CANCELLED → CONFIRMED FAIL.

Concurrency:

```text
Hai request cùng slot:
- Một PASS
- Một 409
```

### Browser acceptance

Guest:

```text
/coaches
→ coach detail
→ đặt lịch
→ login
```

Member:

```text
login
→ /coaches
→ chọn Coach
→ chọn date/slot
→ submit
→ /appointments
→ thấy PENDING
```

Coach:

```text
login
→ /coach/appointments
→ confirm
→ status CONFIRMED
```

Workout regression:

```text
Programs PASS
Assignments PASS
Schedules PASS
Sessions PASS
Set Logs PASS
Progress PASS
```

---


## PHASE 12A — LỆNH KIỂM TRA PHÙ HỢP REPOSITORY

Backend có script:

```bash
cd backend
npm run build
npm run lint
npm run acceptance:coach-role
npm run acceptance:coach-member-e2e
npm run acceptance:admin-coach
```

Phải bổ sung một acceptance script mới cho Coach Appointment, ví dụ:

```bash
npm run acceptance:coach-booking
```

Frontend hiện không có script `typecheck` riêng. Dùng:

```bash
cd frontend
npx tsc --noEmit
npm run build
```

Không được báo `Frontend typecheck PASS` nếu chỉ chạy `vite build`.

Nếu môi trường không chạy được build vì `node_modules` sai nền tảng:

- Xóa và cài lại dependency trong môi trường kiểm tra bằng lockfile.
- Không commit `node_modules`.
- Không lấy lỗi binary Windows/Linux làm kết luận code FAIL.

---

## PHASE 13 — UI/UX

- Tái sử dụng design system hiện có.
- Không tạo design system mới.
- Có label, keyboard navigation, focus, disabled state, error rõ ràng.
- Responsive mobile/tablet/desktop.
- Không trộn ngôn ngữ.
- Status tiếng Việt rõ ràng.

---

## PHASE 14 — CLEANUP

Xóa:

```text
Unused state
Unused import
Hard-coded Coach list
Fake review
Fake rating
Fake certifications
Fake slots
Dead modal
Duplicate service
Unused route
Comment “API call later”
```

Không commit:

```text
*.bak
*.old
*.tmp
node_modules
.env
secret
debug logs
```

Chỉ format các file đã sửa.

---

## PHASE 15 — DOCUMENTATION

Cập nhật:

```text
README
ROADMAP
PROJECT_STATUS
Coach module docs
API docs
Route docs
Migration docs
```

Ghi rõ:

- Public Coach routes.
- Member appointment routes.
- Coach appointment routes.
- API.
- Status machine.
- Permission.
- Timezone.
- Duration.
- Known limitations.
- Workout flow hiện có.

Không ghi `FULL_COACH_MODULE_COMPLETE` nếu browser acceptance chưa PASS.

---

# 5. EVALUATE — TIÊU CHÍ ĐÁNH GIÁ

## Functional

- Public Coach dùng dữ liệu thật.
- Coach names đồng nhất.
- Member đặt booking thật.
- Booking lưu database.
- Coach xử lý booking.
- Member xem booking.
- Suspended Coach bị chặn.
- Workout flow không bị ảnh hưởng.

## Security

- Không IDOR.
- Không privilege escalation.
- Không client-controlled memberId/status.
- Không SQL injection.
- Không leak PII.
- Không Seller access booking.
- Không Coach access booking khác.

## Data integrity

- Không duplicate.
- Không overlap.
- State transition hợp lệ.
- Timezone đúng.
- Không fake/random data.

## Maintainability

- Một nguồn API Coach.
- Một source of truth cho status.
- Shared DTO.
- Shared date utility.
- Shared API client.
- Không duplicate component.
- Không hard-code URL.
- Không dead code.

## Performance

- Không N+1.
- Pagination khi cần.
- Index hợp lý.
- Không fetch lặp.
- Không migration/index dư.

---

# 6. DEFINITION OF DONE

Chỉ được kết luận hoàn thành khi:

- [ ] `/coaches` dùng database thật.
- [ ] `/coaches/:id` dùng database thật.
- [ ] Landing page không hard-code Coach.
- [ ] `/booking` demo đã bị xóa hoặc redirect.
- [ ] Không còn `Math.random()` trong Coach data.
- [ ] Không còn Coach hard-code.
- [ ] Coach suspended/inactive không xuất hiện.
- [ ] Member tạo booking thật.
- [ ] Booking tạo với `PENDING`.
- [ ] Member có `/appointments`.
- [ ] Coach có `/coach/appointments`.
- [ ] Coach xử lý state đúng rule.
- [ ] Coach overlap bị chặn.
- [ ] Member overlap bị chặn.
- [ ] Concurrent duplicate bị chặn.
- [ ] Timezone Việt Nam đúng.
- [ ] Booking và Workout Schedule tách biệt.
- [ ] Sidebar/route không gây nhầm.
- [ ] Coach không dùng booking flow Member.
- [ ] Seller không truy cập booking.
- [ ] IDOR tests PASS.
- [ ] State machine tests PASS.
- [ ] Backend build PASS.
- [ ] Frontend typecheck PASS.
- [ ] Frontend production build PASS.
- [ ] Existing Workout tests PASS.
- [ ] Browser Guest PASS.
- [ ] Browser Member PASS.
- [ ] Browser Coach PASS.
- [ ] Responsive PASS.
- [ ] Documentation cập nhật.
- [ ] Không có file rác/code demo.
- [ ] `git diff --check` PASS.

- [ ] Status database/API vẫn dùng `pending|confirmed|completed|cancelled|no_show`.
- [ ] `/api/coaches` là source of truth; endpoint booking legacy không còn query riêng.
- [ ] `UX_Bookings_ActiveSlot` không bị tạo trùng hoặc phá bỏ vô lý.
- [ ] Acceptance scripts cũ sử dụng booking payload đã được cập nhật hoặc giữ compatibility.
- [ ] `npx tsc --noEmit` PASS ở frontend.

---


# 6.1. CÁC ĐIỂM NGUY HIỂM CODEX PHẢI TRÁNH

1. Không đổi status database sang uppercase.
2. Không tạo bảng `Appointments` mới nếu `Bookings` đã đáp ứng.
3. Không tạo `CoachProfiles` trước khi kiểm tra có thể mở rộng `Users` hoặc bảng profile hiện hữu.
4. Không xóa endpoint legacy trước khi tìm caller.
5. Không chỉ dùng unique index để tuyên bố đã chống overlap.
6. Không cho frontend gửi `member_id`.
7. Không cho frontend quyết định `status`.
8. Không hiển thị `confirmed` ngay sau POST.
9. Không xem booking hoàn tất là Coach–Member assignment.
10. Không gộp `/coach/appointments` với `/coach/schedules`.
11. Không sửa acceptance Marketplace.
12. Không chạy migration trên database thật khi chưa backup/xác nhận môi trường.
13. Không commit ZIP, `.git`, `node_modules`, `.env` hoặc dữ liệu acceptance.
14. Không dùng email/phone Coach trong public DTO nếu UI không cần.
15. Không trả mảng rỗng im lặng khi API lỗi; frontend phải phân biệt empty và error.

---

# 7. OUTPUT BẮT BUỘC CỦA CODING AGENT

```text
FINAL VERDICT:
- FULL_COACH_MODULE_COMPLETE
hoặc
- PARTIAL_COACH_MODULE_COMPLETE
hoặc
- COACH_MODULE_BLOCKED
```

Báo cáo bắt buộc:

```text
BRANCH:
START COMMIT:
END COMMIT:

1. Root causes
2. Files changed
3. Database migration
4. Backend changes
5. Frontend changes
6. Route/menu changes
7. Security fixes
8. Tests added
9. Tests executed
10. Known limitations
11. Out-of-scope blockers
```

Build results:

```text
Backend build:
Frontend typecheck:
Frontend build:
Unit tests:
Integration tests:
Browser acceptance:
git diff --check:
```

Migration:

```text
Migration file:
Migration order:
Tables added:
Columns added:
Indexes added:
Rollback notes:
```

API:

```text
METHOD
PATH
ROLE
PURPOSE
```

Phải đưa command đã chạy và kết quả PASS/FAIL. Không ghi PASS nếu chưa chạy thật.

---

# 8. QUY TẮC THỰC THI CUỐI CÙNG

1. Đọc toàn bộ source trước khi sửa.
2. Không đoán schema.
3. Không hard-code dữ liệu.
4. Không tạo mock.
5. Không mở rộng scope.
6. Không sửa Marketplace.
7. Không tự động assignment từ booking.
8. Không trộn appointment với workout schedule.
9. Không sửa migration cũ đã chạy.
10. Không tạo module trùng.
11. Không đổi API contract không cần thiết.
12. Không đổi auth architecture.
13. Không đổi role enum tùy tiện.
14. Không xóa dữ liệu thật.
15. Không seed Coach giả.
16. Không bỏ qua suspended Coach.
17. Không chỉ sửa frontend.
18. Không chỉ sửa backend.
19. Không báo thành công khi chưa lưu database.
20. Không báo hoàn thành khi chưa test.
21. Ưu tiên thay đổi nhỏ, rõ, có thể kiểm thử.
22. Mỗi phase phải build/test trước khi sang phase sau.
23. Lỗi ngoài phạm vi ghi `BLOCKED_OUT_OF_SCOPE`.
24. Existing architecture phù hợp thì phải tái sử dụng.
25. Không được bỏ qua P0/P1.

---

# 9. PROMPT KHỞI CHẠY CHO CODEX APP

```text
Hãy mở và đọc toàn bộ file `GYMFIT_COACH_COMPLETE_IMPLEMENTATION_PLAN.md` trong repository, sau đó thực hiện đầy đủ từng phase theo đúng thứ tự.

Yêu cầu bắt buộc:
- Rà soát source hiện tại trước khi sửa.
- Không bỏ qua bất kỳ P0/P1 nào.
- Không tạo mock, hard-code hoặc dữ liệu random.
- Không thay đổi Marketplace backend/database.
- Không mở rộng ngoài phạm vi Coach Appointment và Coach Workout hiện có.
- Tách tuyệt đối Coach Appointment khỏi Workout Schedule.
- Chỉ tái sử dụng hoặc mở rộng code hiện có, không tạo module trùng.
- Build và test sau từng phase.
- Không ghi PASS nếu chưa chạy thật.
- Cuối cùng trả báo cáo đúng format trong phần “OUTPUT BẮT BUỘC CỦA CODING AGENT”.
```

---

# 10. VERDICT MỤC TIÊU

Chỉ được dùng:

```text
FULL_COACH_MODULE_COMPLETE
```

khi:

```text
Coach Appointment E2E = PASS
Coach Workout E2E = PASS
Security = PASS
Build = PASS
Browser Acceptance = PASS
Documentation = UPDATED
```

Nếu chưa đạt một trong các mục trên:

```text
PARTIAL_COACH_MODULE_COMPLETE
```

và phải liệt kê chính xác blocker còn lại.
