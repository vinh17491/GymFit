# TỔNG QUAN DỰ ÁN ECOMMERCE GOSHOP

## Giới thiệu
Dự án Ecommerce GoShop là một ứng dụng thương mại điện tử full-stack với kiến trúc client-server:
- **Frontend**: React + TypeScript (Vite)
- **Backend**: Node.js + Express + TypeScript
- **Database**: MySQL (managed via Prisma ORM)
- **Authentication**: Firebase Authentication
- **Payment**: Stripe
- **Image Storage**: Cloudinary

---

## 1. DANH SÁCH TẤT CẢ BẢNG DATABASE

Dự án sử dụng **MySQL** làm database, quản lý qua **Prisma ORM** (file: `backend/prisma/schema.prisma`). Có tổng cộng **4 models**:

### 1.1. User
| Field | Type | Constraints |
|-------|------|-------------|
| firebaseId | String | @unique |
| email | String @db.VarChar(255) | @unique |
| fullName | String | |
| role | Role (enum: USER, ADMIN) | @default(USER) |
| avatar | String? | nullable |
| Order | Order[] | relation (1-n) |

**Enum Role**: USER, ADMIN

### 1.2. Product
| Field | Type | Constraints |
|-------|------|-------------|
| id | String | @unique (Stripe Product ID) |
| name | String | |
| description | String @db.Text | |
| price | Float | |
| stockQuantity | Int | |
| image | String | URL |
| categoryId | Int? | FK → Category.id |
| priceId | String | @unique (Stripe Price ID) |
| createdAt | DateTime | @default(now()) |

**Full-text index**: name, (name + description)

### 1.3. Category
| Field | Type | Constraints |
|-------|------|-------------|
| id | Int | @id @default(autoincrement()) |
| name | String | @unique |
| createdAt | DateTime | @default(now()) |
| products | Product[] | relation (1-n) |

### 1.4. Order
| Field | Type | Constraints |
|-------|------|-------------|
| id | Int | @id @default(autoincrement()) |
| amount | Float | |
| userId | String | FK → User.firebaseId |
| user | User | relation |
| items | Json | Array of {product, quantity} |
| country | String | |
| address | String | |
| sessionId | String | @unique (Stripe Session ID) |
| createdAt | DateTime | @default(now()) |

### Quan hệ giữa các bảng:
- **User 1-n Order**: Một user có nhiều order
- **Category 1-n Product**: Một category có nhiều product
- **Product n-1 Category**: Mỗi product thuộc một category

---

## 2. DANH SÁCH TẤT CẢ API

**Base URL**: `http://localhost:3000` (development) | `FRONTEND_URL` (production)

### 2.1. Auth Routes (`/auth`)
| Method | Endpoint | Auth | Middleware | Controller | Mô tả |
|--------|----------|------|------------|------------|-------|
| POST | /auth/register | No | - | register | Đăng ký user (email/password), tạo Firebase user + DB user |
| POST | /auth/register/google | No | - | registerWithGoogle | Đăng ký/đồng bộ user từ Google |

### 2.2. Category Routes (`/category`)
| Method | Endpoint | Auth | Middleware | Controller | Mô tả |
|--------|----------|------|------------|------------|-------|
| GET | /category | No | - | getAllCategories | Lấy tất cả categories (sắp xếp mới nhất) |
| GET | /category/:id | No | - | getSingleCategory | Lấy category theo ID |

### 2.3. Product Routes (`/products`)
| Method | Endpoint | Auth | Middleware | Controller | Mô tả |
|--------|----------|------|------------|------------|-------|
| GET | /products | No | - | getAllProducts | Lấy tất cả sản phẩm |
| POST | /products/search | No | - | searchForProducts | Tìm kiếm sản phẩm (full-text search) |
| GET | /products/category/:id | No | - | getProductsByCategory | Lấy sản phẩm theo category |
| GET | /products/:id | No | - | getProductById | Lấy sản phẩm theo ID |
| POST | /products | Yes | authMiddleware, verifyRolesMiddleware(["ADMIN"]), multerUpload, processImageUpload | createProduct | Tạo sản phẩm mới (Admin) |
| PATCH | /products/:id | Yes | authMiddleware, verifyRolesMiddleware(["ADMIN"]), multerUpload, processImageUpload | updateProduct | Cập nhật sản phẩm (Admin) |
| DELETE | /products/:id | Yes | authMiddleware, verifyRolesMiddleware(["ADMIN"]) | deleteProduct | Xóa sản phẩm (Admin) |

### 2.4. Checkout Routes (`/checkout`)
| Method | Endpoint | Auth | Middleware | Controller | Mô tả |
|--------|----------|------|------------|------------|-------|
| POST | /checkout/create-session | Yes | authMiddleware | createCheckoutSession | Tạo Stripe Checkout Session |
| GET | /checkout/session/items/:id | Yes | authMiddleware | getCheckoutItems | Lấy các items trong session |
| GET | /checkout/session/:id | Yes | authMiddleware | getCheckoutSession | Lấy thông tin checkout session |

### 2.5. Order Routes (`/orders`)
| Method | Endpoint | Auth | Middleware | Controller | Mô tả |
|--------|----------|------|------------|------------|-------|
| GET | /orders | Yes | authMiddleware, verifyRolesMiddleware(["ADMIN"]) | getAllOrders | Lấy tất cả orders (Admin) |
| GET | /orders/user/:id | Yes | authMiddleware | getOrdersByUserId | Lấy orders theo user ID |

### 2.6. User Routes (`/users`)
| Method | Endpoint | Auth | Middleware | Controller | Mô tả |
|--------|----------|------|------------|------------|-------|
| PATCH | /users/update/:id | Yes | authMiddleware, multerUpload, processImageUpload | updateUser | Cập nhật user profile |
| GET | /users/:id | Yes | authMiddleware | getUserByFirebaseId | Lấy user theo Firebase ID |

### 2.7. Webhook (`/webhook`)
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | /webhook | No (raw body) | Stripe webhook xử lý sự kiện checkout.session.completed |

### Tổng số API endpoints: 20 endpoints

---

## 3. DANH SÁCH TẤT CẢ PAGE FRONTEND

**Routing**: React Router v6

### Public Routes (không cần đăng nhập)
| Route | Component | Module | Mô tả |
|-------|-----------|--------|-------|
| `/` | Home | misc | Trang chủ - giới thiệu category, new arrivals, starter pack, discounts |
| `/auth/login` | Auth (LoginForm) | auth | Trang đăng nhập |
| `/auth/signup` | Auth (SignupForm) | auth | Trang đăng ký |
| `/cart` | Cart | cart | Giỏ hàng |
| `/products/shop` | Shop > ProductsDashboard | products | Cửa hàng - danh sách sản phẩm có filter, search |
| `/products/:productId` | Product | products | Chi tiết sản phẩm |
| `/products/favorites` | Favorites | products | Danh sách yêu thích |

### Protected Routes (cần đăng nhập)
| Route | Component | Module | Mô tả |
|-------|-----------|--------|-------|
| `/dashboard` | Dashboard | misc | Dashboard: Admin (Products tab), Orders tab, Profile tab |
| `/checkout/success?id=...` | CheckoutSuccess | checkout | Trang thanh toán thành công |

### Tổng số pages: **9 pages** (công khai: 7, bảo vệ: 2)

### Các component dùng chung:
- **Elements**: Navbar, Spinner, Popup, PreviewImage
- **Form**: SearchBox, CategorySelectBox, ProductQuantitySelectBox, SortSelectBox

---

## 4. DANH SÁCH TẤT CẢ MODULE BUSINESS

### 4.1. Authentication & Authorization Module
- **Backend Services**:
  - Firebase Admin SDK: createUser, verifyIdToken, setCustomUserClaims
  - Password-based + Google OAuth registration
  - JWT-based auth middleware
  - Role-based access control (USER/ADMIN)
- **Frontend Services**:
  - Firebase Auth: signInWithEmailAndPassword, signInWithPopup (Google), signInWithCustomToken
  - AuthContext: currentUser state, token management, role detection
- **Files**: `backend/src/controllers/auth.ts`, `backend/src/middleware/authMiddleware.ts`, `backend/src/middleware/verifyRolesMiddleware.ts`, `frontend/src/context/AuthContext.tsx`, `frontend/src/features/auth/*`

### 4.2. Product Management Module
- CRUD operations (Admin: Create, Update, Delete; Public: Read, Search)
- Stripe integration: tạo/archive sản phẩm & price trên Stripe khi CRUD
- Image upload via Cloudinary
- Full-text search (MySQL fulltext index)
- Filter by category
- **Files**: `backend/src/controllers/products.ts`, `frontend/src/features/products/*`

### 4.3. Category Management Module
- List all categories, get single category
- Auto-create category when creating product (connectOrCreate)
- Auto-delete orphan categories when deleting product
- **Files**: `backend/src/controllers/category.ts`, `frontend/src/features/category/*`

### 4.4. Shopping Cart Module
- Redux state management (redux-persist lưu localStorage)
- Add/remove items, update quantity
- Cart badge hiển thị số lượng
- **Files**: `frontend/src/features/cart/cartSlice.ts`, `frontend/src/features/cart/*`

### 4.5. Favorites / Wishlist Module
- Redux state management (redux-persist)
- Toggle favorite status
- Hiển thị danh sách yêu thích
- **Files**: `frontend/src/features/products/favoritesSlice.ts`, `frontend/src/features/products/routes/Favorites.tsx`

### 4.6. Checkout & Payment Module (Stripe)
- Tạo Stripe Checkout Session (line items từ cart)
- Xử lý webhook: checkout.session.completed → tạo Order trong database
- Redirect đến trang success
- **Files**: `backend/src/controllers/checkout.ts`, `backend/src/controllers/webhook.ts`, `frontend/src/features/checkout/*`

### 4.7. Order Management Module
- Admin: xem tất cả orders
- User: xem orders của mình
- Order bao gồm thông tin sản phẩm, địa chỉ, số tiền
- **Files**: `backend/src/controllers/orders.ts`, `frontend/src/features/orders/*`

### 4.8. User Profile Management Module
- Xem và cập nhật profile (avatar upload Cloudinary)
- Đồng bộ dữ liệu với Firebase Auth (email, displayName, photoURL)
- **Files**: `backend/src/controllers/users.ts`, `frontend/src/features/users/*`

### 4.9. Utility / Shared Modules
- **Stripe Config**: Stripe client singleton (`backend/src/config/stripe.ts`)
- **Firebase Admin Config**: Firebase Admin SDK init (`backend/src/config/firebase.ts`)
- **Prisma Client**: Singleton Prisma client (`backend/src/config/prisma-client.ts`)
- **Image Upload Pipeline**: multer (receive) → Cloudinary (upload) (`backend/src/middleware/multerMiddleware.ts`, `processImageUpload.ts`)
- **Error Handling**: Global error middleware (`backend/src/middleware/errorMiddleware.ts`)
- **Seed Script**: Fake data generation (100 products, 10 categories) (`backend/src/seed.ts`)
- **API Client**: Axios instance với base URL config (`frontend/src/app/api.ts`)
- **Firebase Frontend**: Firebase client init (`frontend/src/app/firebase.ts`)

---

## 5. KIẾN TRÚC HIỆN TẠI CỦA HỆ THỐNG

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT (Frontend)                                        │
│                             React + TypeScript + Vite                                      │
│                                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐      │
│  │                        React Router (SPA)                                        │      │
│  │  / Home → Home.tsx                                                              │      │
│  │  /auth/* → AuthRoutes → Auth.tsx (Login/Signup)                                │      │
│  │  /cart → Cart.tsx                                                               │      │
│  │  /products/shop → Shop.tsx (ProductsDashboard)                                  │      │
│  │  /products/:id → Product.tsx (Product Detail)                                   │      │
│  │  /products/favorites → Favorites.tsx                                            │      │
│  │  /dashboard → Dashboard.tsx (AdminProducts/Orders/Profile)                      │      │
│  │  /checkout/success → CheckoutSuccess.tsx                                        │      │
│  └─────────────────────────────────────────────────────────────────────────────────┘      │
│                                    │                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐      │
│  │                         State Management                                        │      │
│  │  • AuthContext (React Context): currentUser, token, isAdmin                     │      │
│  │  • Redux Store (redux-persist): cartSlice, favoritesSlice                       │      │
│  │  • React Query (TanStack): data fetching, caching                               │      │
│  └─────────────────────────────────────────────────────────────────────────────────┘      │
│                                    │                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐      │
│  │                         Firebase Client SDK                                    │      │
│  │  • Firebase Auth: signInWithEmailAndPassword, Google Popup, Custom Token        │      │
│  └─────────────────────────────────────────────────────────────────────────────────┘      │
│                                    │                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐      │
│  │                         API Layer (Axios)                                       │      │
│  │  baseURL: http://localhost:3000 (dev) / VITE_BACKEND_URL (prod)                 │      │
│  └───────┬─────────────────────────────────────────────────────────────────────────┘      │
└──────────┼──────────────────────────────────────────────────────────────────────────────────┘
           │ HTTP/JSON (Bearer Token)
           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  SERVER (Backend)                                          │
│                           Node.js + Express + TypeScript                                   │
│                                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐      │
│  │                              Middleware Pipeline                               │      │
│  │  → cors → webhook (raw body) → json parser → urlencoded → static /uploads/    │      │
│  │  → Routes → Error Handler                                                      │      │
│  └─────────────────────────────────────────────────────────────────────────────────┘      │
│                                    │                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐      │
│  │                           Route Handlers                                      │      │
│  │  /auth    → auth routes    → register, registerWithGoogle                      │      │
│  │  /products→ product routes → CRUD + search                                     │      │
│  │  /category→ category routes→ list, single                                       │      │
│  │  /checkout→ checkout routes→ create session, get session, get items            │      │
│  │  /orders  → order routes   → all orders, by user                               │      │
│  │  /users   → user routes    → get user, update user                             │      │
│  │  /webhook → webhook        → Stripe webhook handler                             │      │
│  └─────────────────────────────────────────────────────────────────────────────────┘      │
│                                    │                                                       │
│  ┌──────────────┬──────────────────┬───────────────────┬──────────────────────────┐       │
│  │  Middleware   │   Controllers    │    Config/Utils   │         Types            │       │
│  │              │                  │                   │                          │       │
│  │• auth        │• auth.ts        │• prisma-client.ts │• Express Request extend  │       │
│  │ (Firebase JWT)│• category.ts   │• firebase.ts      │ (uid, role, image)       │       │
│  │• verifyRoles │• checkout.ts    │  (Admin SDK)      │                          │       │
│  │ (ADMIN/USER) │• orders.ts     │• stripe.ts         │                          │       │
│  │• multer      │• products.ts   │• processOrderAddr  │                          │       │
│  │ (file upload)│• users.ts      │                   │                          │       │
│  │• processImage│• webhook.ts    │                   │                          │       │
│  │ (Cloudinary) │                  │                   │                          │       │
│  │• errorHandler│                  │                   │                          │       │
│  └──────────────┴──────────────────┴───────────────────┴──────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
           │                                    │
           ▼                                    ▼
┌─────────────────────────┐      ┌─────────────────────────────────────┐
│    MySQL Database       │      │        Third-party Services         │
│                         │      │                                     │
│  ┌─────┐  ┌──────────┐  │      │  ┌─────────────────────────────┐   │
│  │User │  │Product   │  │      │  │    Stripe                   │   │
│  │     │  │categoryId├──┼──┐   │  │  • Checkout Sessions        │   │
│  ├─────┤  │priceId   │  │  │   │  │  • Products & Prices        │   │
│  │Order│  └──────────┘  │  │   │  │  • Webhooks                 │   │
│  │userId├──┼────────────┼──┘   │  └─────────────────────────────┘   │
│  └─────┘               │       │                                     │
│  ┌──────────┐          │       │  ┌─────────────────────────────┐   │
│  │Category  │          │       │  │    Firebase                 │   │
│  │    ├──Product       │       │  │  • Authentication           │   │
│  └──────────┘          │       │  │  • Custom Claims (role)     │   │
│                        │       │  │  • Storage (unused?)        │   │
│  Managed via Prisma ORM│       │  └─────────────────────────────┘   │
│  (MySQL)               │       │                                     │
└─────────────────────────┘       │  ┌─────────────────────────────┐   │
                                  │  │    Cloudinary               │   │
                                  │  │  • Image upload & hosting   │   │
                                  │  └─────────────────────────────┘   │
                                  └─────────────────────────────────────┘

### Luồng dữ liệu chính:

#### 1. Luồng Authentication
```
User → Login Form → Firebase Client SDK → Firebase Auth → Custom Token
→ Backend Auth Middleware (verifyIdToken) → set req.uid, req.role
→ Protected Routes
```

#### 2. Luồng Checkout & Payment
```
Cart (Redux) → Create Stripe Session (Backend) → Stripe Checkout Page
→ User pays → Stripe Webhook → checkout.session.completed
→ Backend tạo Order trong DB → Redirect success page → get session info
```

#### 3. Luồng Product CRUD (Admin)
```
Admin Form → Upload Image (multer → Cloudinary) → Create Stripe Product & Price
→ Create/Update Product trong DB (Prisma) → Response
```

#### 4. Luồng Search
```
Search Query → POST /products/search → Prisma fulltext search
(name & description fulltext index) → Results sorted by relevance
```

### Công nghệ sử dụng:

| Layer | Technology |
|-------|-----------|
| **Frontend Framework** | React 18 + TypeScript |
| **Build Tool** | Vite 4 |
| **Styling** | Tailwind CSS 3 |
| **State Management** | Redux Toolkit + redux-persist + React Context |
| **Data Fetching** | TanStack React Query + Axios |
| **Form** | React Hook Form + Yup |
| **Backend Framework** | Express 4 + TypeScript |
| **Database** | MySQL (Prisma ORM) |
| **Auth** | Firebase Authentication (Client + Admin SDK) |
| **Payment** | Stripe (Checkout Sessions, Webhooks) |
| **Image** | Cloudinary (upload + serve) |
| **Testing** | Cypress (E2E) |
| **Deploy** | Docker, Fly.io (backend), PWA (frontend) |

---

> ═══════════════════════════════════════════════════════════════
> **PHẦN DƯỚI ĐÂY LÀ THIẾT KẾ KIẾN TRÚC GYMFIT V2**
> Thêm vào từ đây
> ═══════════════════════════════════════════════════════════════

# GYMFIT V2 ARCHITECTURE BLUEPRINT

## Tổng quan

GymFit V2 là phiên bản nâng cấp từ GoShop Ecommerce, mở rộng thành hệ thống quản lý phòng gym toàn diện bao gồm:
- **Supplement Store**: Kế thừa và mở rộng từ GoShop (Category → SupplementCategory, Product → Supplement)
- **Membership Management**: Quản lý gói tập và đăng ký hội viên
- **Coach/PT Management**: Quản lý huấn luyện viên cá nhân
- **Coach Booking**: Đặt lịch tập với PT
- **Workout Programs**: Chương trình tập luyện
- **Diet Plans**: Kế hoạch dinh dưỡng
- **Blog System**: Hệ thống bài viết
- **User Dashboard**: Trang cá nhân cho member
- **Admin Dashboard**: Quản trị hệ thống

---

## 6. MIGRATION MAPPING: GOSHOP → GYMFIT V2

### 6.1. Bảng Mapping

| GoShop (MySQL/Prisma) | GymFit V2 (SQL Server) | Ghi chú |
|----------------------|------------------------|---------|
| Category | SupplementCategory | Đổi tên, thêm trường image, description |
| Product | Supplement | Mở rộng thêm trường, đổi tên |
| Order | Order | Giữ nguyên cấu trúc, thêm trạng thái |
| User | Users | Mở rộng thành hệ thống roles (ADMIN, COACH, MEMBER) |
| *(none)* | Roles | Bảng mới - quản lý role |
| *(none)* | RefreshTokens | Bảng mới - JWT refresh token |
| *(none)* | MembershipPlans | Bảng mới - gói tập |
| *(none)* | Memberships | Bảng mới - đăng ký gói |
| *(none)* | Coaches | Bảng mới - thông tin PT |
| *(none)* | CoachSchedules | Bảng mới - lịch rảnh của PT |
| *(none)* | Bookings | Bảng mới - đặt lịch tập |
| *(none)* | OrderItems | Bảng mới - chi tiết đơn hàng |
| *(none)* | Payments | Bảng mới - thanh toán |
| *(none)* | WorkoutPrograms | Bảng mới - chương trình tập |
| *(none)* | DietPlans | Bảng mới - kế hoạch dinh dưỡng |
| *(none)* | Blogs | Bảng mới - bài viết |
| *(none)* | Reviews | Bảng mới - đánh giá |

### 6.2. Công nghệ giữ lại

| Công nghệ | Vai trò trong GymFit V2 |
|-----------|------------------------|
| React + TypeScript + Vite | Frontend framework |
| Express + TypeScript | Backend framework |
| Redux Toolkit | State management (cart, auth) |
| React Query | Server state, caching |
| TailwindCSS | Styling |
| Cloudinary | Image upload/storage |
| Stripe | Payment processing |
| React Hook Form | Form handling |

### 6.3. Công nghệ loại bỏ

| Công nghệ | Lý do |
|-----------|-------|
| Firebase Authentication | Thay bằng JWT + Refresh Token |
| Firebase Admin SDK | Không cần do bỏ Firebase |
| MySQL + Prisma ORM | Thay bằng SQL Server + raw queries / stored procedures |
| Cypress (E2E) | Có thể thay thế sau |

### 6.4. Công nghệ thêm mới

| Công nghệ | Vai trò |
|-----------|---------|
| SQL Server 2019+ | Database |
| JWT (jsonwebtoken) | Access token |
| bcrypt | Password hashing |
| mssql / tedious | SQL Server driver cho Node.js |
| dotenv | Environment config |

---

## 7. DATABASE DESIGN (SQL SERVER)

### 7.1. Tổng quan

**SQL Server**: Microsoft SQL Server 2019+ (Express cũng được)
**Connection**: Dùng mssql (tedious driver) hoặc sequelize ORM
**Collation**: SQL_Latin1_General_CP1_CI_AS
**Schema**: dbo (mặc định)

### 7.2. Roles

**Business Purpose**: Lưu danh sách roles trong hệ thống để phân quyền.

| Column | Data Type | Constraints | Mô tả |
|--------|-----------|-------------|-------|
| Id | INT | PK, IDENTITY(1,1) | ID role |
| Name | NVARCHAR(50) | NOT NULL, UNIQUE | Tên role (ADMIN, COACH, MEMBER) |
| Description | NVARCHAR(255) | NULL | Mô tả role |
| CreatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Ngày tạo |

**Primary Key**: Id (INT, IDENTITY)
**Foreign Key**: None
**Relationships**: 1-n → Users
**Indexes**:
- IX_Roles_Name UNIQUE ON (Name)

### 7.3. Users

**Business Purpose**: Lưu thông tin tài khoản người dùng (Admin, Coach, Member).

| Column | Data Type | Constraints | Mô tả |
|--------|-----------|-------------|-------|
| Id | INT | PK, IDENTITY(1,1) | ID user |
| Email | NVARCHAR(255) | NOT NULL, UNIQUE | Email đăng nhập |
| PasswordHash | NVARCHAR(500) | NOT NULL | Mật khẩu đã hash (bcrypt) |
| FullName | NVARCHAR(100) | NOT NULL | Họ và tên |
| Phone | NVARCHAR(20) | NULL | Số điện thoại |
| Avatar | NVARCHAR(500) | NULL | URL avatar (Cloudinary) |
| RoleId | INT | NOT NULL, FK → Roles.Id | Role của user |
| IsActive | BIT | NOT NULL, DEFAULT 1 | Trạng thái active |
| CreatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Ngày tạo |
| UpdatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Ngày cập nhật |

**Primary Key**: Id (INT, IDENTITY)
**Foreign Key**:
- FK_Users_RoleId → Roles(Id)
**Relationships**:
- n-1 → Roles
- 1-n → RefreshTokens
- 1-n → Memberships
- 1-1 → Coaches (nếu là COACH)
- 1-n → Orders
- 1-n → Bookings (với tư cách MEMBER)
- 1-n → WorkoutPrograms
- 1-n → DietPlans
- 1-n → Reviews
- 1-n → Blogs
**Indexes**:
- IX_Users_Email UNIQUE ON (Email)
- IX_Users_RoleId ON (RoleId) INCLUDE (IsActive)
- IX_Users_IsActive ON (IsActive)

### 7.4. RefreshTokens

**Business Purpose**: Lưu refresh token để duy trì phiên đăng nhập. Cho phép cấp lại access token mới mà không cần đăng nhập lại.

| Column | Data Type | Constraints | Mô tả |
|--------|-----------|-------------|-------|
| Id | INT | PK, IDENTITY(1,1) | ID token |
| UserId | INT | NOT NULL, FK → Users.Id | Chủ sở hữu token |
| Token | NVARCHAR(500) | NOT NULL, UNIQUE | Refresh token string |
| ExpiresAt | DATETIME2 | NOT NULL | Thời gian hết hạn |
| IsRevoked | BIT | NOT NULL, DEFAULT 0 | Đã thu hồi? |
| CreatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Ngày tạo |

**Primary Key**: Id (INT, IDENTITY)
**Foreign Key**:
- FK_RefreshTokens_UserId → Users(Id)
**Relationships**:
- n-1 → Users
**Indexes**:
- IX_RefreshTokens_Token UNIQUE ON (Token)
- IX_RefreshTokens_UserId ON (UserId) INCLUDE (IsRevoked, ExpiresAt)

### 7.5. MembershipPlans

**Business Purpose**: Định nghĩa các gói tập (hội viên) như Monthly, Yearly, Personal Training, v.v.

| Column | Data Type | Constraints | Mô tả |
|--------|-----------|-------------|-------|
| Id | INT | PK, IDENTITY(1,1) | ID gói tập |
| Name | NVARCHAR(100) | NOT NULL | Tên gói (VD: "Monthly Basic") |
| Description | NVARCHAR(1000) | NULL | Mô tả gói tập |
| DurationDays | INT | NOT NULL | Số ngày hiệu lực (30, 90, 365) |
| Price | DECIMAL(10,2) | NOT NULL | Giá gói |
| MaxSessionsPerWeek | INT | NULL | Giới hạn buổi tập/tuần (NULL = không giới hạn) |
| IncludesPersonalTraining | BIT | NOT NULL, DEFAULT 0 | Có kèm PT? |
| IncludesDietPlan | BIT | NOT NULL, DEFAULT 0 | Có kèm kế hoạch dinh dưỡng? |
| IsActive | BIT | NOT NULL, DEFAULT 1 | Còn bán? |
| CreatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Ngày tạo |

**Primary Key**: Id (INT, IDENTITY)
**Foreign Key**: None
**Relationships**:
- 1-n → Memberships
**Indexes**:
- IX_MembershipPlans_IsActive ON (IsActive) INCLUDE (Name, Price)

### 7.6. Memberships

**Business Purpose**: Lưu thông tin đăng ký gói tập của từng user (member). Mỗi user có thể có nhiều đăng ký theo thời gian.

| Column | Data Type | Constraints | Mô tả |
|--------|-----------|-------------|-------|
| Id | INT | PK, IDENTITY(1,1) | ID đăng ký |
| UserId | INT | NOT NULL, FK → Users.Id | Member |
| PlanId | INT | NOT NULL, FK → MembershipPlans.Id | Gói đã đăng ký |
| StartDate | DATE | NOT NULL | Ngày bắt đầu |
| EndDate | DATE | NOT NULL | Ngày hết hạn |
| Status | NVARCHAR(20) | NOT NULL, DEFAULT 'ACTIVE' | ACTIVE, EXPIRED, CANCELLED |
| StripePaymentId | NVARCHAR(255) | NULL | Stripe payment ID |
| CreatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Ngày tạo |

**Primary Key**: Id (INT, IDENTITY)
**Foreign Key**:
- FK_Memberships_UserId → Users(Id)
- FK_Memberships_PlanId → MembershipPlans(Id)
**Relationships**:
- n-1 → Users
- n-1 → MembershipPlans
**Indexes**:
- IX_Memberships_UserId ON (UserId) INCLUDE (Status, EndDate)
- IX_Memberships_Status ON (Status) INCLUDE (EndDate)

### 7.7. Coaches

**Business Purpose**: Lưu thông tin chi tiết của huấn luyện viên (PT). Mỗi coach là một user có role = COACH.

| Column | Data Type | Constraints | Mô tả |
|--------|-----------|-------------|-------|
| Id | INT | PK, IDENTITY(1,1) | ID coach |
| UserId | INT | NOT NULL, FK → Users.Id, UNIQUE | User tương ứng |
| Specialization | NVARCHAR(255) | NULL | Chuyên môn (VD: "Strength, Cardio") |
| Bio | NVARCHAR(2000) | NULL | Giới thiệu bản thân |
| ExperienceYears | INT | NULL | Số năm kinh nghiệm |
| HourlyRate | DECIMAL(10,2) | NULL | Giá mỗi giờ tập |
| Certifications | NVARCHAR(1000) | NULL | Chứng chỉ |
| IsAvailable | BIT | NOT NULL, DEFAULT 1 | Nhận lịch mới? |
| Rating | DECIMAL(2,1) | NOT NULL, DEFAULT 0.0 | Đánh giá trung bình (0.0 - 5.0) |
| CreatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Ngày tạo |

**Primary Key**: Id (INT, IDENTITY)
**Foreign Key**:
- FK_Coaches_UserId → Users(Id)
**Relationships**:
- 1-1 → Users
- 1-n → CoachSchedules
- 1-n → Bookings (với tư cách COACH)
**Indexes**:
- IX_Coaches_UserId UNIQUE ON (UserId)
- IX_Coaches_IsAvailable ON (IsAvailable) INCLUDE (Specialization, HourlyRate)

### 7.8. CoachSchedules

**Business Purpose**: Lưu lịch rảnh của coach, dùng để member đặt lịch tập.

| Column | Data Type | Constraints | Mô tả |
|--------|-----------|-------------|-------|
| Id | INT | PK, IDENTITY(1,1) | ID lịch |
| CoachId | INT | NOT NULL, FK → Coaches.Id | Coach |
| DayOfWeek | TINYINT | NOT NULL | Thứ trong tuần (0=CN, 1=T2, ..., 6=T7) |
| StartTime | TIME(0) | NOT NULL | Giờ bắt đầu (VD: 07:00) |
| EndTime | TIME(0) | NOT NULL | Giờ kết thúc (VD: 08:00) |
| IsBooked | BIT | NOT NULL, DEFAULT 0 | Đã được đặt chưa? |
| SpecificDate | DATE | NULL | Ngày cụ thể (NULL = lịch weekly) |
| CreatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Ngày tạo |

**Primary Key**: Id (INT, IDENTITY)
**Foreign Key**:
- FK_CoachSchedules_CoachId → Coaches(Id)
**Relationships**:
- n-1 → Coaches
- 1-1 → Bookings (khi đã đặt)
**Indexes**:
- IX_CoachSchedules_CoachId_Day ON (CoachId, DayOfWeek) INCLUDE (IsBooked)
- IX_CoachSchedules_SpecificDate ON (SpecificDate) INCLUDE (CoachId)

### 7.9. Bookings

**Business Purpose**: Lưu thông tin đặt lịch tập giữa member và coach.

| Column | Data Type | Constraints | Mô tả |
|--------|-----------|-------------|-------|
| Id | INT | PK, IDENTITY(1,1) | ID booking |
| MemberId | INT | NOT NULL, FK → Users.Id | Member đặt lịch |
| CoachId | INT | NOT NULL, FK → Coaches.Id | Coach được đặt |
| ScheduleId | INT | NOT NULL, FK → CoachSchedules.Id, UNIQUE | Lịch đã đặt |
| BookingDate | DATE | NOT NULL | Ngày tập |
| StartTime | TIME(0) | NOT NULL | Giờ bắt đầu |
| EndTime | TIME(0) | NOT NULL | Giờ kết thúc |
| Status | NVARCHAR(20) | NOT NULL, DEFAULT 'CONFIRMED' | CONFIRMED, COMPLETED, CANCELLED, NO_SHOW |
| Notes | NVARCHAR(500) | NULL | Ghi chú thêm |
| StripePaymentId | NVARCHAR(255) | NULL | Stripe payment ID |
| CreatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Ngày tạo |
| UpdatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Ngày cập nhật |

**Primary Key**: Id (INT, IDENTITY)
**Foreign Key**:
- FK_Bookings_MemberId → Users(Id)
- FK_Bookings_CoachId → Coaches(Id)
- FK_Bookings_ScheduleId → CoachSchedules(Id)
**Relationships**:
- n-1 → Users (Member)
- n-1 → Coaches
- 1-1 → CoachSchedules
**Indexes**:
- IX_Bookings_MemberId ON (MemberId) INCLUDE (Status, BookingDate)
- IX_Bookings_CoachId_Date ON (CoachId, BookingDate) INCLUDE (Status)
- IX_Bookings_ScheduleId UNIQUE ON (ScheduleId)

### 7.10. SupplementCategories

**Business Purpose**: Lưu danh mục sản phẩm bổ sung (kế thừa và đổi tên từ Category của GoShop).

| Column | Data Type | Constraints | Mô tả |
|--------|-----------|-------------|-------|
| Id | INT | PK, IDENTITY(1,1) | ID danh mục |
| Name | NVARCHAR(100) | NOT NULL, UNIQUE | Tên danh mục |
| Description | NVARCHAR(500) | NULL | Mô tả |
| Image | NVARCHAR(500) | NULL | URL hình ảnh |
| IsActive | BIT | NOT NULL, DEFAULT 1 | Còn sử dụng? |
| CreatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Ngày tạo |

**Primary Key**: Id (INT, IDENTITY)
**Foreign Key**: None
**Relationships**:
- 1-n → Supplements
**Indexes**:
- IX_SupplementCategories_Name UNIQUE ON (Name)

### 7.11. Supplements

**Business Purpose**: Lưu thông tin sản phẩm bổ sung dinh dưỡng (kế thừa từ Product của GoShop).

| Column | Data Type | Constraints | Mô tả |
|--------|-----------|-------------|-------|
| Id | INT | PK, IDENTITY(1,1) | ID sản phẩm |
| Name | NVARCHAR(200) | NOT NULL | Tên sản phẩm |
| Description | NVARCHAR(MAX) | NULL | Mô tả chi tiết |
| Price | DECIMAL(10,2) | NOT NULL | Giá bán |
| StockQuantity | INT | NOT NULL, DEFAULT 0 | Số lượng tồn kho |
| Image | NVARCHAR(500) | NULL | URL hình ảnh (Cloudinary) |
| CategoryId | INT | NULL, FK → SupplementCategories.Id | Danh mục |
| Brand | NVARCHAR(100) | NULL | Thương hiệu |
| Weight | NVARCHAR(50) | NULL | Khối lượng (VD: "2lb", "5lb") |
| Flavor | NVARCHAR(100) | NULL | Hương vị |
| StripePriceId | NVARCHAR(255) | NULL | Stripe Price ID |
| StripeProductId | NVARCHAR(255) | NULL | Stripe Product ID |
| IsActive | BIT | NOT NULL, DEFAULT 1 | Còn bán? |
| CreatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Ngày tạo |
| UpdatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Ngày cập nhật |

**Primary Key**: Id (INT, IDENTITY)
**Foreign Key**:
- FK_Supplements_CategoryId → SupplementCategories(Id)
**Relationships**:
- n-1 → SupplementCategories
- 1-n → OrderItems
**Indexes**:
- IX_Supplements_CategoryId ON (CategoryId) INCLUDE (IsActive)
- IX_Supplements_IsActive ON (IsActive) INCLUDE (Name, Price)
- IX_Supplements_Name ON (Name)

### 7.12. Orders

**Business Purpose**: Lưu thông tin đơn hàng mua supplement (mở rộng từ Order của GoShop).

| Column | Data Type | Constraints | Mô tả |
|--------|-----------|-------------|-------|
| Id | INT | PK, IDENTITY(1,1) | ID đơn hàng |
| UserId | INT | NOT NULL, FK → Users.Id | Người mua |
| TotalAmount | DECIMAL(10,2) | NOT NULL | Tổng tiền |
| Status | NVARCHAR(20) | NOT NULL, DEFAULT 'PENDING' | PENDING, PAID, SHIPPED, DELIVERED, CANCELLED |
| ShippingAddress | NVARCHAR(500) | NULL | Địa chỉ giao hàng |
| Phone | NVARCHAR(20) | NULL | SĐT nhận hàng |
| Notes | NVARCHAR(500) | NULL | Ghi chú |
| StripeSessionId | NVARCHAR(255) | NULL, UNIQUE | Stripe Checkout Session ID |
| CreatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Ngày tạo |
| UpdatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Ngày cập nhật |

**Primary Key**: Id (INT, IDENTITY)
**Foreign Key**:
- FK_Orders_UserId → Users(Id)
**Relationships**:
- n-1 → Users
- 1-n → OrderItems
- 1-1 → Payments
**Indexes**:
- IX_Orders_UserId ON (UserId) INCLUDE (Status, CreatedAt)
- IX_Orders_Status ON (Status)
- IX_Orders_StripeSessionId UNIQUE ON (StripeSessionId)

### 7.13. OrderItems

**Business Purpose**: Lưu chi tiết từng sản phẩm trong đơn hàng.

| Column | Data Type | Constraints | Mô tả |
|--------|-----------|-------------|-------|
| Id | INT | PK, IDENTITY(1,1) | ID item |
| OrderId | INT | NOT NULL, FK → Orders.Id | Đơn hàng |
| SupplementId | INT | NOT NULL, FK → Supplements.Id | Sản phẩm |
| Quantity | INT | NOT NULL | Số lượng |
| UnitPrice | DECIMAL(10,2) | NOT NULL | Đơn giá tại thời điểm mua |
| Subtotal | DECIMAL(10,2) | NOT NULL | Thành tiền (Quantity * UnitPrice) |
| CreatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Ngày tạo |

**Primary Key**: Id (INT, IDENTITY)
**Foreign Key**:
- FK_OrderItems_OrderId → Orders(Id)
- FK_OrderItems_SupplementId → Supplements(Id)
**Relationships**:
- n-1 → Orders
- n-1 → Supplements
**Indexes**:
- IX_OrderItems_OrderId ON (OrderId)
- IX_OrderItems_SupplementId ON (SupplementId)

### 7.14. Payments

**Business Purpose**: Lưu thông tin thanh toán cho orders và memberships qua Stripe.

| Column | Data Type | Constraints | Mô tả |
|--------|-----------|-------------|-------|
| Id | INT | PK, IDENTITY(1,1) | ID payment |
| OrderId | INT | NULL, FK → Orders.Id | Đơn hàng (nếu thanh toán order) |
| UserId | INT | NOT NULL, FK → Users.Id | Người thanh toán |
| Amount | DECIMAL(10,2) | NOT NULL | Số tiền |
| Currency | NVARCHAR(3) | NOT NULL, DEFAULT 'USD' | Loại tiền (USD, VND) |
| StripePaymentIntentId | NVARCHAR(255) | NULL, UNIQUE | Stripe Payment Intent ID |
| StripeSessionId | NVARCHAR(255) | NULL | Stripe Checkout Session ID |
| Status | NVARCHAR(20) | NOT NULL, DEFAULT 'PENDING' | PENDING, SUCCEEDED, FAILED, REFUNDED |
| PaymentType | NVARCHAR(20) | NOT NULL | ORDER, MEMBERSHIP, BOOKING |
| CreatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Ngày tạo |

**Primary Key**: Id (INT, IDENTITY)
**Foreign Key**:
- FK_Payments_OrderId → Orders(Id)
- FK_Payments_UserId → Users(Id)
**Relationships**:
- n-1 → Users
- 1-1 → Orders (optional)
**Indexes**:
- IX_Payments_UserId ON (UserId)
- IX_Payments_StripePaymentIntentId UNIQUE ON (StripePaymentIntentId)
- IX_Payments_Status ON (Status)
- IX_Payments_OrderId ON (OrderId) WHERE OrderId IS NOT NULL

### 7.15. WorkoutPrograms

**Business Purpose**: Lưu chương trình tập luyện được giao bởi coach cho member.

| Column | Data Type | Constraints | Mô tả |
|--------|-----------|-------------|-------|
| Id | INT | PK, IDENTITY(1,1) | ID chương trình |
| MemberId | INT | NOT NULL, FK → Users.Id | Member được giao |
| CoachId | INT | NULL, FK → Coaches.Id | Coach tạo chương trình (NULL = tự tạo) |
| Title | NVARCHAR(200) | NOT NULL | Tiêu đề (VD: "4-Week Strength Program") |
| Description | NVARCHAR(MAX) | NULL | Mô tả chi tiết |
| Exercises | NVARCHAR(MAX) | NOT NULL | JSON array bài tập [{name, sets, reps, rest}] |
| DurationWeeks | INT | NOT NULL | Số tuần |
| Difficulty | NVARCHAR(20) | NOT NULL, DEFAULT 'BEGINNER' | BEGINNER, INTERMEDIATE, ADVANCED |
| Status | NVARCHAR(20) | NOT NULL, DEFAULT 'ACTIVE' | ACTIVE, COMPLETED, ARCHIVED |
| CreatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Ngày tạo |
| UpdatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Ngày cập nhật |

**Primary Key**: Id (INT, IDENTITY)
**Foreign Key**:
- FK_WorkoutPrograms_MemberId → Users(Id)
- FK_WorkoutPrograms_CoachId → Coaches(Id)
**Relationships**:
- n-1 → Users (Member)
- n-1 → Coaches
**Indexes**:
- IX_WorkoutPrograms_MemberId ON (MemberId) INCLUDE (Status)
- IX_WorkoutPrograms_CoachId ON (CoachId)

### 7.16. DietPlans

**Business Purpose**: Lưu kế hoạch dinh dưỡng được giao bởi coach cho member.

| Column | Data Type | Constraints | Mô tả |
|--------|-----------|-------------|-------|
| Id | INT | PK, IDENTITY(1,1) | ID plan |
| MemberId | INT | NOT NULL, FK → Users.Id | Member được giao |
| CoachId | INT | NULL, FK → Coaches.Id | Coach tạo plan (NULL = tự tạo) |
| Title | NVARCHAR(200) | NOT NULL | Tiêu đề |
| Description | NVARCHAR(MAX) | NULL | Mô tả |
| DailyCalories | INT | NULL | Lượng calo mỗi ngày |
| Meals | NVARCHAR(MAX) | NOT NULL | JSON array bữa ăn [{meal, foods, calories}] |
| DurationDays | INT | NOT NULL | Số ngày |
| Status | NVARCHAR(20) | NOT NULL, DEFAULT 'ACTIVE' | ACTIVE, COMPLETED, ARCHIVED |
| CreatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Ngày tạo |
| UpdatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Ngày cập nhật |

**Primary Key**: Id (INT, IDENTITY)
**Foreign Key**:
- FK_DietPlans_MemberId → Users(Id)
- FK_DietPlans_CoachId → Coaches(Id)
**Relationships**:
- n-1 → Users (Member)
- n-1 → Coaches
**Indexes**:
- IX_DietPlans_MemberId ON (MemberId) INCLUDE (Status)
- IX_DietPlans_CoachId ON (CoachId)

### 7.17. Blogs

**Business Purpose**: Lưu bài viết blog về sức khỏe, fitness, dinh dưỡng.

| Column | Data Type | Constraints | Mô tả |
|--------|-----------|-------------|-------|
| Id | INT | PK, IDENTITY(1,1) | ID bài viết |
| AuthorId | INT | NOT NULL, FK → Users.Id | Tác giả (ADMIN hoặc COACH) |
| Title | NVARCHAR(300) | NOT NULL | Tiêu đề bài viết |
| Slug | NVARCHAR(300) | NOT NULL, UNIQUE | URL slug |
| Content | NVARCHAR(MAX) | NOT NULL | Nội dung HTML |
| Excerpt | NVARCHAR(500) | NULL | Mô tả ngắn |
| CoverImage | NVARCHAR(500) | NULL | Ảnh bìa (Cloudinary) |
| Tags | NVARCHAR(500) | NULL | Tags (comma-separated) |
| Status | NVARCHAR(20) | NOT NULL, DEFAULT 'DRAFT' | DRAFT, PUBLISHED, ARCHIVED |
| ViewCount | INT | NOT NULL, DEFAULT 0 | Lượt xem |
| PublishedAt | DATETIME2 | NULL | Ngày xuất bản |
| CreatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Ngày tạo |
| UpdatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Ngày cập nhật |

**Primary Key**: Id (INT, IDENTITY)
**Foreign Key**:
- FK_Blogs_AuthorId → Users(Id)
**Relationships**:
- n-1 → Users (Author)
**Indexes**:
- IX_Blogs_Slug UNIQUE ON (Slug)
- IX_Blogs_Status_PublishedAt ON (Status, PublishedAt) WHERE Status = 'PUBLISHED'
- IX_Blogs_AuthorId ON (AuthorId)

### 7.18. Reviews

**Business Purpose**: Lưu đánh giá của member về coach hoặc supplement.

| Column | Data Type | Constraints | Mô tả |
|--------|-----------|-------------|-------|
| Id | INT | PK, IDENTITY(1,1) | ID review |
| UserId | INT | NOT NULL, FK → Users.Id | Người đánh giá (MEMBER) |
| CoachId | INT | NULL, FK → Coaches.Id | Coach được đánh giá |
| SupplementId | INT | NULL, FK → Supplements.Id | Supplement được đánh giá |
| Rating | TINYINT | NOT NULL, CHECK(1-5) | Số sao (1-5) |
| Comment | NVARCHAR(1000) | NULL | Nhận xét |
| IsApproved | BIT | NOT NULL, DEFAULT 0 | Đã duyệt? |
| CreatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Ngày tạo |

**Primary Key**: Id (INT, IDENTITY)
**Foreign Key**:
- FK_Reviews_UserId → Users(Id)
- FK_Reviews_CoachId → Coaches(Id)
- FK_Reviews_SupplementId → Supplements(Id)
**Relationships**:
- n-1 → Users
- n-1 → Coaches
- n-1 → Supplements
**Constraints**:
- CK_Reviews_Target: CHECK(CoachId IS NOT NULL OR SupplementId IS NOT NULL) - phải đánh giá coach hoặc supplement
- CK_Reviews_Rating: CHECK(Rating >= 1 AND Rating <= 5)
**Indexes**:
- IX_Reviews_CoachId ON (CoachId) INCLUDE (Rating, IsApproved)
- IX_Reviews_SupplementId ON (SupplementId) INCLUDE (Rating, IsApproved)
- IX_Reviews_UserId ON (UserId)

### 7.19. Entity Relationship Diagram (Text-based)

```
Roles ────< Users ────< RefreshTokens
              │
              ├──< Memberships >── MembershipPlans
              │
              ├──< Coaches (1-1)
              │     │
              │     ├──< CoachSchedules
              │     │     │
              │     │     ├──< Bookings >── Users (Member)
              │     │
              │     ├──< WorkoutPrograms >── Users (Member)
              │     │
              │     └──< DietPlans >── Users (Member)
              │
              ├──< Orders >── OrderItems >── Supplements >── SupplementCategories
              │
              ├──< Payments
              │
              ├──< Blogs
              │
              └──< Reviews >── Coaches, Supplements
```

---

## 8. AUTHENTICATION DESIGN (JWT + REFRESH TOKEN)

### 8.1. Token Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      AUTH FLOW                                  │
│                                                                 │
│  REGISTER                                                        │
│  ┌──────┐    ┌──────────┐    ┌──────────┐    ┌──────────────┐  │
│  │Client│───>│ POST     │───>│ bcrypt   │───>│ INSERT INTO  │  │
│  │Form  │    │ /auth/   │    │ hash     │    │ Users (DB)   │  │
│  │      │    │ register │    │ password │    │              │  │
│  └──────┘    └──────────┘    └──────────┘    └──────┬───────┘  │
│                                                      │          │
│  LOGIN                                               ▼          │
│  ┌──────┐    ┌──────────┐    ┌──────────┐    ┌──────────────┐  │
│  │Client│───>│ POST     │───>│ bcrypt   │───>│ SELECT * FROM│  │
│  │Form  │    │ /auth/   │    │ compare  │    │ Users WHERE  │  │
│  │      │    │ login    │    │ password │    │ email = ?    │  │
│  └──────┘    └──────────┘    └──────────┘    └──────┬───────┘  │
│                                                      │          │
│                                                      ▼          │
│                                              ┌──────────────┐  │
│                                              │ Generate     │  │
│                                              │ Access Token │  │
│                                              │ (15 min)     │  │
│                                              ├──────────────┤  │
│                                              │ Generate     │  │
│                                              │ Refresh Token│  │
│                                              │ (7 days)     │  │
│                                              ├──────────────┤  │
│                                              │ Save Refresh │  │
│                                              │ Token in DB  │  │
│                                              └──────┬───────┘  │
│                                                      │          │
│                                                      ▼          │
│                                              ┌──────────────┐  │
│                                              │ Response:    │  │
│                                              │ { accessToken│  │
│                                              │ , refresh    │  │
│                                              │ Token, user }│  │
│                                              └──────────────┘  │
│                                                                 │
│  REFRESH TOKEN                                                   │
│  ┌──────┐    ┌──────────────┐    ┌─────────────────────────┐   │
│  │Client│───>│ POST         │───>│ Validate refresh token  │   │
│  │(401) │    │ /auth/       │    │ Check: exists? revoked? │   │
│  │      │    │ refresh      │    │ expired?                │   │
│  └──────┘    └──────────────┘    └──────────┬──────────────┘   │
│                                              │                   │
│                                              ▼                   │
│                              ┌─────────────────────────────┐    │
│                              │ Generate new Access Token   │    │
│                              │ (optional: rotate refresh)  │    │
│                              └─────────────────────────────┘    │
│                                                                 │
│  LOGOUT                                                         │
│  ┌──────┐    ┌──────────────┐    ┌─────────────────────────┐   │
│  │Client│───>│ POST         │───>│ Revoke refresh token   │   │
│  │      │    │ /auth/       │    │ (IsRevoked = true)      │   │
│  │      │    │ logout       │    │ Clear client cookies    │   │
│  └──────┘    └──────────────┘    └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2. JWT Payload Structure

**Access Token** (expires: 15 minutes)
```json
{
  "sub": 1,            // User.Id
  "email": "user@gymfit.com",
  "role": "MEMBER",    // ADMIN | COACH | MEMBER
  "iat": 1700000000,
  "exp": 1700000900
}
```

**Refresh Token** (expires: 7 days)
- Random 64-byte hex string
- Stored in RefreshTokens table
- Can be revoked (IsRevoked = true)

### 8.3. Middleware Strategy

```
Middleware Pipeline (top to bottom):

1. cors                     → Allow cross-origin requests
2. express.json()           → Parse JSON body (except webhook)
3. express.urlencoded()     → Parse URL-encoded body
4. authMiddleware           → Verify JWT from Authorization header
                             → Set req.user = { id, email, role }
5. requireRole(role)        → Check req.user.role matches required role
                             → 403 Forbidden if not authorized
6. Route Handler            → Controller function
7. errorHandler             → Global error handler
```

**authMiddleware**:
- Reads `Authorization: Bearer <token>` header
- Verifies JWT with jsonwebtoken
- If invalid/expired → 401 Unauthorized
- Sets `req.user` với payload từ JWT

**requireRole(...roles)**:
- Factory function: `requireRole('ADMIN')` hoặc `requireRole('ADMIN', 'COACH')`
- Checks `req.user.role` against allowed roles
- Returns 403 Forbidden nếu không có quyền

### 8.4. Security Notes

| Issue | Solution |
|-------|----------|
| Token storage | Access Token: memory (variable). Refresh Token: httpOnly cookie (secure=true in production) |
| CSRF | SameSite=Strict for cookies, CORS whitelist |
| XSS | Sanitize all inputs, React DOM auto-escapes |
| Password storage | bcrypt with salt rounds = 12 |
| Token expiration | Access: 15 min, Refresh: 7 days |
| Token rotation | Optional: cấp refresh token mới mỗi lần refresh, revoked token cũ |
| Brute force | Rate limiting trên /auth/login (express-rate-limit) |
| SQL Injection | Parameterized queries (mssql) |
| Logout | Revoke refresh token, không thể dùng lại |

### 8.5. Role-Based Authorization

| Role | Quyền truy cập |
|------|---------------|
| ADMIN | Toàn bộ hệ thống. CRUD users, coaches, supplements, blogs, orders. Dashboard analytics. |
| COACH | Quản lý schedule cá nhân. Xem bookings của mình. Tạo workout programs / diet plans cho member. Viết blog. |
| MEMBER | Xem store, mua supplement. Đặt lịch với coach. Xem workout programs / diet plans của mình. Viết review. |

---

## 9. API DESIGN (REST API)

**Base URL**: `http://localhost:3000/api`

**Response Format**:
```json
{
  "success": true,
  "data": { ... },
  "message": "Success"
}
```

**Error Format**:
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

### 9.1. Auth Routes (`/api/auth`)

| Method | Endpoint | Auth | Role | Mô tả |
|--------|----------|------|------|-------|
| POST | /api/auth/register | No | - | Đăng ký tài khoản mới (MEMBER) |
| POST | /api/auth/login | No | - | Đăng nhập, trả về access + refresh token |
| POST | /api/auth/refresh | No | - | Cấp lại access token mới |
| POST | /api/auth/logout | Yes | * | Thu hồi refresh token |

**POST /api/auth/register**
```
Body: { email, password, fullName, phone? }
Response: { accessToken, refreshToken, user: { id, email, fullName, role } }
```

**POST /api/auth/login**
```
Body: { email, password }
Response: { accessToken, refreshToken, user: { id, email, fullName, role, avatar } }
```

**POST /api/auth/refresh**
```
Body: { refreshToken }
Response: { accessToken }
```

**POST /api/auth/logout**
```
Headers: Authorization: Bearer <accessToken>
Body: { refreshToken }
Response: { message: "Logged out successfully" }
```

### 9.2. User Routes (`/api/users`)

| Method | Endpoint | Auth | Role | Mô tả |
|--------|----------|------|------|-------|
| GET | /api/users/me | Yes | * | Lấy profile của user hiện tại |
| PATCH | /api/users/me | Yes | * | Cập nhật profile (fullName, phone, avatar) |
| GET | /api/users/:id | Yes | ADMIN, COACH | Lấy thông tin user theo ID |
| GET | /api/users | Yes | ADMIN | Danh sách users (phân trang, filter role) |

### 9.3. Membership Routes (`/api/memberships`)

| Method | Endpoint | Auth | Role | Mô tả |
|--------|----------|------|------|-------|
| GET | /api/memberships/plans | No | - | Danh sách gói tập đang bán |
| GET | /api/memberships/plans/:id | No | - | Chi tiết gói tập |
| POST | /api/memberships/register | Yes | MEMBER | Đăng ký gói tập (tạo Stripe Checkout Session) |
| GET | /api/memberships/my | Yes | MEMBER | Lịch sử đăng ký gói của tôi |
| GET | /api/memberships | Yes | ADMIN | Tất cả đăng ký (phân trang) |
| PATCH | /api/memberships/:id/status | Yes | ADMIN | Cập nhật trạng thái đăng ký |

### 9.4. Coach Routes (`/api/coaches`)

| Method | Endpoint | Auth | Role | Mô tả |
|--------|----------|------|------|-------|
| GET | /api/coaches | No | - | Danh sách PT (filter specialization, rating) |
| GET | /api/coaches/:id | No | - | Chi tiết PT, bao gồm reviews |
| GET | /api/coaches/:id/schedules | No | - | Lịch rảnh của PT (cho member đặt) |
| POST | /api/coaches/schedules | Yes | COACH | Thêm schedule cho PT |
| DELETE | /api/coaches/schedules/:id | Yes | COACH | Xóa schedule |
| PUT | /api/coaches/profile | Yes | COACH | Cập nhật profile coach |
| GET | /api/coaches/admin | Yes | ADMIN | Tất cả PT (cho admin) |
| PATCH | /api/coaches/:id/status | Yes | ADMIN | Duyệt / vô hiệu hóa PT |

### 9.5. Booking Routes (`/api/bookings`)

| Method | Endpoint | Auth | Role | Mô tả |
|--------|----------|------|------|-------|
| POST | /api/bookings | Yes | MEMBER | Đặt lịch với PT |
| GET | /api/bookings/my | Yes | MEMBER | Lịch đã đặt của tôi |
| GET | /api/bookings/coach | Yes | COACH | Lịch đặt của coach |
| GET | /api/bookings/:id | Yes | MEMBER, COACH | Chi tiết booking |
| PATCH | /api/bookings/:id/status | Yes | MEMBER, COACH | Hủy / xác nhận hoàn thành booking |
| GET | /api/bookings | Yes | ADMIN | Tất cả bookings (phân trang) |

### 9.6. Supplement Routes (`/api/supplements`)

| Method | Endpoint | Auth | Role | Mô tả |
|--------|----------|------|------|-------|
| GET | /api/supplements | No | - | Danh sách supplement (filter category, search, phân trang) |
| GET | /api/supplements/categories | No | - | Danh sách danh mục |
| GET | /api/supplements/:id | No | - | Chi tiết supplement |
| POST | /api/supplements | Yes | ADMIN | Thêm supplement mới |
| PUT | /api/supplements/:id | Yes | ADMIN | Cập nhật supplement |
| DELETE | /api/supplements/:id | Yes | ADMIN | Xóa supplement |
| POST | /api/supplements/:id/reviews | Yes | MEMBER | Đánh giá supplement |

### 9.7. Order Routes (`/api/orders`)

| Method | Endpoint | Auth | Role | Mô tả |
|--------|----------|------|------|-------|
| POST | /api/orders/checkout | Yes | MEMBER | Tạo Stripe Checkout Session cho giỏ hàng |
| GET | /api/orders/my | Yes | MEMBER | Đơn hàng của tôi |
| GET | /api/orders/:id | Yes | MEMBER, ADMIN | Chi tiết đơn hàng |
| GET | /api/orders | Yes | ADMIN | Tất cả đơn hàng (phân trang, filter status) |
| PATCH | /api/orders/:id/status | Yes | ADMIN | Cập nhật trạng thái đơn hàng |

### 9.8. Payment Routes (`/api/payments`)

| Method | Endpoint | Auth | Role | Mô tả |
|--------|----------|------|------|-------|
| POST | /api/payments/stripe/webhook | No | - | Stripe webhook (raw body) |
| GET | /api/payments/my | Yes | MEMBER | Lịch sử thanh toán của tôi |
| GET | /api/payments | Yes | ADMIN | Tất cả giao dịch (phân trang) |

### 9.9. Workout Program Routes (`/api/workouts`)

| Method | Endpoint | Auth | Role | Mô tả |
|--------|----------|------|------|-------|
| GET | /api/workouts/my | Yes | MEMBER | Chương trình tập của tôi |
| GET | /api/workouts/:id | Yes | MEMBER, COACH | Chi tiết chương trình |
| POST | /api/workouts | Yes | COACH | Tạo chương trình cho member |
| PUT | /api/workouts/:id | Yes | COACH | Cập nhật chương trình |
| PATCH | /api/workouts/:id/status | Yes | MEMBER, COACH | Cập nhật trạng thái (ACTIVE, COMPLETED) |
| GET | /api/workouts | Yes | ADMIN | Tất cả chương trình |
| DELETE | /api/workouts/:id | Yes | ADMIN | Xóa chương trình |

### 9.10. Diet Plan Routes (`/api/diets`)

| Method | Endpoint | Auth | Role | Mô tả |
|--------|----------|------|------|-------|
| GET | /api/diets/my | Yes | MEMBER | Kế hoạch dinh dưỡng của tôi |
| GET | /api/diets/:id | Yes | MEMBER, COACH | Chi tiết kế hoạch |
| POST | /api/diets | Yes | COACH | Tạo kế hoạch cho member |
| PUT | /api/diets/:id | Yes | COACH | Cập nhật kế hoạch |
| PATCH | /api/diets/:id/status | Yes | MEMBER, COACH | Cập nhật trạng thái |
| GET | /api/diets | Yes | ADMIN | Tất cả kế hoạch |

### 9.11. Blog Routes (`/api/blogs`)

| Method | Endpoint | Auth | Role | Mô tả |
|--------|----------|------|------|-------|
| GET | /api/blogs | No | - | Danh sách bài viết (PUBLISHED, phân trang) |
| GET | /api/blogs/:slug | No | - | Chi tiết bài viết (theo slug) |
| POST | /api/blogs | Yes | ADMIN, COACH | Tạo bài viết mới |
| PUT | /api/blogs/:id | Yes | ADMIN, COACH | Cập nhật bài viết |
| PATCH | /api/blogs/:id/status | Yes | ADMIN | Duyệt / ẩn bài viết |
| DELETE | /api/blogs/:id | Yes | ADMIN | Xóa bài viết |
| GET | /api/blogs/admin | Yes | ADMIN | Tất cả bài viết (kể cả DRAFT) |

### 9.12. Admin Routes (`/api/admin`)

| Method | Endpoint | Auth | Role | Mô tả |
|--------|----------|------|------|-------|
| GET | /api/admin/dashboard/stats | Yes | ADMIN | Thống kê tổng quan (users, orders, revenue) |
| GET | /api/admin/dashboard/revenue | Yes | ADMIN | Biểu đồ doanh thu (theo tháng) |
| GET | /api/admin/dashboard/members | Yes | ADMIN | Thống kê member (đăng ký mới, active) |
| GET | /api/admin/dashboard/bookings | Yes | ADMIN | Thống kê booking |

### Tổng số API endpoints: ~50 endpoints

---

## 10. FRONTEND DESIGN (REACT + TYPESCRIPT + VITE)

### 10.1. State Management Strategy

| Loại State | Công nghệ | Mục đích |
|-----------|-----------|----------|
| Server State | React Query (TanStack) | Fetch, cache, sync dữ liệu từ API |
| Client State - Auth | Redux Toolkit (authSlice) | Lưu accessToken, user info, refreshToken |
| Client State - Cart | Redux Toolkit (cartSlice) | Giỏ hàng supplement (redux-persist) |
| Client State - UI | Redux Toolkit (uiSlice) | Loading, modal, toast notifications |
| Form State | React Hook Form | Form validation, submit |

### 10.2. Axios Interceptor Strategy

```
Request Interceptor:
  - Attach Authorization: Bearer <accessToken> header
  - Attach Content-Type: application/json

Response Interceptor:
  - If 401 (Unauthorized):
    → Attempt refresh token (POST /api/auth/refresh)
    → If refresh success: retry original request with new token
    → If refresh fails: redirect to /login, clear auth state
  - If 403 (Forbidden): redirect to /unauthorized
  - If 500: show error toast
```

### 10.3. Public Pages

| Route | Component | Module | Mô tả |
|-------|-----------|--------|-------|
| `/` | PublicHome | misc | Landing page: hero banner, featured supplements, coaches, blog highlights, pricing CTA |
| `/store` | StorePage | supplements | Danh sách supplement với filter (category, price range, search), phân trang |
| `/store/:id` | SupplementDetail | supplements | Chi tiết supplement: hình ảnh, mô tả, reviews, thêm vào giỏ |
| `/coaches` | CoachList | coaches | Danh sách PT với filter (specialization, rating), xem profile |
| `/coaches/:id` | CoachDetail | coaches | Chi tiết PT: bio, certifications, rating, reviews, lịch rảnh, đặt lịch |
| `/blogs` | BlogList | blogs | Danh sách bài viết (lưới), filter theo tag |
| `/blogs/:slug` | BlogDetail | blogs | Chi tiết bài viết: nội dung, author, tags |
| `/pricing` | PricingPage | memberships | Bảng giá các gói tập, so sánh features, CTA đăng ký |
| `/login` | LoginPage | auth | Form đăng nhập (email/password) |
| `/register` | RegisterPage | auth | Form đăng ký (email, password, fullName, phone) |

### 10.4. Member Pages (cần đăng nhập, role = MEMBER)

| Route | Component | Module | Mô tả |
|-------|-----------|--------|-------|
| `/member/dashboard` | MemberDashboard | member | Tổng quan: membership status, upcoming bookings, current workout/diet plan |
| `/member/membership` | MyMembership | member | Thông tin gói tập hiện tại, lịch sử đăng ký, gia hạn |
| `/member/orders` | MyOrders | member | Danh sách đơn hàng supplement, filter status |
| `/member/orders/:id` | OrderDetail | member | Chi tiết đơn hàng |
| `/member/bookings` | MyBookings | member | Lịch đã đặt với PT (upcoming, history), hủy booking |
| `/member/workouts` | MyWorkouts | member | Danh sách workout programs, chi tiết bài tập |
| `/member/workouts/:id` | WorkoutDetail | member | Chi tiết bài tập theo ngày, đánh dấu hoàn thành |
| `/member/diets` | MyDietPlans | member | Danh sách kế hoạch dinh dưỡng |
| `/member/diets/:id` | DietPlanDetail | member | Chi tiết bữa ăn, calo, theo dõi |
| `/member/profile` | MemberProfile | member | Cập nhật thông tin cá nhân, avatar, đổi mật khẩu |

### 10.5. Coach Pages (cần đăng nhập, role = COACH)

| Route | Component | Module | Mô tả |
|-------|-----------|--------|-------|
| `/coach/dashboard` | CoachDashboard | coach | Tổng quan: bookings hôm nay, member count, upcoming schedule |
| `/coach/schedules` | ScheduleManagement | coach | Quản lý lịch rảnh: thêm/xóa khung giờ (weekly view) |
| `/coach/bookings` | BookingManagement | coach | Danh sách bookings, xác nhận/hủy, check-in |
| `/coach/bookings/:id` | BookingDetail | coach | Chi tiết booking, member info |
| `/coach/members` | MyMembers | coach | Danh sách member đang được coach hướng dẫn |
| `/coach/workouts` | CoachWorkouts | coach | Tạo/quản lý workout programs cho member |
| `/coach/workouts/create` | CreateWorkout | coach | Tạo chương trình tập mới |
| `/coach/diets` | CoachDiets | coach | Tạo/quản lý diet plans cho member |
| `/coach/diets/create` | CreateDiet | coach | Tạo kế hoạch dinh dưỡng mới |
| `/coach/profile` | CoachProfile | coach | Cập nhật profile: specialization, bio, certifications, hourly rate |

### 10.6. Admin Pages (cần đăng nhập, role = ADMIN)

| Route | Component | Module | Mô tả |
|-------|-----------|--------|-------|
| `/admin/dashboard` | AdminDashboard | admin | Thống kê: total users (members/coaches/admins), total orders, total revenue, active memberships, bookings today. Biểu đồ doanh thu, member growth. |
| `/admin/users` | UserManagement | admin | CRUD users, filter role, search email/name, active/inactive |
| `/admin/users/:id` | UserDetail | admin | Chi tiết user: orders, memberships, bookings |
| `/admin/coaches` | CoachManagement | admin | Duyệt/ từ chối coach applications, view profile, set active/inactive |
| `/admin/coaches/:id` | CoachDetail | admin | Chi tiết coach: bookings, schedules, members |
| `/admin/memberships` | MembershipManagement | admin | CRUD membership plans, view all registrations |
| `/admin/memberships/plans` | ManagePlans | admin | Tạo/sửa/xóa gói tập |
| `/admin/bookings` | BookingManagement (admin) | admin | Xem tất cả bookings, filter (date, status, coach) |
| `/admin/orders` | OrderManagement | admin | Xem tất cả orders, cập nhật status (PENDING→PAID→SHIPPED→DELIVERED) |
| `/admin/orders/:id` | OrderDetailAdmin | admin | Chi tiết order, items, payment info |
| `/admin/supplements` | SupplementManagement | admin | CRUD supplements, upload images, quản lý stock |
| `/admin/supplements/categories` | CategoryManagement | admin | Quản lý danh mục supplement |
| `/admin/blogs` | BlogManagement | admin | Duyệt bài viết, tạo/sửa/xóa blog |
| `/admin/blogs/create` | CreateBlog | admin | Tạo bài viết mới (rich text editor) |
| `/admin/blogs/:id/edit` | EditBlog | admin | Sửa bài viết |
| `/admin/analytics` | Analytics | admin | Biểu đồ nâng cao: doanh thu theo tháng, top supplements, top coaches, member retention |

### 10.7. Route Protection Architecture

```
<Routes>
  {/* Public Routes */}
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
  <Route path="/" element={<PublicHome />} />
  <Route path="/store" element={<StorePage />} />
  <Route path="/store/:id" element={<SupplementDetail />} />
  <Route path="/coaches" element={<CoachList />} />
  <Route path="/coaches/:id" element={<CoachDetail />} />
  <Route path="/blogs" element={<BlogList />} />
  <Route path="/blogs/:slug" element={<BlogDetail />} />
  <Route path="/pricing" element={<PricingPage />} />

  {/* Protected Route Wrapper */}
  <Route element={<ProtectedRoute />}>
    {/* Member Routes */}
    <Route element={<RoleGuard allowedRoles={['MEMBER']} />}>
      <Route path="/member/dashboard" element={<MemberDashboard />} />
      <Route path="/member/membership" element={<MyMembership />} />
      <Route path="/member/orders" element={<MyOrders />} />
      <Route path="/member/orders/:id" element={<OrderDetail />} />
      <Route path="/member/bookings" element={<MyBookings />} />
      <Route path="/member/workouts" element={<MyWorkouts />} />
      <Route path="/member/workouts/:id" element={<WorkoutDetail />} />
      <Route path="/member/diets" element={<MyDietPlans />} />
      <Route path="/member/diets/:id" element={<DietPlanDetail />} />
      <Route path="/member/profile" element={<MemberProfile />} />
    </Route>

    {/* Coach Routes */}
    <Route element={<RoleGuard allowedRoles={['COACH']} />}>
      <Route path="/coach/dashboard" element={<CoachDashboard />} />
      <Route path="/coach/schedules" element={<ScheduleManagement />} />
      <Route path="/coach/bookings" element={<BookingManagement />} />
      <Route path="/coach/workouts" element={<CoachWorkouts />} />
      <Route path="/coach/diets" element={<CoachDiets />} />
      <Route path="/coach/profile" element={<CoachProfile />} />
    </Route>

    {/* Admin Routes */}
    <Route element={<RoleGuard allowedRoles={['ADMIN']} />}>
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/users" element={<UserManagement />} />
      <Route path="/admin/coaches" element={<CoachManagement />} />
      <Route path="/admin/memberships" element={<MembershipManagement />} />
      <Route path="/admin/bookings" element={<BookingManagementAdmin />} />
      <Route path="/admin/orders" element={<OrderManagement />} />
      <Route path="/admin/supplements" element={<SupplementManagement />} />
      <Route path="/admin/blogs" element={<BlogManagement />} />
      <Route path="/admin/analytics" element={<Analytics />} />
    </Route>
  </Route>

  {/* 404 */}
  <Route path="*" element={<NotFoundPage />} />
</Routes>
```

**ProtectedRoute**: Kiểm tra accessToken còn hạn? Nếu không → redirect /login \
**RoleGuard**: Kiểm tra user.role có trong allowedRoles? Nếu không → redirect /unauthorized

### 10.8. Shared / Layout Components

| Component | Mô tả |
|-----------|-------|
| Navbar | Navigation chính: links theo role, user menu (avatar, dropdown) |
| Footer | Footer với links, social media, copyright |
| ProtectedRoute | Wrapper kiểm tra authentication |
| RoleGuard | Wrapper kiểm tra role authorization |
| Sidebar | Sidebar navigation cho Member/Coach/Admin dashboard |
| PageHeader | Header với title, breadcrumb, actions |
| DataTable | Bảng dữ liệu reusable: columns, sorting, pagination |
| Pagination | Phân trang component |
| SearchInput | Input tìm kiếm với debounce |
| SelectFilter | Dropdown filter |
| Modal | Modal dialog reusable (confirm, form) |
| Toast | Toast notification (success, error, warning) |
| LoadingSpinner | Loading indicator |
| EmptyState | Empty state placeholder |
| ErrorState | Error state với retry button |
| AvatarUpload | Upload ảnh với preview (Cloudinary) |
| RichTextEditor | Text editor cho blog content |
| StarRating | Rating component (1-5 stars) |
| Card | Card container reusable |
| Badge | Status badge (ACTIVE, PENDING, etc.) |
| Tabs | Tab navigation component |

---

## 11. BACKEND ARCHITECTURE (NODE.JS + EXPRESS + TYPESCRIPT)

### 11.1. Folder Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts          # SQL Server connection pool (mssql)
│   │   ├── cloudinary.ts        # Cloudinary config
│   │   ├── stripe.ts            # Stripe client
│   │   └── env.ts               # Environment variables validation
│   │
│   ├── middleware/
│   │   ├── authMiddleware.ts    # JWT verification
│   │   ├── requireRole.ts      # Role-based access control
│   │   ├── multerMiddleware.ts  # File upload handling
│   │   ├── processImageUpload.ts # Cloudinary upload pipeline
│   │   ├── validateRequest.ts   # Request validation (Joi/Zod)
│   │   ├── rateLimiter.ts       # Rate limiting
│   │   └── errorHandler.ts      # Global error handler
│   │
│   ├── routes/
│   │   ├── index.ts             # Route aggregator
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── membership.routes.ts
│   │   ├── coach.routes.ts
│   │   ├── booking.routes.ts
│   │   ├── supplement.routes.ts
│   │   ├── order.routes.ts
│   │   ├── payment.routes.ts
│   │   ├── workout.routes.ts
│   │   ├── diet.routes.ts
│   │   ├── blog.routes.ts
│   │   └── admin.routes.ts
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── membership.controller.ts
│   │   ├── coach.controller.ts
│   │   ├── booking.controller.ts
│   │   ├── supplement.controller.ts
│   │   ├── order.controller.ts
│   │   ├── payment.controller.ts
│   │   ├── workout.controller.ts
│   │   ├── diet.controller.ts
│   │   ├── blog.controller.ts
│   │   └── admin.controller.ts
│   │
│   ├── services/
│   │   ├── auth.service.ts       # JWT generation, password hashing
│   │   ├── user.service.ts       # User CRUD
│   │   ├── membership.service.ts # Plan registration, expiry check
│   │   ├── coach.service.ts      # Coach CRUD, schedule management
│   │   ├── booking.service.ts    # Booking logic, conflict check
│   │   ├── supplement.service.ts # Supplement CRUD
│   │   ├── order.service.ts      # Order management
│   │   ├── stripe.service.ts     # Stripe integration
│   │   ├── workout.service.ts    # Workout CRUD
│   │   ├── diet.service.ts       # Diet plan CRUD
│   │   ├── blog.service.ts       # Blog CRUD
│   │   └── admin.service.ts      # Analytics, stats
│   │
│   ├── repositories/
│   │   ├── user.repository.ts    # SQL queries - Users table
│   │   ├── refreshToken.repository.ts
│   │   ├── membership.repository.ts
│   │   ├── coach.repository.ts
│   │   ├── booking.repository.ts
│   │   ├── supplement.repository.ts
│   │   ├── order.repository.ts
│   │   ├── workout.repository.ts
│   │   ├── diet.repository.ts
│   │   ├── blog.repository.ts
│   │   └── review.repository.ts
│   │
│   ├── types/
│   │   ├── index.ts              # Shared types/interfaces
│   │   ├── auth.types.ts
│   │   ├── user.types.ts
│   │   ├── membership.types.ts
│   │   ├── supplement.types.ts
│   │   ├── order.types.ts
│   │   ├── booking.types.ts
│   │   └── express.d.ts          # Extend Express Request (req.user)
│   │
│   ├── utils/
│   │   ├── jwt.ts                # JWT sign/verify helpers
│   │   ├── password.ts           # bcrypt hash/compare
│   │   ├── apiResponse.ts        # Standard response format
│   │   ├── asyncHandler.ts       # Async error wrapper
│   │   ├── pagination.ts         # Pagination helper
│   │   └── slugify.ts            # URL slug generator
│   │
│   ├── validators/
│   │   ├── auth.validator.ts
│   │   ├── user.validator.ts
│   │   ├── supplement.validator.ts
│   │   ├── booking.validator.ts
│   │   └── blog.validator.ts
│   │
│   ├── app.ts                    # Express app setup
│   └── server.ts                 # Server entry point
│
├── database/
│   ├── GymFit.sql                # Full database schema script
│   ├── seed-data.sql             # Sample data
│   └── migrations/               # Incremental SQL migration scripts
│
├── .env                          # Environment variables
├── .env.example                  # Environment variables template
├── tsconfig.json
├── package.json
└── README.md
```

### 11.2. SQL Server Connection Strategy

Sử dụng **mssql** (tedious driver) với connection pool.

```typescript
// config/database.ts
import sql from 'mssql';

const config: sql.config = {
  server: process.env.DB_SERVER!,     // VD: 'DESKTOP-XXXXX\\SQLEXPRESS'
  database: process.env.DB_NAME!,     // 'GymFit'
  user: process.env.DB_USER!,         // 'sa'
  password: process.env.DB_PASSWORD!, // 'YourPassword'
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

const pool = new sql.ConnectionPool(config);
export default pool;
```

### 11.3. Environment Variables

```
# .env.example

# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database (SQL Server)
DB_SERVER=localhost\SQLEXPRESS
DB_NAME=GymFit
DB_USER=sa
DB_PASSWORD=YourPassword

# JWT
JWT_ACCESS_SECRET=your-access-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret
```

---

## 12. DATABASE SCRIPT - GymFit.sql (Outline)

File `backend/database/GymFit.sql` sẽ chứa:

```
1. CREATE DATABASE GymFit
2. USE GymFit
3. Bảng Roles
4. Bảng Users
5. Bảng RefreshTokens
6. Bảng MembershipPlans
7. Bảng Memberships
8. Bảng Coaches
9. Bảng CoachSchedules
10. Bảng Bookings
11. Bảng SupplementCategories
12. Bảng Supplements
13. Bảng Orders
14. Bảng OrderItems
15. Bảng Payments
16. Bảng WorkoutPrograms
17. Bảng DietPlans
18. Bảng Blogs
19. Bảng Reviews
20. Seed data (INSERT INTO ...)
```

**Quy tắc đặt tên**:
- Bảng: PascalCase số nhiều (Users, Orders, ...)
- Cột: PascalCase (Id, FullName, ...)
- Khóa ngoại: FK_TableName_ColumnName
- Index: IX_TableName_Columns
- Unique constraint: UQ_TableName_Column

---

## 13. TECHNOLOGY STACK SUMMARY (GymFit V2)

| Layer | Technology | Ghi chú |
|-------|-----------|---------|
| **Frontend Framework** | React 18 + TypeScript | Giữ lại |
| **Build Tool** | Vite 5 | Giữ lại |
| **Styling** | TailwindCSS 3 | Giữ lại |
| **State Management** | Redux Toolkit + redux-persist | Giữ lại, thêm authSlice |
| **Data Fetching** | TanStack React Query v5 | Giữ lại |
| **Form** | React Hook Form | Giữ lại |
| **Backend Framework** | Express 4 + TypeScript | Giữ lại |
| **Database** | Microsoft SQL Server 2019+ | **Mới** |
| **Database Driver** | mssql (tedious) | **Mới** |
| **Auth** | JWT (jsonwebtoken) + bcrypt | **Mới** (thay Firebase) |
| **Payment** | Stripe | Giữ lại |
| **Image Storage** | Cloudinary | Giữ lại |
| **Validation** | Zod | **Mới** (thay Yup?) |
| **Rate Limiting** | express-rate-limit | **Mới** |

---

## 14. SQL SERVER SETUP GUIDE

### 14.1. Installation

1. Download SQL Server Express từ: https://go.microsoft.com/fwlink/?linkid=866658
2. Chạy installer, chọn "Basic" installation type
3. Lưu lại tên server (VD: DESKTOP-XXXXX\SQLEXPRESS)
4. Download SQL Server Management Studio (SSMS) từ: https://aka.ms/ssmsfullsetup
5. Cài đặt SSMS

### 14.2. Database Setup

1. Mở SSMS, đăng nhập với Windows Authentication
2. Tạo login cho user 'sa' (nếu chưa có):
   - Security → Logins → New Login
   - Login name: sa
   - SQL Server Authentication
   - Set password
   - Status: Enabled
3. Restart SQL Server service với SQL Server Configuration Manager (SQL Server Network Configuration → Protocols for SQLEXPRESS → TCP/IP Enabled)
4. Mở file GymFit.sql trong SSMS
5. Execute (F5)

### 14.3. Backend Connection

1. Copy `.env.example` → `.env`
2. Cập nhật DB_SERVER với tên máy của bạn (dùng `hostname` trong cmd để lấy)
3. Cập nhật DB_USER=sa, DB_PASSWORD=your-password
4. Chạy `npm install`
5. Chạy `npm run dev`

### 14.4. Connection Test

```sql
-- Test connection trong SSMS
SELECT @@VERSION AS 'SQL Server Version';
SELECT DB_NAME() AS 'Current Database';
-- Expected: GymFit
```

---

## 15. FRONTEND FOLDER STRUCTURE (MODULE-BASED)

```
frontend/
├── public/
│   └── images/
├── src/
│   ├── app/
│   │   ├── store.ts               # Redux store config
│   │   ├── api.ts                 # Axios instance + interceptors
│   │   └── hooks.ts               # Redux typed hooks
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── authSlice.ts       # Redux slice (user, token, role)
│   │   │   ├── authApi.ts         # React Query hooks (login, register, refresh)
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   └── components/
│   │   │       ├── LoginForm.tsx
│   │   │       └── RegisterForm.tsx
│   │   │
│   │   ├── supplements/
│   │   │   ├── cartSlice.ts       # Redux slice (cart with redux-persist)
│   │   │   ├── supplementApi.ts   # React Query hooks
│   │   │   ├── StorePage.tsx
│   │   │   ├── SupplementDetail.tsx
│   │   │   └── components/
│   │   │       ├── ProductCard.tsx
│   │   │       ├── ProductFilters.tsx
│   │   │       ├── ProductReview.tsx
│   │   │       └── CartDrawer.tsx
│   │   │
│   │   ├── memberships/
│   │   │   ├── membershipApi.ts
│   │   │   ├── PricingPage.tsx
│   │   │   ├── MyMembership.tsx
│   │   │   └── components/
│   │   │       ├── PlanCard.tsx
│   │   │       └── MembershipHistory.tsx
│   │   │
│   │   ├── coaches/
│   │   │   ├── coachApi.ts
│   │   │   ├── CoachList.tsx
│   │   │   ├── CoachDetail.tsx
│   │   │   └── components/
│   │   │       ├── CoachCard.tsx
│   │   │       ├── CoachSchedule.tsx
│   │   │       └── CoachReview.tsx
│   │   │
│   │   ├── bookings/
│   │   │   ├── bookingApi.ts
│   │   │   ├── MyBookings.tsx
│   │   │   └── components/
│   │   │       ├── BookingCard.tsx
│   │   │       └── BookingForm.tsx
│   │   │
│   │   ├── orders/
│   │   │   ├── orderApi.ts
│   │   │   ├── MyOrders.tsx
│   │   │   ├── OrderDetail.tsx
│   │   │   └── components/
│   │   │       └── OrderCard.tsx
│   │   │
│   │   ├── workouts/
│   │   │   ├── workoutApi.ts
│   │   │   ├── MyWorkouts.tsx
│   │   │   ├── WorkoutDetail.tsx
│   │   │   └── components/
│   │   │       ├── WorkoutCard.tsx
│   │   │       └── ExerciseList.tsx
│   │   │
│   │   ├── diets/
│   │   │   ├── dietApi.ts
│   │   │   ├── MyDietPlans.tsx
│   │   │   ├── DietPlanDetail.tsx
│   │   │   └── components/
│   │   │       ├── DietCard.tsx
│   │   │       └── MealList.tsx
│   │   │
│   │   ├── blogs/
│   │   │   ├── blogApi.ts
│   │   │   ├── BlogList.tsx
│   │   │   ├── BlogDetail.tsx
│   │   │   └── components/
│   │   │       ├── BlogCard.tsx
│   │   │       └── BlogSidebar.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── MemberDashboard.tsx
│   │   │   ├── CoachDashboard.tsx
│   │   │   └── AdminDashboard.tsx
│   │   │
│   │   └── profile/
│   │       ├── MemberProfile.tsx
│   │       ├── CoachProfile.tsx
│   │       └── components/
│   │           ├── ProfileForm.tsx
│   │           └── AvatarUpload.tsx
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── PageHeader.tsx
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── Pagination.tsx
│   │   │   ├── StarRating.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Tabs.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   └── ErrorState.tsx
│   │   └── forms/
│   │       ├── SearchInput.tsx
│   │       ├── SelectFilter.tsx
│   │       └── AvatarUpload.tsx
│   │
│   ├── routes/
│   │   ├── AppRoutes.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── RoleGuard.tsx
│   │
│   ├── types/
│   │   ├── auth.types.ts
│   │   ├── supplement.types.ts
│   │   ├── order.types.ts
│   │   ├── membership.types.ts
│   │   ├── coach.types.ts
│   │   ├── booking.types.ts
│   │   ├── workout.types.ts
│   │   ├── diet.types.ts
│   │   ├── blog.types.ts
│   │   └── api.types.ts
│   │
│   ├── utils/
│   │   ├── formatCurrency.ts
│   │   ├── formatDate.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
└── package.json
```

---

## 16. GYMFIT V2 ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Frontend - React + Vite + TS)                         │
│                                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐      │
│  │                        React Router (SPA) + Route Guards                        │      │
│  │                                                                                 │      │
│  │  PUBLIC: / /store /coaches /blogs /pricing /login /register                     │      │
│  │  MEMBER: /member/dashboard /member/membership /member/orders /member/bookings   │      │
│  │          /member/workouts /member/diets /member/profile                         │      │
│  │  COACH:  /coach/dashboard /coach/schedules /coach/bookings /coach/workouts      │      │
│  │          /coach/diets /coach/profile                                            │      │
│  │  ADMIN:  /admin/dashboard /admin/users /admin/coaches /admin/memberships        │      │
│  │          /admin/bookings /admin/orders /admin/supplements /admin/blogs /admin/analytics │
│  └─────────────────────────────────────────────────────────────────────────────────┘      │
│                                    │                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐      │
│  │                         State Management                                        │      │
│  │  • Redux Toolkit: authSlice (user, token), cartSlice (cart, persist), uiSlice   │      │
│  │  • React Query: supplementApi, coachApi, bookingApi, orderApi, workoutApi, ...  │      │
│  │  • React Hook Form: LoginForm, RegisterForm, BookingForm, ...                    │      │
│  └─────────────────────────────────────────────────────────────────────────────────┘      │
│                                    │                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐      │
│  │                         API Layer (Axios + Interceptors)                        │      │
│  │  • Bearer token interceptor                                                     │      │
│  │  • 401 → Refresh token → Retry logic                                            │      │
│  └───────┬─────────────────────────────────────────────────────────────────────────┘      │
└──────────┼──────────────────────────────────────────────────────────────────────────────────┘
           │ HTTP/JSON (Bearer Token in Header)
           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  SERVER (Backend)                                          │
│                           Node.js + Express + TypeScript                                   │
│                                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐      │
│  │                              Middleware Pipeline                               │      │
│  │  → cors → rateLimiter → json parser → urlencoded → authMiddleware              │      │
│  │  → requireRole() → validateRequest → Controller → Error Handler                │      │
│  └─────────────────────────────────────────────────────────────────────────────────┘      │
│                                    │                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐      │
│  │                          Route Modules (12 modules)                             │      │
│  │  /api/auth   → auth routes     /api/users    → user routes                      │      │
│  │  /api/memberships → membership routes          /api/coaches  → coach routes     │      │
│  │  /api/bookings→ booking routes /api/supplements→ supplement routes              │      │
│  │  /api/orders  → order routes    /api/payments → payment routes                  │      │
│  │  /api/workouts→ workout routes /api/diets     → diet routes                     │      │
│  │  /api/blogs   → blog routes    /api/admin    → admin routes                     │      │
│  └─────────────────────────────────────────────────────────────────────────────────┘      │
│                                    │                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐      │
│  │                      Layer Architecture (Controller → Service → Repository)    │      │
│  │                                                                                 │      │
│  │  Controllers: HTTP logic, request parsing, response sending                     │      │
│  │       ↓                                                                         │      │
│  │  Services: Business logic, validation, orchestration                            │      │
│  │       ↓                                                                         │      │
│  │  Repositories: SQL queries, data access (mssql)                                 │      │
│  └─────────────────────────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
           │                                    │
           ▼                                    ▼
┌─────────────────────────┐      ┌─────────────────────────────────────┐
│  MS SQL Server 2019+    │      │      Third-party Services           │
│                         │      │                                     │
│  ┌──────────────────────┐│      │  ┌─────────────────────────────┐  │
│  │     GymFit DB        ││      │  │    Stripe                   │  │
│  │                      ││      │  │  • Checkout Sessions        │  │
│  │  16 Tables:          ││      │  │  • Products & Prices        │  │
│  │  • Roles             ││      │  │  • Webhooks                 │  │
│  │  • Users             ││      │  └─────────────────────────────┘  │
│  │  • RefreshTokens     ││      │                                     │
│  │  • MembershipPlans   ││      │  ┌─────────────────────────────┐  │
│  │  • Memberships       ││      │  │    Cloudinary               │  │
│  │  • Coaches           ││      │  │  • Image upload & hosting   │  │
│  │  • CoachSchedules    ││      │  └─────────────────────────────┘  │
│  │  • Bookings          ││      │                                     │
│  │  • SupplementCats    ││      │                                     │
│  │  • Supplements       ││      │                                     │
│  │  • Orders            ││      │                                     │
│  │  • OrderItems        ││      │                                     │
│  │  • Payments          ││      │                                     │
│  │  • WorkoutPrograms   ││      │                                     │
│  │  • DietPlans         ││      │                                     │
│  │  • Blogs             ││      │                                     │
│  │  • Reviews           ││      │                                     │
│  └──────────────────────┘│      └─────────────────────────────────────┘
└─────────────────────────┘

### Luồng dữ liệu chính GymFit V2:

#### 1. Luồng Authentication (JWT)
```
User → Login Form → POST /api/auth/login → bcrypt verify
→ Generate JWT Access Token (15m) + Refresh Token (7d)
→ Save Refresh Token in DB → Response: { accessToken, refreshToken, user }
→ Client lưu accessToken trong memory, refreshToken trong httpOnly cookie
→ Mỗi request gửi accessToken trong Authorization header
→ Khi 401: Gọi /api/auth/refresh → Get new accessToken
→ Logout: Gọi /api/auth/logout → Revoke refreshToken
```

#### 2. Luồng Member mua Supplement
```
Member → Browse Store → Add to Cart (Redux) → Checkout
→ POST /api/orders/checkout → Backend tạo Stripe Checkout Session
→ Redirect đến Stripe → Thanh toán → Stripe Webhook
→ Webhook tạo Order + OrderItems + Payment trong DB
→ Member xem order tại /member/orders
```

#### 3. Luồng Member đăng ký Membership
```
Member → Browse Pricing Page → Chọn gói → POST /api/memberships/register
→ Backend tạo Stripe Checkout Session → Thanh toán
→ Stripe Webhook → Tạo Membership record trong DB
→ Member xem membership tại /member/membership
→ Hệ thống tự động check expiry (cron job / middleware)
```

#### 4. Luồng Member đặt lịch với Coach
```
Member → Browse Coaches → Chọn coach → Xem lịch rảnh
→ Chọn khung giờ → POST /api/bookings
→ Backend: check conflict → mark schedule IsBooked=true
→ Tạo Booking record → Thanh toán (nếu required)
→ Coach xem booking tại /coach/bookings
→ Member xem tại /member/bookings
```

#### 5. Luồng Coach tạo Workout/Diet Plan
```
Coach → Chọn member → Tạo Workout Program
→ POST /api/workouts { memberId, title, exercises, ... }
→ Member thấy workout tại /member/workouts/:id
→ Member có thể đánh dấu bài tập hoàn thành
→ Tương tự với Diet Plan
```

#### 6. Luồng Admin Dashboard
```
Admin Login → /admin/dashboard
→ GET /api/admin/dashboard/stats → Users count, Revenue, Active Memberships
→ GET /api/admin/dashboard/revenue → Monthly revenue chart data
→ Quản lý tất cả modules qua các CRUD pages
```

---

## 17. DEVELOPMENT ROADMAP

### Phase 1: Foundation (Week 1-2)
- [ ] Cài đặt SQL Server + SSMS
- [ ] Tạo GymFit.sql với toàn bộ schema
- [ ] Setup backend project structure (Express + TypeScript)
- [ ] Setup database connection (mssql)
- [ ] Implement Auth module (Register, Login, Logout, Refresh Token)
- [ ] Implement User CRUD

### Phase 2: Supplement Store (Week 2-3)
- [ ] Implement SupplementCategories CRUD
- [ ] Implement Supplements CRUD + Stripe integration
- [ ] Implement Cart (Redux) + Checkout (Stripe)
- [ ] Implement Orders + OrderItems
- [ ] Implement Payments + Stripe Webhook
- [ ] Xây dựng Frontend: StorePage, SupplementDetail, Cart, Checkout

### Phase 3: Membership + Coach (Week 3-4)
- [ ] Implement MembershipPlans CRUD
- [ ] Implement Memberships (register, stripe payment)
- [ ] Implement Coaches CRUD + profile
- [ ] Implement CoachSchedules
- [ ] Implement Bookings (create, confirm, cancel)
- [ ] Xây dựng Frontend: PricingPage, CoachList, Booking system

### Phase 4: Workout + Diet + Blog (Week 4-5)
- [ ] Implement WorkoutPrograms CRUD
- [ ] Implement DietPlans CRUD
- [ ] Implement Blogs CRUD
- [ ] Implement Reviews
- [ ] Xây dựng Frontend: Workout/Diets UI, Blog system

### Phase 5: Dashboard + Admin (Week 5-6)
- [ ] Implement Admin analytics endpoints
- [ ] Xây dựng Admin Dashboard UI
- [ ] Xây dựng Coach Dashboard UI
- [ ] Xây dựng Member Dashboard UI
- [ ] Testing & Bug fixes

### Phase 6: Polish (Week 6-7)
- [ ] Rate limiting & Security audit
- [ ] Error handling & Validation hoàn thiện
- [ ] Seed data script
- [ ] README, documentation
- [ ] Deploy preparation

---

## 18. SUMMARY

### GoShop → GymFit V2 Migration

| Hạng mục | GoShop (cũ) | GymFit V2 (mới) |
|----------|------------|-----------------|
| Database | MySQL | SQL Server 2019+ |
| ORM | Prisma | Raw SQL (mssql) |
| Auth | Firebase Auth | JWT + Refresh Token |
| Tables | 4 (User, Product, Category, Order) | 16 (Roles, Users, RefreshTokens, MembershipPlans, Memberships, Coaches, CoachSchedules, Bookings, SupplementCategories, Supplements, Orders, OrderItems, Payments, WorkoutPrograms, DietPlans, Blogs, Reviews) |
| API Endpoints | ~20 | ~50 |
| Frontend Pages | 9 | ~40 |
| Roles | 2 (USER, ADMIN) | 3 (MEMBER, COACH, ADMIN) |
| Business Modules | Store, Cart, Orders | Store, Memberships, Coach, Booking, Workout, Diet, Blog, Dashboard |

### Giữ lại
- React + TypeScript + Vite
- Express + TypeScript
- Redux Toolkit + React Query
- TailwindCSS + React Hook Form
- Cloudinary + Stripe

### Thêm mới
- SQL Server
- JWT Authentication + Refresh Token
- Membership, Coach, Booking, Workout, Diet, Blog modules
- 3-layer backend architecture (Controller → Service → Repository)

---

*Tài liệu này là blueprint thiết kế kiến trúc cho GymFit V2. 
Dùng làm tài liệu tham khảo cho toàn bộ quá trình phát triển.*