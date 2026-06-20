# UI_FUNCTIONALITY_AUDIT.md - GymFit Web Training Platform

## Tổng quan Codebase

- **Tech Stack**: React 18 + Vite + TailwindCSS + React Hook Form (Yup) + React Query v4 + RTK + Firebase Auth + Stripe + Socket.io
- **15 Feature Modules**: Auth, Health, Coach, Workout, Diet, Blog, Notification, Dashboard, Membership, Chat, Community, Video, Credits, AI, Misc
- **Routes**: 15 public/nested routes + 3 protected dashboard routes

---

## PHASE PLAN FIX CHI TIẾT

---

## PHASE 0: CRITICAL BUGS - Auth & Navigation (Ưu tiên cao nhất)

### BUG-01: Forgot Password link sai đường dẫn
- **File**: `frontend/src/features/auth/components/LoginForm.tsx`
- **Vấn đề**: Link "Forgot Password?" (`/signup`) trỏ sai → phải trỏ `/auth/forgot-password`
- **Fix**: Tạo trang ForgotPassword, cập nhật route + link

### BUG-02: Demo Account hardcode credentials
- **File**: `LoginForm.tsx` dòng 62-65
- **Vấn đề**: Hardcode email/password `bobsmith@gmail.com` / `Password@123` trong source code → rủi ro bảo mật
- **Fix**: Đọc từ env hoặc xóa demo account, hoặc dùng tài khoản test theo role

### BUG-03: Routes không Protected
- **File**: `frontend/src/routes/index.tsx`
- **Vấn đề**: Routes `/membership/*`, `/coaches/*`, `/health/*`, `/chat/*`, `/credits/*` không được bọc ProtectedRoute → user chưa login vẫn truy cập được
- **Fix**: Bọc các route yêu cầu auth bằng ProtectedRoute

### BUG-04: React Query v4 deprecated `isLoading`
- **Files**: Tất cả component dùng `mutation.isLoading` hoặc `query.isLoading`
- **Vấn đề**: React Query v5 đổi `isLoading` → `isPending`, v4 vẫn dùng được nhưng nếu upgrade sẽ lỗi
- **Fix**: Chuẩn hóa dùng `isPending` + `isFetching` đúng cách

---

## PHASE 1: UI COMPONENTS - Health Module

### HC-01: HealthProfileForm thiếu loading spinner
- **File**: `HealthProfileForm.tsx` dòng 62
- **Vấn đề**: `return <div>Loading...</div>` không có spinner → UX kém
- **Fix**: Dùng component `<Spinner />` hoặc `<LoadingSkeleton />` có sẵn

### HC-02: BMI Calculator không validate input
- **File**: `BMICalculator.tsx`
- **Vấn đề**: Không chặn số âm, không min/max → tính sai kết quả
- **Fix**: Thêm validation: height 50-300cm, weight 10-500kg

### HC-03: BodyFatCalculator cần kiểm tra UI
- **File**: `BodyFatCalculator.tsx`
- **Vấn đề**: Cần review form inputs, validation, và hiển thị kết quả

### HC-04: TrialManager cần review logic
- **File**: `TrialManager.tsx`
- **Vấn đề**: Cần kiểm tra UI hiển thị trạng thái trial, ngày hết hạn

### HC-05: Health routes không redirect đúng
- **File**: `frontend/src/features/health/routes/index.tsx`
- **Vấn đề**: Cần kiểm tra route structure có match với menu navbar không

---

## PHASE 2: UI COMPONENTS - Auth Module

### AUTH-01: SignupForm validation
- **File**: `SignupForm.tsx`
- **Vấn đề**: Kiểm tra password strength, email duplicate check, terms agreement

### AUTH-02: Auth routes structure
- **File**: `frontend/src/features/auth/index.ts`
- **Vấn đề**: Kiểm tra auth routes có đầy đủ login/signup/forgot-password không

### AUTH-03: Google Auth error handling
- **File**: `LoginForm.tsx` dòng 46-56
- **Vấn đề**: Xử lý khi user cancel Google popup, token expired, network error

---

## PHASE 3: CORE FEATURES - Dashboard

### DASH-01: Dashboard API integration
- **File**: `frontend/src/features/dashboard/api/getDashboard.ts`
- **Vấn đề**: Kiểm tra API response đúng format, error handling

### DASH-02: Dashboard role-based rendering
- **Files**: `AdminDashboard`, `CoachDashboard`, `MemberDashboard`
- **Vấn đề**: Kiểm tra mỗi role thấy đúng dữ liệu, không leak data role khác

### DASH-03: Logbook component
- **File**: `frontend/src/features/dashboard/components/Logbook.tsx`
- **Vấn đề**: Kiểm tra CRUD log entries, date picker, validation

---

## PHASE 4: CORE FEATURES - Membership & Payment

### MEM-01: Membership plan display
- **File**: `frontend/src/features/membership/routes/Membership.tsx`
- **Vấn đề**: Kiểm tra hiển thị plan đúng giá, đúng features, responsive

### MEM-02: Purchase flow
- **File**: `frontend/src/features/membership/api/purchasePlan.ts`
- **Vấn đề**: Kiểm tra Stripe checkout redirect, success/cancel callback

### MEM-03: Checkout integration
- **File**: `backend/src/controllers/checkout.ts` + frontend cart
- **Vấn đề**: Kiểm tra thanh toán thành công → membership activated đúng

---

## PHASE 5: CONTENT FEATURES - Workout, Diet, Blog

### WO-01: Workout List & Detail
- **Files**: `Workouts.tsx`, `WorkoutDetail.tsx`
- **Vấn đề**: Kiểm tra filter/search, exercise images load, video embed

### WO-02: Save Workout
- **File**: `saveWorkout.ts`
- **Vấn đề**: Kiểm tra user có thể save/unsave, optimistic update

### DI-01: Diet List & Detail
- **Files**: `DietList.tsx`, `DietDetail.tsx`
- **Vấn đề**: Kiểm tra meal plan display, nutrition info, responsive

### BL-01: Blog List & Detail
- **Files**: `BlogList.tsx`, `BlogDetail.tsx`
- **Vấn đề**: Kiểm tra pagination, likes/comments count, image lazy load

### BL-02: Blog Interactions
- **File**: `blogInteractions.ts`
- **Vấn đề**: Kiểm tra like/comment/share actions, optimistic updates

---

## PHASE 6: SOCIAL FEATURES - Chat, Community, Coach

### CH-01: Chat Conversations & Detail
- **Files**: `ChatConversations.tsx`, `ChatDetail.tsx`
- **Vấn đề**: Kiểm tra Socket.io connection, real-time messages, read receipts

### CO-01: Coach List & Detail
- **Files**: `CoachesList.tsx`, `CoachDetail.tsx`
- **Vấn đề**: Kiểm tra coach profile display, booking form, availability

### CO-02: Booking Flow
- **File**: `createBooking.ts`
- **Vấn đề**: Kiểm tra chọn lịch, xác nhận booking, conflict detection

### COM-01: Community Feed
- **File**: `Community.tsx`
- **Vấn đề**: Kiểm tra posts, comments, file upload, infinite scroll

---

## PHASE 7: UTILITY FEATURES - Notifications, Video, Credits, AI

### NT-01: Notifications
- **File**: `Notifications.tsx`
- **Vấn đề**: Kiểm tra unread badge, mark as read, real-time push

### VI-01: Video Library
- **File**: `Videos.tsx`
- **Vấn đề**: Kiểm tra video player, categories, search

### CR-01: Credits System
- **File**: `Credits.tsx`
- **Vấn đề**: Kiểm tra credit balance, earn/spend history, redemption

### AI-01: AI Features
- **File**: `AI.tsx`
- **Vấn đề**: Kiểm tra AI chat, workout recommendation, response streaming

---

## PHASE 8: CROSS-CUTTING CONCERNS

### CC-01: Error Handling
- **Vấn đề**: Kiểm tra ErrorBoundary bao phủ app, fallback UI hiển thị đúng

### CC-02: Loading States
- **Vấn đề**: Thống nhất LoadingSkeleton, Spinner, EmptyState across all pages

### CC-03: Responsive Design
- **Vấn đề**: Test mobile/tablet breakpoints cho tất cả pages, đặc biệt forms

### CC-04: Toast Notifications
- **Vấn đề**: Kiểm tra toast.success/error/warning hiển thị đúng, không conflict

### CC-05: Form Validation UX
- **Vấn đề**: Kiểm tra error messages hiển thị đúng vị trí, accessible

---

## THỨ TỰ ƯU TIÊN

| Phase | Mức ưu tiên | Thời gian ước tính | Phụ thuộc |
|-------|-------------|-------------------|-----------|
| Phase 0 | 🔴 CRITICAL | 2-3h | Không có |
| Phase 1 | 🟠 HIGH | 3-4h | Không có |
| Phase 2 | 🟠 HIGH | 2-3h | Phase 0 |
| Phase 3 | 🟡 MEDIUM | 4-5h | Phase 0,2 |
| Phase 4 | 🟡 MEDIUM | 4-5h | Phase 3 |
| Phase 5 | 🟢 NORMAL | 5-6h | Phase 3 |
| Phase 6 | 🟢 NORMAL | 5-6h | Phase 3 |
| Phase 7 | 🔵 LOW | 3-4h | Phase 3 |
| Phase 8 | 🔵 ONGOING | 2-3h | Tất cả |

**Tổng thời gian ước tính: 30-40h**

---

## CHIẾN LƯỢC KHUYẾN NGHỊ

1. **Bắt đầu Phase 0 ngay** - Fix auth bugs vì ảnh hưởng toàn app
2. **Làm song song Phase 1+2** - Health + Auth UI fix
3. **Phase 3 làm nền** - Dashboard fix trước khi tackle content features
4. **Phase 4-7 làm theo batch** - Mỗi batch 2-3 features
5. **Phase 8 làm xuyên suốt** - Kiểm tra responsive, loading, error ở mỗi phase