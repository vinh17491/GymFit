# GYMFIT — FINAL COACH 100/100 COMPLETION PROMPT

> **Repository:** `vinh17491/GymFit`
>
> **Target branch:** `coach`
>
> **Verified latest implementation commit before this task:** `47417e26452cf4646ed51ec03a2891410e304823`
>
> **Current verdict:** `PARTIAL_COACH_MODULE_COMPLETE`
>
> **Target verdict:** `FULL_COACH_MODULE_COMPLETE`
>
> **Primary goal:** Hoàn thiện toàn bộ Coach Appointment + Coach Profile + Coach Workspace + Member Workout liên quan trực tiếp để đạt mức hoàn chỉnh 100/100 theo tiêu chuẩn functional, security, data integrity, UI/UX, maintainability, migration, runtime acceptance và browser acceptance.
>
> **Strict scope:** Không sửa Marketplace, Seller, Product, Cart, Order, Payment, Refund, Settlement, Review, Complaint hoặc các module không liên quan trực tiếp đến Coach.

---

# 1. STATE — HIỆN TRẠNG ĐÃ XÁC MINH

## 1.1. Những phần đã hoạt động theo source

Source hiện đã có:

```text
GET /api/coaches
GET /api/coaches/:id
GET /api/coaches/:id/availability
POST /api/bookings
GET /api/bookings
GET /api/bookings/:id
PUT /api/bookings/:id/status
```

Frontend đã có:

```text
/coaches
/coaches/:id
/coaches/:id/book
/appointments
/appointments/:bookingId
/coach/appointments
/coach/appointments/:bookingId
```

Luồng hiện tại:

```text
Guest xem Coach
→ Member đăng nhập
→ Chọn Coach
→ Chọn ngày
→ Chọn slot
→ POST booking thật
→ booking pending
→ Member xem /appointments
→ Coach xem /coach/appointments
→ Coach confirm / cancel / complete / no_show
```

Backend đã có:

- Source Coach canonical.
- Filter Coach ACTIVE.
- Chặn Coach suspended/inactive.
- Member identity lấy từ JWT.
- Booking cố định 60 phút.
- Timezone `Asia/Ho_Chi_Minh`.
- Transaction `SERIALIZABLE`.
- `UPDLOCK` + `HOLDLOCK`.
- Coach overlap check.
- Member overlap check.
- Exact duplicate protection.
- State machine.
- Member ownership.
- Coach ownership.
- IDOR protection theo source.
- Compatibility payload cũ.
- Unit test Coach Booking.
- Acceptance script Coach Booking.

## 1.2. Những điểm chưa đạt 100/100

Các blocker bắt buộc phải xử lý:

### P0

1. Migration `0010_coach_profiles.sql` đang pending trong tài liệu.
2. `acceptance:coach-booking` chưa có bằng chứng runtime PASS.
3. Browser acceptance chưa chạy.
4. Booking API đang có nguy cơ trả raw SQL `DATE` và `TIME`, trong khi frontend gọi `.slice()`.
5. Chưa có bằng chứng migration clean trên isolated database.
6. Chưa có bằng chứng regression toàn Coach Workout sau thay đổi Booking.

### P1

7. Coach action lỗi không hiển thị rõ trên UI.
8. Member cancel lỗi có thể bị throw im lặng.
9. Chưa có trang Coach tự quản lý Public Profile.
10. Chưa có API Coach self-profile.
11. Chưa có luồng bật/tắt `booking_enabled` từ Coach.
12. Sidebar Coach còn route trùng:
    - `/coach/members`
    - `/members`
    - `/crm`
    - `/coach`
    - `/dashboard`
13. Public Coach list chỉ lấy page mặc định nhưng search/sort client-side.
14. Landing page chỉ load default page rồi slice.
15. Background Order Expiration Runner chưa loại trừ Coach Booking acceptance.
16. Coach appointment detail chỉ read-only, không có action.
17. Dashboard dùng `Promise.all`, một API fail có thể làm cả widget thất bại.
18. UI còn trộn tiếng Việt và tiếng Anh.
19. Documentation đang ghi branch cũ `coach1`.
20. Chưa có evidence bundle cuối cùng đủ để tuyên bố `FULL_COACH_MODULE_COMPLETE`.

---

# 2. TAILOR — STACK VÀ RÀNG BUỘC REPOSITORY

## 2.1. Stack hiện tại

```text
Frontend: React + Vite + TypeScript
Backend: Express + TypeScript
Database: SQL Server
Driver: mssql
Validation: Zod
Authentication: JWT/session architecture hiện có
Frontend API client: frontend/src/api/axios.ts
Backend API prefix: /api
Business timezone: Asia/Ho_Chi_Minh
```

Không được:

- Đổi framework.
- Đổi database.
- ORM hóa lại backend.
- Đổi auth architecture.
- Đổi role model.
- Tạo microservice mới.
- Tạo table `Appointments` mới.
- Gộp Booking với Workout Schedule.
- Tự động biến Booking thành Coach–Member Assignment.

## 2.2. Phạm vi được phép sửa

Ưu tiên chỉ sửa:

```text
backend/src/modules/bookings/**
backend/src/modules/coaches/**
backend/src/modules/coach-workspace/**
backend/src/utils/coachBooking.ts
backend/src/utils/timezone.ts
backend/src/app.ts
backend/src/scripts/coach-booking-*.ts
backend/package.json

frontend/src/pages/coaches/**
frontend/src/pages/booking/**
frontend/src/pages/appointments/**
frontend/src/pages/dashboard/**
frontend/src/services/coaches.ts
frontend/src/services/bookings.ts
frontend/src/auth/accessPolicy.ts
frontend/src/components/layout/Sidebar.tsx
frontend/src/utils/coachBooking.ts
frontend/src/App.tsx

db/migrations/0010_coach_profiles.sql
db/schema.sql

README.md
ROADMAP.md
PROJECT_STATUS.md
docs/coach/**
docs/API_AND_AUTHORIZATION.md
docs/DATABASE_AND_MIGRATIONS.md
docs/DEVELOPER_WORKFLOW.md
```

Chỉ sửa shared file khi có lý do trực tiếp, có diff nhỏ và có regression test.

## 2.3. Phạm vi tuyệt đối không được sửa

```text
backend/src/modules/marketplace-*/**
backend/src/modules/seller-*/**
backend/src/modules/products/**
backend/src/modules/cart/**
backend/src/modules/orders/**
backend/src/modules/refunds/**
backend/src/modules/reviews/**
backend/src/modules/complaints/**
backend/src/modules/shops/**
backend/src/modules/brand-requests/**
backend/src/modules/product-moderation/**
db/migrations/0100_*.sql đến 0111_*.sql
docs/marketplace/**
```

Nếu phát hiện lỗi ngoài Coach:

```text
BLOCKED_OUT_OF_SCOPE
```

Không tự sửa.

---

# 3. EVALUATE — TIÊU CHUẨN 100/100

Chỉ được kết luận hoàn thành khi tất cả nhóm dưới đây PASS.

## 3.1. Functional

- Public Coach list dùng dữ liệu thật.
- Coach detail dùng dữ liệu thật.
- Landing page dùng Coach API canonical.
- Member đặt lịch thật.
- Booking lưu database.
- Booking tạo ở `pending`.
- Member xem và hủy lịch của mình.
- Coach xem lịch học viên.
- Coach confirm, cancel, complete, no-show.
- Coach Profile có thể được Coach tự cập nhật.
- Coach bật/tắt booking.
- Appointment tách Workout Schedule.
- Dashboard chỉ hiển thị summary, không chứa booking wizard.
- Không còn route demo `/booking`.

## 3.2. Security

- Guest không tạo booking.
- Coach không tạo Member booking.
- Admin không tạo Member booking trừ khi policy hiện tại yêu cầu.
- Seller không truy cập booking.
- Member A không xem booking Member B.
- Member A không hủy booking Member B.
- Coach A không xem booking Coach B.
- Coach A không đổi trạng thái booking Coach B.
- Client không truyền được `member_id`.
- Client không quyết định status ban đầu.
- Public DTO không leak email, phone, password, token, internal notes.
- Coach chỉ update profile của chính mình.
- Admin policy giữ nguyên.

## 3.3. Data integrity

- Exact duplicate bị chặn.
- Coach overlap bị chặn.
- Member overlap bị chặn.
- Concurrent same-slot chỉ một request thành công.
- Duration cố định 60 phút.
- Status giữ lowercase:
  ```text
  pending
  confirmed
  completed
  cancelled
  no_show
  ```
- State machine đúng.
- Booking response date/time được normalize.
- Migration idempotent.
- Không duplicate index.
- Không sửa migration cũ đã apply.

## 3.4. UI/UX

- Loading state.
- Empty state.
- Error state.
- Retry.
- Action error hiển thị rõ.
- Double-submit bị chặn.
- Complete/no-show button không cho thao tác sai thời gian.
- Confirm dialog cho cancel.
- Responsive:
  - `375x812`
  - `768x1024`
  - `1440x900`
- Keyboard navigation.
- Focus state.
- Disabled state.
- Label input.
- UI thống nhất tiếng Việt.
- Không còn route/menu trùng gây rối.

## 3.5. Maintainability

- `/api/coaches` là source of truth.
- Endpoint legacy chỉ delegate service/controller chung.
- Có `mapBooking`.
- Có type DTO rõ.
- Có error helper dùng chung nếu cần.
- Không hard-code URL.
- Không `any` tùy tiện.
- Không duplicate service.
- Không duplicate route.
- Không dead code.
- Không TODO.
- Không fake data.
- Không random data.

## 3.6. Verification

- Migration PASS.
- Backend build PASS.
- Backend lint PASS.
- Frontend TypeScript PASS.
- Frontend build PASS.
- Unit PASS.
- Coach Booking acceptance PASS.
- Coach Role acceptance PASS.
- Coach Member E2E PASS.
- Admin Coach acceptance PASS.
- Browser acceptance PASS.
- `git diff --check` PASS.
- Không có untracked artifact rác.

---

# 4. PLAN — THỨ TỰ TRIỂN KHAI BẮT BUỘC

---

## PHASE 0 — BASELINE SAFETY

### P0.1. Xác nhận branch và commit

Chạy:

```bash
git status --short
git branch --show-current
git rev-parse HEAD
git log -1 --oneline
```

Kỳ vọng branch:

```text
coach
```

Ghi:

```text
START_BRANCH
START_COMMIT
DIRTY_FILES
UNTRACKED_FILES
```

Không:

```text
git reset --hard
git clean -fd
git stash
git checkout -- .
```

nếu chưa xác nhận an toàn.

### P0.2. Baseline build

Backend:

```bash
cd backend
npm ci
npm run build
npm run lint
npm run test:coach-booking-unit
```

Frontend:

```bash
cd frontend
npm ci
npx tsc --noEmit
npm run build
```

Root:

```bash
git diff --check
```

Nếu baseline lỗi, ghi rõ:

```text
BASELINE_FAILURE
```

Không đổ lỗi cho code mới nếu lỗi đã tồn tại trước.

---

## PHASE 1 — NORMALIZE BOOKING DTO

### P1.1. Tạo mapper duy nhất

Trong Booking module, tạo mapper:

```typescript
interface BookingDto {
  id: number;
  coach_id: number;
  member_id: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  member_name?: string;
  coach_name?: string;
  coach_avatar_url?: string | null;
}
```

Mapper:

```typescript
function mapBooking(row: BookingRow): BookingDto {
  return {
    id: Number(row.id),
    coach_id: Number(row.coach_id),
    member_id: Number(row.member_id),
    booking_date: dbDateToString(row.booking_date),
    start_time: normalizeSqlTime(row.start_time),
    end_time: normalizeSqlTime(row.end_time),
    status: row.status,
    notes: row.notes ?? null,
    created_at: normalizeDateTime(row.created_at),
    updated_at: normalizeDateTime(row.updated_at),
    member_name: row.member_name,
    coach_name: row.coach_name,
    coach_avatar_url: row.coach_avatar_url ?? null,
  };
}
```

Không trả raw SQL row.

### P1.2. Áp dụng mapper

Bắt buộc dùng mapper cho:

- Create booking.
- List bookings.
- Booking detail.
- Update status.
- Admin list nếu dùng cùng Booking DTO.

### P1.3. Test mapper

Thêm unit test cho:

- SQL TIME dạng string.
- SQL TIME dạng number nếu driver trả number.
- SQL DATE dạng Date.
- SQL DATE dạng string.
- Invalid time không được tạo dữ liệu sai im lặng.

Nếu `normalizeSqlTime` chưa xử lý đúng output thực tế của `mssql`, sửa utility dựa trên runtime test.

---

## PHASE 2 — MIGRATION 0010 COMPLETION

### P2.1. Audit migration

Kiểm tra:

```text
0010_coach_profiles.sql
db/schema.sql
SchemaMigrations
```

Migration phải:

- Additive.
- Idempotent theo convention.
- Không drop data.
- Không duplicate constraint.
- Không duplicate index.
- FK đúng `Users(id)`.
- Unique đúng `coach_id`.
- Không tạo profile giả.

### P2.2. Isolated database

Tạo database test riêng:

```text
GYMFIT_DB_COACH_BOOKING_ACCEPTANCE_<timestamp>
```

Không chạy migration test trên database production.

### P2.3. Apply và verify

Chạy:

```bash
npm run db:migrate:status
npm run db:migrate
npm run db:migrate:status
```

Kỳ vọng:

```text
0010 applied
0 pending
0 checksum mismatches
CoachProfiles exists
```

Kiểm tra:

```sql
SELECT OBJECT_ID(N'dbo.CoachProfiles', N'U');
SELECT * FROM dbo.SchemaMigrations WHERE version = '0010';
```

### P2.4. Clean install evidence

Nếu project clean install đang bị Marketplace migration `0100` block:

- Không sửa `0100`.
- Dùng database có foundation hợp lệ hoặc isolated clone đúng quy trình.
- Ghi:
  ```text
  FULL_PROJECT_CLEAN_INSTALL_BLOCKED_BY_MARKETPLACE_MIGRATION_0100
  ```
- Coach migration vẫn phải được chứng minh apply được trên môi trường Coach-approved.

---

## PHASE 3 — COACH SELF PROFILE

### P3.1. Backend API

Tạo hoặc mở rộng Coach Workspace:

```http
GET /api/coach/profile
PATCH /api/coach/profile
```

Role:

```text
COACH only
```

Không dùng ID từ client.

Backend lấy Coach ID từ JWT:

```typescript
const coachId = req.user!.userId;
```

### P3.2. DTO update

Cho phép cập nhật:

```typescript
interface UpdateCoachProfileRequest {
  specialty?: string | null;
  bio?: string | null;
  experienceYears?: number | null;
  sessionMode?: 'ONLINE' | 'IN_PERSON' | 'BOTH' | null;
  location?: string | null;
  bookingEnabled?: boolean;
}
```

Validation:

```text
specialty max 200
bio max 2000
experienceYears integer 0..80
location max 255
sessionMode enum
bookingEnabled boolean
```

Trim string.

Empty string chuyển `null` theo convention.

### P3.3. Upsert an toàn

Nếu profile chưa tồn tại:

```text
INSERT
```

Nếu đã tồn tại:

```text
UPDATE
```

Dùng transaction hoặc atomic upsert phù hợp SQL Server.

Không cho Coach update:

- Coach status.
- Role.
- Email.
- Phone.
- Password.
- Admin fields.
- Rating.
- Review.
- Salary.

### P3.4. Frontend route

Tạo:

```text
/coach/profile
```

Trang có:

- Specialty.
- Bio.
- Experience years.
- Session mode.
- Location.
- Booking enabled toggle.
- Save.
- Loading.
- Error.
- Success.
- Dirty form warning nếu project có pattern.

### P3.5. Navigation

Thêm:

```text
Hồ sơ Coach
```

vào Coach Sidebar.

Không trộn với `/settings`.

---

## PHASE 4 — MEMBER ACTION ERROR UX

### P4.1. AppointmentsPage

Member cancel phải:

- Có confirm dialog.
- Có loading riêng trên booking.
- Có catch.
- Hiển thị API message.
- Không reload list nếu cancel fail.
- Nếu success, update local state hoặc reload an toàn.
- Không throw unhandled Promise.

### P4.2. AppointmentDetailPage

- Có action loading.
- Có error banner.
- Có status tiếng Việt.
- Có date format Việt Nam.
- Có retry.
- Chặn double click.

---

## PHASE 5 — COACH ACTION ERROR UX

### P5.1. CoachAppointmentsPage

Mỗi action:

```text
Confirm
Cancel
Complete
No-show
```

phải:

- Catch lỗi.
- Hiển thị error.
- Disable trong lúc request.
- Không reload khi fail.
- Update state khi success.
- Confirm dialog cho cancel/no-show nếu cần.

### P5.2. Time-aware buttons

Frontend chỉ ẩn/disable để UX tốt, backend vẫn authoritative.

```text
Confirm:
pending + future

Complete:
confirmed + start time <= now

No-show:
confirmed + end time <= now

Cancel:
pending hoặc confirmed
```

Dùng timezone helper `Asia/Ho_Chi_Minh`.

Không dùng UTC date split.

### P5.3. Coach Appointment Detail

Thêm action phù hợp status ngay trên:

```text
/coach/appointments/:bookingId
```

Không bắt Coach quay lại list để thao tác.

---

## PHASE 6 — PAGINATION VÀ SEARCH ĐÚNG

### P6.1. Service return pagination

Sửa:

```typescript
listPublicCoaches()
```

trả:

```typescript
interface CoachListResult {
  coaches: Coach[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### P6.2. CoachListPage

Search phải gọi server:

```http
GET /api/coaches?search=...&page=...&limit=...
```

Có debounce 250–400 ms.

Có:

- Previous.
- Next.
- Page count.
- Total.
- Loading riêng.
- Empty.
- Retry.

Không search client-side trên page 1 rồi tuyên bố tìm toàn bộ.

### P6.3. Sort

Chỉ giữ sort client-side nếu sort trên page hiện tại được ghi rõ.

Tốt hơn:

```text
sort=name
sort=experience
```

chỉ thêm backend sort nếu implementation nhỏ và an toàn.

Không tạo filter nâng cao.

### P6.4. Landing Page

Gọi:

```text
limit=4
page=1
```

Không load default 20 rồi `.slice(0,4)`.

---

## PHASE 7 — SIDEBAR VÀ ROUTE CLEANUP

### P7.1. Coach canonical routes

Giữ:

```text
/coach
/coach/profile
/coach/appointments
/coach/exercises
/coach/workout-programs
/coach/members
/coach/assignments
/coach/schedules
/coach/sessions
/coach/progress
```

### P7.2. Loại menu trùng

Trong Coach Sidebar:

- Không hiển thị `/dashboard`.
- Không hiển thị `/members` nếu `/coach/members` là canonical.
- Chỉ giữ `/crm` nếu có nghiệp vụ riêng thật.
- Nếu `/crm` trùng quản lý học viên, remove khỏi Coach Sidebar nhưng không xóa route backend/frontend của role khác.

### P7.3. Redirect compatibility

Có thể giữ redirect:

```text
/dashboard → /coach
/members → /coach/members
```

cho Coach nếu không ảnh hưởng Member/Admin.

Không để hai menu cùng dẫn đến cùng mục tiêu.

### P7.4. Wording

Chuẩn hóa tiếng Việt:

```text
Coach Dashboard → Tổng quan Coach
My Programs → Chương trình của tôi
My Members → Học viên của tôi
Assignments → Phân công chương trình
No-show → Vắng mặt
Appointment → Lịch hẹn
Workout Schedule → Lịch workout
```

Không đổi thuật ngữ kỹ thuật trong code/API.

---

## PHASE 8 — DASHBOARD RESILIENCE

### P8.1. Member Dashboard

Không dùng một `Promise.all` khiến Loyalty lỗi làm Coach Booking widget lỗi.

Tách:

```text
Bookings state
Loyalty state
Workout state
```

Mỗi widget có:

- Loading.
- Error.
- Retry.

### P8.2. Coach Dashboard

Tách:

```text
Coach Workspace Dashboard API
Coach Appointments API
```

Một API fail không được làm toàn trang mất dữ liệu.

### P8.3. Summary đúng nghiệp vụ

Member Dashboard:

- Pending appointments.
- Confirmed upcoming.
- Link tìm Coach.
- Link lịch hẹn.
- Workout summary riêng.

Coach Dashboard:

- Pending appointment.
- Today appointments.
- Upcoming appointments.
- Workout schedules riêng.
- Sessions riêng.

---

## PHASE 9 — ACCEPTANCE ENVIRONMENT HARDENING

### P9.1. Background runner guard

Trong `backend/src/app.ts`, bổ sung:

```typescript
process.env.COACH_BOOKING_ACCEPTANCE !== '1'
```

vào điều kiện không chạy Order Expiration Runner.

Không sửa logic Order Runner.

### P9.2. Guard acceptance database

Giữ bắt buộc:

```text
COACH_BOOKING_ACCEPTANCE=1
DB_NAME bắt đầu GYMFIT_DB_COACH_BOOKING_ACCEPTANCE_
```

Không cho acceptance chạy nhầm production DB.

### P9.3. Cleanup

Acceptance phải:

- Xóa Bookings fixture.
- Xóa CoachProfiles fixture.
- Xóa AuthSessions fixture.
- Xóa Users fixture.
- Drop isolated database sau khi hoàn thành nếu workflow hiện có hỗ trợ.

Không để dữ liệu test trong `GYMFIT_DB`.

---

## PHASE 10 — TEST COVERAGE 100/100

### P10.1. Unit

Bổ sung test:

- Booking mapper.
- SQL DATE normalize.
- SQL TIME normalize.
- Timezone.
- Booking date window.
- Allowed slots.
- Duration.
- Overlap.
- State transition.
- Coach profile validation.
- Booking status label helper nếu có.

### P10.2. Coach Booking Acceptance

Phải kiểm tra:

#### Public Coach

- Active Coach xuất hiện.
- Suspended không xuất hiện.
- Inactive không xuất hiện.
- Booking disabled vẫn xuất hiện profile nhưng không có slot/booking.
- Suspended detail 404.
- Invalid ID 400.
- Missing ID 404.
- Pagination.
- Server-side search.

#### Create Booking

- Guest 401.
- Member 201.
- Coach 403.
- Admin 403.
- Seller 403.
- Initial status pending.
- Fixed 60-minute duration.
- Past date fail.
- Past time today fail.
- Over 90 days fail.
- Invalid slot fail.
- Oversized note fail.
- Suspended Coach fail.
- Booking disabled Coach fail.
- Exact duplicate fail.
- Coach overlap fail.
- Member overlap fail.
- Concurrent same slot: one 201, one 409.

#### Ownership

- Member A read B fail.
- Member A mutate B fail.
- Coach A read B fail.
- Coach A mutate B fail.
- Admin behavior theo policy hiện tại.

#### State

- pending → confirmed PASS.
- pending → cancelled PASS.
- pending → completed FAIL.
- pending → no_show FAIL.
- confirmed → completed PASS khi thời gian hợp lệ.
- confirmed → no_show PASS khi thời gian hợp lệ.
- confirmed → cancelled PASS.
- completed terminal.
- cancelled terminal.
- no_show terminal.
- confirm past fail.
- complete future fail.
- no-show before end fail.

#### DTO

API response phải trả:

```text
booking_date = YYYY-MM-DD
start_time = HH:mm
end_time = HH:mm
```

không raw driver object.

### P10.3. Coach Profile Acceptance

- Coach GET own profile.
- Coach PATCH own profile.
- Coach cannot patch another Coach.
- Member denied.
- Seller denied.
- Guest denied.
- Invalid fields fail.
- bookingEnabled false blocks new booking.
- bookingEnabled true restores booking.
- Public profile reflects update.
- No PII leak.

### P10.4. Regression

Chạy:

```bash
npm run acceptance:coach-role
npm run acceptance:coach-member-e2e
npm run acceptance:admin-coach
npm run acceptance:coach-booking
```

Workout regression:

- Program.
- Program Days.
- Exercises.
- Assignment.
- Schedule.
- Session start.
- Snapshot.
- Set logs.
- Complete.
- Progress.
- Reassignment history.

---

## PHASE 11 — BROWSER ACCEPTANCE

Browser acceptance là bắt buộc để đạt 100/100.

### P11.1. Viewports

```text
375x812
768x1024
1440x900
```

### P11.2. Guest flow

```text
/
→ Coach section dùng API thật
→ /coaches
→ search
→ pagination
→ /coaches/:id
→ bấm đăng nhập để đặt lịch
→ /login
→ returnUrl preserved
```

### P11.3. Member flow

```text
Login Member
→ /coaches
→ /coaches/:id
→ /coaches/:id/book
→ chọn ngày
→ chọn slot
→ ghi note
→ submit
→ /appointments
→ thấy pending
→ detail
→ cancel hoặc chờ Coach confirm
```

Kiểm tra:

- Loading.
- Empty.
- Error.
- Retry.
- Double submit.
- 409 conflict.
- Keyboard.
- Focus.
- Responsive.
- Console không có unhandled rejection.

### P11.4. Coach flow

```text
Login Coach
→ /coach
→ thấy pending summary
→ /coach/appointments
→ confirm
→ detail
→ complete/no-show đúng thời gian
→ /coach/profile
→ cập nhật profile
→ tắt booking
→ public không thể booking
→ bật booking
→ public booking hoạt động lại
```

### P11.5. Regression visual

- `/coach/workout-programs`
- `/coach/members`
- `/coach/assignments`
- `/coach/schedules`
- `/workouts`
- `/progress`
- `/admin/coaches`

Không được vỡ route/layout/sidebar.

---

## PHASE 12 — BUILD, LINT VÀ DIFF

Backend:

```bash
cd backend
npm run build
npm run lint
npm run test:coach-booking-unit
npm run acceptance:coach-role
npm run acceptance:coach-member-e2e
npm run acceptance:admin-coach
npm run acceptance:coach-booking
```

Frontend:

```bash
cd frontend
npx tsc --noEmit
npm run build
```

Root:

```bash
git diff --check
git status --short
```

Không báo PASS nếu command chưa chạy.

Nếu lint có warning cũ:

```text
PASS_WITH_EXISTING_WARNINGS
```

nhưng không được có error mới.

---

## PHASE 13 — DOCUMENTATION

Cập nhật:

```text
README.md
ROADMAP.md
PROJECT_STATUS.md
docs/coach/COACH_MODULE_HANDOVER.md
docs/API_AND_AUTHORIZATION.md
docs/DATABASE_AND_MIGRATIONS.md
docs/DEVELOPER_WORKFLOW.md
```

Sửa branch:

```text
coach1 → coach
```

Ghi đúng:

- Latest commit.
- Migration 0010 applied status.
- API.
- Frontend routes.
- Permission.
- State machine.
- Timezone.
- Duration.
- Coach Profile.
- Browser result.
- Acceptance result.
- Known limitations.
- Marketplace 0100 blocker nếu vẫn tồn tại.

Không được ghi `FULL_COACH_MODULE_COMPLETE` nếu còn:

```text
migration pending
acceptance not run
browser blocked
runtime unverified
```

---

# 5. DEFINITION OF DONE — 100/100 CHECKLIST

## Database

- [ ] `0010_coach_profiles.sql` audit PASS.
- [ ] Migration applied trên isolated/approved database.
- [ ] `0 pending`.
- [ ] `0 checksum mismatch`.
- [ ] Không duplicate constraint/index.
- [ ] Không mất dữ liệu.

## Public Coach

- [ ] `/api/coaches` canonical.
- [ ] Active only.
- [ ] Suspended hidden.
- [ ] Inactive hidden.
- [ ] Pagination đúng.
- [ ] Search server-side đúng.
- [ ] Landing dùng `limit=4`.
- [ ] Không fake/random/hard-code.
- [ ] Không PII leak.

## Booking

- [ ] Member tạo booking thật.
- [ ] Status `pending`.
- [ ] 60 phút.
- [ ] Vietnam timezone.
- [ ] Date/time normalize.
- [ ] Coach overlap blocked.
- [ ] Member overlap blocked.
- [ ] Concurrent duplicate blocked.
- [ ] Booking disabled blocked.
- [ ] Suspended Coach blocked.
- [ ] Ownership PASS.
- [ ] State machine PASS.

## Member UX

- [ ] `/appointments`.
- [ ] Detail.
- [ ] Cancel.
- [ ] Error visible.
- [ ] Loading.
- [ ] Empty.
- [ ] Retry.
- [ ] Responsive.
- [ ] No unhandled Promise.

## Coach UX

- [ ] `/coach/appointments`.
- [ ] Detail actions.
- [ ] Confirm.
- [ ] Cancel.
- [ ] Complete.
- [ ] No-show.
- [ ] Time-aware buttons.
- [ ] Error visible.
- [ ] `/coach/profile`.
- [ ] Profile update.
- [ ] Booking enabled toggle.
- [ ] Sidebar không trùng.

## Workout regression

- [ ] Coach Workspace PASS.
- [ ] Member Workout PASS.
- [ ] Program PASS.
- [ ] Assignment PASS.
- [ ] Schedule PASS.
- [ ] Session PASS.
- [ ] Snapshot PASS.
- [ ] Set Logs PASS.
- [ ] Progress PASS.
- [ ] Reassignment history PASS.

## Verification

- [ ] Backend build PASS.
- [ ] Backend lint PASS.
- [ ] Frontend TypeScript PASS.
- [ ] Frontend build PASS.
- [ ] Unit PASS.
- [ ] Coach Booking acceptance PASS.
- [ ] Coach Role acceptance PASS.
- [ ] Coach Member E2E PASS.
- [ ] Admin Coach acceptance PASS.
- [ ] Browser Guest PASS.
- [ ] Browser Member PASS.
- [ ] Browser Coach PASS.
- [ ] Responsive PASS.
- [ ] Console clean.
- [ ] `git diff --check` PASS.
- [ ] Documentation updated.

---

# 6. NHỮNG THỨ KHÔNG ĐƯỢC PHÁT TRIỂN

Không thêm:

- Coach payment.
- Coach commission.
- Coach salary/payroll.
- Subscription Coach.
- Chat realtime.
- Video call.
- Livestream.
- Push notification.
- Email/SMS notification.
- Google Calendar sync.
- Recurring booking.
- Waitlist.
- Dynamic pricing.
- Coupon Coach.
- AI Coach recommendation.
- Coach review nâng cao.
- Auto assignment.
- Marketplace Coach.

Không tạo code dư chỉ để tăng số lượng file.

---

# 7. QUY TẮC CODE QUALITY

1. Đọc source trước khi sửa.
2. Tái sử dụng code hiện có.
3. Không module trùng.
4. Không route trùng.
5. Không DTO trùng.
6. Không hard-code URL.
7. Không `Math.random()`.
8. Không mock.
9. Không `any` mới nếu không có lý do.
10. Không raw SQL date/time ra frontend.
11. Không client-controlled identity.
12. Không client-controlled initial status.
13. Không uppercase booking status.
14. Không đổi Marketplace.
15. Không sửa migration cũ đã apply.
16. Không xóa dữ liệu thật.
17. Không commit `.env`.
18. Không commit `node_modules`.
19. Không commit database backup.
20. Không commit log/debug artifact.
21. Không báo PASS nếu chưa chạy.
22. Không báo complete nếu browser chưa PASS.
23. Không dừng ở việc “code đủ file”.
24. Phải chứng minh runtime.
25. Phải chứng minh regression.

---

# 8. OUTPUT BẮT BUỘC

Cuối task, trả báo cáo đúng format:

```text
FINAL VERDICT:
FULL_COACH_MODULE_COMPLETE
hoặc
PARTIAL_COACH_MODULE_COMPLETE
hoặc
COACH_MODULE_BLOCKED
```

```text
BRANCH:
START COMMIT:
END COMMIT:
```

## Root causes fixed

```text
1.
2.
3.
```

## Files changed

```text
Backend:
Frontend:
Database:
Tests:
Documentation:
```

## Migration evidence

```text
Database:
Before:
After:
0010:
Pending:
Checksum mismatches:
```

## API delivered

```text
METHOD | PATH | ROLE | PURPOSE
```

## Test results

```text
Backend build:
Backend lint:
Frontend TypeScript:
Frontend build:
Unit:
Coach Role acceptance:
Coach Member E2E:
Admin Coach acceptance:
Coach Booking acceptance:
Browser Guest:
Browser Member:
Browser Coach:
Responsive:
Console:
git diff --check:
```

## Security evidence

```text
Member IDOR:
Coach IDOR:
Seller denial:
Suspended Coach denial:
Booking disabled:
Concurrency:
Overlap:
State transition:
```

## Known limitations

Chỉ ghi limitation thật sự còn lại.

Không dùng “complete” nếu limitation còn là:

```text
browser not run
acceptance not run
migration pending
```

---

# 9. FINAL VERDICT RULE

Chỉ được trả:

```text
FULL_COACH_MODULE_COMPLETE
```

khi:

```text
MIGRATION = PASS
RUNTIME API ACCEPTANCE = PASS
BROWSER ACCEPTANCE = PASS
SECURITY = PASS
COACH WORKOUT REGRESSION = PASS
BUILD = PASS
TYPECHECK = PASS
DOCUMENTATION = UPDATED
```

Nếu thiếu một mục:

```text
PARTIAL_COACH_MODULE_COMPLETE
```

Nếu bị chặn bởi môi trường:

```text
COACH_MODULE_BLOCKED
```

và phải ghi blocker cụ thể, không suy luận PASS.

---

# 10. CODEX APP START COMMAND

Dán đoạn dưới đây vào Codex App sau khi đặt file này ở root repository:

```text
Hãy mở và đọc toàn bộ file `GYMFIT_COACH_100_PERCENT_COMPLETION_PLAN.md` trong thư mục gốc repository.

Repository mục tiêu là `vinh17491/GymFit`, branch mục tiêu là `coach`, và implementation commit đã được audit trước task là `47417e26452cf4646ed51ec03a2891410e304823`.

Thực hiện đầy đủ từng phase theo đúng thứ tự trong file. Không bỏ qua migration, Booking DTO normalization, Coach self-profile, action error UX, pagination/search, sidebar cleanup, acceptance environment guard, regression test hoặc browser acceptance.

Các ràng buộc tuyệt đối:
- Không sửa Marketplace/Seller/Product/Cart/Order/Payment/Refund/Settlement.
- Không tạo bảng Appointments mới.
- Không đổi booking status sang uppercase.
- Không tự động tạo Coach–Member assignment từ booking.
- Không tạo mock, hard-code hoặc dữ liệu random.
- Không tạo module/route/service/DTO trùng.
- Không báo PASS nếu chưa chạy test thật.
- Không báo FULL_COACH_MODULE_COMPLETE nếu migration, runtime acceptance hoặc browser acceptance chưa PASS.

Bắt đầu bằng:
1. `git status --short`
2. `git branch --show-current`
3. `git rev-parse HEAD`
4. baseline backend build/lint/unit
5. baseline frontend typecheck/build
6. xuất một audit ngắn về file sẽ sửa

Sau đó thực hiện trực tiếp toàn bộ plan, build/test sau từng phase và cuối cùng trả báo cáo đúng phần `OUTPUT BẮT BUỘC`.

Không dừng lại để hỏi xác nhận trừ khi có nguy cơ mất dữ liệu thật hoặc thiếu credential bắt buộc không tồn tại trong repository.
```
