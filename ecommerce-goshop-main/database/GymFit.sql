-- ============================================================
-- GymFit V2 - SQL Server Database Script
-- Target: Microsoft SQL Server 2019+
-- Collation: SQL_Latin1_General_CP1_CI_AS
-- ============================================================

-- ============================================================
-- CREATE DATABASE
-- ============================================================
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'GymFit')
BEGIN
    CREATE DATABASE [GymFit]
    COLLATE SQL_Latin1_General_CP1_CI_AS;
END
GO

USE [GymFit];
GO

-- ============================================================
-- ENUMS (via CHECK Constraints & Reference Tables)
-- ============================================================

-- Roles: ADMIN, COACH, MEMBER
-- MembershipStatus: ACTIVE, EXPIRED, CANCELLED
-- BookingStatus: PENDING, CONFIRMED, COMPLETED, CANCELLED
-- PaymentStatus: PENDING, SUCCEEDED, FAILED, REFUNDED
-- OrderStatus: PENDING, PROCESSING, COMPLETED, CANCELLED
-- PaymentType: ORDER, MEMBERSHIP, BOOKING
-- WorkoutDifficulty: BEGINNER, INTERMEDIATE, ADVANCED
-- WorkoutStatus: ACTIVE, COMPLETED, ARCHIVED
-- DietStatus: ACTIVE, COMPLETED, ARCHIVED
-- BlogStatus: DRAFT, PUBLISHED, ARCHIVED

-- ============================================================
-- 1. Roles
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Roles]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Roles] (
        [Id]          INT            IDENTITY(1,1) NOT NULL,
        [Name]        NVARCHAR(50)   NOT NULL,
        [Description] NVARCHAR(255)  NULL,
        [CreatedAt]   DATETIME2      NOT NULL CONSTRAINT [DF_Roles_CreatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_Roles] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UQ_Roles_Name] UNIQUE ([Name])
    );
END
GO

-- ============================================================
-- 2. Users
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Users] (
        [Id]           INT            IDENTITY(1,1) NOT NULL,
        [Email]        NVARCHAR(255)  NOT NULL,
        [PasswordHash] NVARCHAR(500)  NOT NULL,
        [FullName]     NVARCHAR(100)  NOT NULL,
        [Phone]        NVARCHAR(20)   NULL,
        [Avatar]       NVARCHAR(500)  NULL,
        [RoleId]       INT            NOT NULL,
        [IsActive]     BIT            NOT NULL CONSTRAINT [DF_Users_IsActive] DEFAULT 1,
        [CreatedAt]    DATETIME2      NOT NULL CONSTRAINT [DF_Users_CreatedAt] DEFAULT GETUTCDATE(),
        [UpdatedAt]    DATETIME2      NOT NULL CONSTRAINT [DF_Users_UpdatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_Users] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UQ_Users_Email] UNIQUE ([Email]),
        CONSTRAINT [FK_Users_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [dbo].[Roles]([Id])
    );
END
GO

-- ============================================================
-- 3. RefreshTokens
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[RefreshTokens]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[RefreshTokens] (
        [Id]        INT            IDENTITY(1,1) NOT NULL,
        [UserId]    INT            NOT NULL,
        [Token]     NVARCHAR(500)  NOT NULL,
        [ExpiresAt] DATETIME2      NOT NULL,
        [IsRevoked] BIT            NOT NULL CONSTRAINT [DF_RefreshTokens_IsRevoked] DEFAULT 0,
        [CreatedAt] DATETIME2      NOT NULL CONSTRAINT [DF_RefreshTokens_CreatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_RefreshTokens] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UQ_RefreshTokens_Token] UNIQUE ([Token]),
        CONSTRAINT [FK_RefreshTokens_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id])
    );
END
GO

-- ============================================================
-- 4. MembershipPlans
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[MembershipPlans]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[MembershipPlans] (
        [Id]                       INT            IDENTITY(1,1) NOT NULL,
        [Name]                     NVARCHAR(100)  NOT NULL,
        [Description]              NVARCHAR(1000) NULL,
        [DurationDays]             INT            NOT NULL,
        [Price]                    DECIMAL(10,2)  NOT NULL,
        [MaxSessionsPerWeek]       INT            NULL,
        [IncludesPersonalTraining] BIT            NOT NULL CONSTRAINT [DF_MembershipPlans_IncludesPT] DEFAULT 0,
        [IncludesDietPlan]         BIT            NOT NULL CONSTRAINT [DF_MembershipPlans_IncludesDiet] DEFAULT 0,
        [IsActive]                 BIT            NOT NULL CONSTRAINT [DF_MembershipPlans_IsActive] DEFAULT 1,
        [CreatedAt]                DATETIME2      NOT NULL CONSTRAINT [DF_MembershipPlans_CreatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_MembershipPlans] PRIMARY KEY CLUSTERED ([Id])
    );
END
GO

-- ============================================================
-- 5. Memberships
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Memberships]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Memberships] (
        [Id]               INT            IDENTITY(1,1) NOT NULL,
        [UserId]           INT            NOT NULL,
        [PlanId]           INT            NOT NULL,
        [StartDate]        DATE           NOT NULL,
        [EndDate]          DATE           NOT NULL,
        [Status]           NVARCHAR(20)   NOT NULL CONSTRAINT [DF_Memberships_Status] DEFAULT 'ACTIVE',
        [StripePaymentId]  NVARCHAR(255)  NULL,
        [CreatedAt]        DATETIME2      NOT NULL CONSTRAINT [DF_Memberships_CreatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_Memberships] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [FK_Memberships_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]),
        CONSTRAINT [FK_Memberships_PlanId] FOREIGN KEY ([PlanId]) REFERENCES [dbo].[MembershipPlans]([Id]),
        CONSTRAINT [CK_Memberships_Status] CHECK ([Status] IN ('ACTIVE', 'EXPIRED', 'CANCELLED'))
    );
END
GO

-- ============================================================
-- 6. Coaches
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Coaches]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Coaches] (
        [Id]               INT            IDENTITY(1,1) NOT NULL,
        [UserId]           INT            NOT NULL,
        [Specialization]   NVARCHAR(255)  NULL,
        [Bio]              NVARCHAR(2000) NULL,
        [ExperienceYears]  INT            NULL,
        [HourlyRate]       DECIMAL(10,2)  NULL,
        [Certifications]   NVARCHAR(1000) NULL,
        [IsAvailable]      BIT            NOT NULL CONSTRAINT [DF_Coaches_IsAvailable] DEFAULT 1,
        [Rating]           DECIMAL(2,1)   NOT NULL CONSTRAINT [DF_Coaches_Rating] DEFAULT 0.0,
        [CreatedAt]        DATETIME2      NOT NULL CONSTRAINT [DF_Coaches_CreatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_Coaches] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UQ_Coaches_UserId] UNIQUE ([UserId]),
        CONSTRAINT [FK_Coaches_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]),
        CONSTRAINT [CK_Coaches_Rating] CHECK ([Rating] >= 0.0 AND [Rating] <= 5.0)
    );
END
GO

-- ============================================================
-- 7. CoachSchedules
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CoachSchedules]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[CoachSchedules] (
        [Id]           INT       IDENTITY(1,1) NOT NULL,
        [CoachId]      INT       NOT NULL,
        [DayOfWeek]    TINYINT   NOT NULL,
        [StartTime]    TIME(0)   NOT NULL,
        [EndTime]      TIME(0)   NOT NULL,
        [IsBooked]     BIT       NOT NULL CONSTRAINT [DF_CoachSchedules_IsBooked] DEFAULT 0,
        [SpecificDate] DATE      NULL,
        [CreatedAt]    DATETIME2 NOT NULL CONSTRAINT [DF_CoachSchedules_CreatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_CoachSchedules] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [FK_CoachSchedules_CoachId] FOREIGN KEY ([CoachId]) REFERENCES [dbo].[Coaches]([Id]),
        CONSTRAINT [CK_CoachSchedules_DayOfWeek] CHECK ([DayOfWeek] >= 0 AND [DayOfWeek] <= 6)
    );
END
GO

-- ============================================================
-- 8. Bookings
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Bookings]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Bookings] (
        [Id]               INT            IDENTITY(1,1) NOT NULL,
        [MemberId]         INT            NOT NULL,
        [CoachId]          INT            NOT NULL,
        [ScheduleId]       INT            NOT NULL,
        [BookingDate]      DATE           NOT NULL,
        [StartTime]        TIME(0)        NOT NULL,
        [EndTime]          TIME(0)        NOT NULL,
        [Status]           NVARCHAR(20)   NOT NULL CONSTRAINT [DF_Bookings_Status] DEFAULT 'CONFIRMED',
        [Notes]            NVARCHAR(500)  NULL,
        [StripePaymentId]  NVARCHAR(255)  NULL,
        [CreatedAt]        DATETIME2      NOT NULL CONSTRAINT [DF_Bookings_CreatedAt] DEFAULT GETUTCDATE(),
        [UpdatedAt]        DATETIME2      NOT NULL CONSTRAINT [DF_Bookings_UpdatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_Bookings] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UQ_Bookings_ScheduleId] UNIQUE ([ScheduleId]),
        CONSTRAINT [FK_Bookings_MemberId] FOREIGN KEY ([MemberId]) REFERENCES [dbo].[Users]([Id]),
        CONSTRAINT [FK_Bookings_CoachId] FOREIGN KEY ([CoachId]) REFERENCES [dbo].[Coaches]([Id]),
        CONSTRAINT [FK_Bookings_ScheduleId] FOREIGN KEY ([ScheduleId]) REFERENCES [dbo].[CoachSchedules]([Id]),
        CONSTRAINT [CK_Bookings_Status] CHECK ([Status] IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'))
    );
END
GO

-- ============================================================
-- 9. SupplementCategories
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SupplementCategories]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[SupplementCategories] (
        [Id]          INT            IDENTITY(1,1) NOT NULL,
        [Name]        NVARCHAR(100)  NOT NULL,
        [Description] NVARCHAR(500)  NULL,
        [Image]       NVARCHAR(500)  NULL,
        [IsActive]    BIT            NOT NULL CONSTRAINT [DF_SupplementCategories_IsActive] DEFAULT 1,
        [CreatedAt]   DATETIME2      NOT NULL CONSTRAINT [DF_SupplementCategories_CreatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_SupplementCategories] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UQ_SupplementCategories_Name] UNIQUE ([Name])
    );
END
GO

-- ============================================================
-- 10. Supplements
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Supplements]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Supplements] (
        [Id]              INT            IDENTITY(1,1) NOT NULL,
        [Name]            NVARCHAR(200)  NOT NULL,
        [Description]     NVARCHAR(MAX)  NULL,
        [Price]           DECIMAL(10,2)  NOT NULL,
        [StockQuantity]   INT            NOT NULL CONSTRAINT [DF_Supplements_StockQuantity] DEFAULT 0,
        [Image]           NVARCHAR(500)  NULL,
        [CategoryId]      INT            NULL,
        [Brand]           NVARCHAR(100)  NULL,
        [Weight]          NVARCHAR(50)   NULL,
        [Flavor]          NVARCHAR(100)  NULL,
        [StripePriceId]   NVARCHAR(255)  NULL,
        [StripeProductId] NVARCHAR(255)  NULL,
        [IsActive]        BIT            NOT NULL CONSTRAINT [DF_Supplements_IsActive] DEFAULT 1,
        [CreatedAt]       DATETIME2      NOT NULL CONSTRAINT [DF_Supplements_CreatedAt] DEFAULT GETUTCDATE(),
        [UpdatedAt]       DATETIME2      NOT NULL CONSTRAINT [DF_Supplements_UpdatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_Supplements] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [FK_Supplements_CategoryId] FOREIGN KEY ([CategoryId]) REFERENCES [dbo].[SupplementCategories]([Id])
    );
END
GO

-- ============================================================
-- 11. Orders
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Orders]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Orders] (
        [Id]               INT            IDENTITY(1,1) NOT NULL,
        [UserId]           INT            NOT NULL,
        [TotalAmount]      DECIMAL(10,2)  NOT NULL,
        [Status]           NVARCHAR(20)   NOT NULL CONSTRAINT [DF_Orders_Status] DEFAULT 'PENDING',
        [ShippingAddress]  NVARCHAR(500)  NULL,
        [Phone]            NVARCHAR(20)   NULL,
        [Notes]            NVARCHAR(500)  NULL,
        [StripeSessionId]  NVARCHAR(255)  NULL,
        [CreatedAt]        DATETIME2      NOT NULL CONSTRAINT [DF_Orders_CreatedAt] DEFAULT GETUTCDATE(),
        [UpdatedAt]        DATETIME2      NOT NULL CONSTRAINT [DF_Orders_UpdatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_Orders] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UQ_Orders_StripeSessionId] UNIQUE ([StripeSessionId]),
        CONSTRAINT [FK_Orders_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]),
        CONSTRAINT [CK_Orders_Status] CHECK ([Status] IN ('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'))
    );
END
GO

-- ============================================================
-- 12. OrderItems
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[OrderItems]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[OrderItems] (
        [Id]           INT            IDENTITY(1,1) NOT NULL,
        [OrderId]      INT            NOT NULL,
        [SupplementId] INT            NOT NULL,
        [Quantity]     INT            NOT NULL,
        [UnitPrice]    DECIMAL(10,2)  NOT NULL,
        [Subtotal]     DECIMAL(10,2)  NOT NULL,
        [CreatedAt]    DATETIME2      NOT NULL CONSTRAINT [DF_OrderItems_CreatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_OrderItems] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [FK_OrderItems_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [dbo].[Orders]([Id]),
        CONSTRAINT [FK_OrderItems_SupplementId] FOREIGN KEY ([SupplementId]) REFERENCES [dbo].[Supplements]([Id])
    );
END
GO

-- ============================================================
-- 13. Payments
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Payments]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Payments] (
        [Id]                    INT            IDENTITY(1,1) NOT NULL,
        [OrderId]               INT            NULL,
        [UserId]                INT            NOT NULL,
        [Amount]                DECIMAL(10,2)  NOT NULL,
        [Currency]              NVARCHAR(3)    NOT NULL CONSTRAINT [DF_Payments_Currency] DEFAULT 'USD',
        [PaymentMethod]         NVARCHAR(50)   NULL,
        [StripePaymentIntentId] NVARCHAR(255)  NULL,
        [StripeSessionId]       NVARCHAR(255)  NULL,
        [Status]                NVARCHAR(20)   NOT NULL CONSTRAINT [DF_Payments_Status] DEFAULT 'PENDING',
        [PaymentType]           NVARCHAR(20)   NOT NULL,
        [CreatedAt]             DATETIME2      NOT NULL CONSTRAINT [DF_Payments_CreatedAt] DEFAULT GETUTCDATE(),
        [UpdatedAt]             DATETIME2      NOT NULL CONSTRAINT [DF_Payments_UpdatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_Payments] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UQ_Payments_StripePaymentIntentId] UNIQUE ([StripePaymentIntentId]),
        CONSTRAINT [FK_Payments_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [dbo].[Orders]([Id]),
        CONSTRAINT [FK_Payments_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]),
        CONSTRAINT [CK_Payments_Status] CHECK ([Status] IN ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED')),
        CONSTRAINT [CK_Payments_PaymentType] CHECK ([PaymentType] IN ('ORDER', 'MEMBERSHIP', 'BOOKING'))
    );
END
GO

-- ============================================================
-- 14. WorkoutPrograms
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[WorkoutPrograms]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[WorkoutPrograms] (
        [Id]             INT            IDENTITY(1,1) NOT NULL,
        [MemberId]       INT            NULL,
        [CoachId]        INT            NULL,
        [Title]          NVARCHAR(200)  NOT NULL,
        [Description]    NVARCHAR(MAX)  NULL,
        [Exercises]      NVARCHAR(MAX)  NOT NULL,
        [DurationWeeks]  INT            NOT NULL,
        [Difficulty]     NVARCHAR(20)   NOT NULL CONSTRAINT [DF_WorkoutPrograms_Difficulty] DEFAULT 'BEGINNER',
        [Status]         NVARCHAR(20)   NOT NULL CONSTRAINT [DF_WorkoutPrograms_Status] DEFAULT 'ACTIVE',
        [CreatedBy]      NVARCHAR(20)   NOT NULL CONSTRAINT [DF_WorkoutPrograms_CreatedBy] DEFAULT 'ADMIN',
        [CreatedAt]      DATETIME2      NOT NULL CONSTRAINT [DF_WorkoutPrograms_CreatedAt] DEFAULT GETUTCDATE(),
        [UpdatedAt]      DATETIME2      NOT NULL CONSTRAINT [DF_WorkoutPrograms_UpdatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_WorkoutPrograms] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [FK_WorkoutPrograms_MemberId] FOREIGN KEY ([MemberId]) REFERENCES [dbo].[Users]([Id]),
        CONSTRAINT [FK_WorkoutPrograms_CoachId] FOREIGN KEY ([CoachId]) REFERENCES [dbo].[Coaches]([Id]),
        CONSTRAINT [CK_WorkoutPrograms_Difficulty] CHECK ([Difficulty] IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
        CONSTRAINT [CK_WorkoutPrograms_Status] CHECK ([Status] IN ('ACTIVE', 'COMPLETED', 'ARCHIVED'))
    );
END
GO

-- ============================================================
-- 15. WorkoutProgramExercises
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[WorkoutProgramExercises]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[WorkoutProgramExercises] (
        [Id]           INT            IDENTITY(1,1) NOT NULL,
        [ProgramId]    INT            NOT NULL,
        [WeekNumber]   INT            NOT NULL CONSTRAINT [DF_WPE_WeekNumber] DEFAULT 1,
        [DayNumber]    INT            NOT NULL CONSTRAINT [DF_WPE_DayNumber] DEFAULT 1,
        [ExerciseName] NVARCHAR(200)  NOT NULL,
        [Sets]         INT            NOT NULL CONSTRAINT [DF_WPE_Sets] DEFAULT 0,
        [Reps]         INT            NOT NULL CONSTRAINT [DF_WPE_Reps] DEFAULT 0,
        [RestSeconds]  INT            NULL,
        [Notes]        NVARCHAR(500)  NULL,
        [OrderIndex]   INT            NOT NULL CONSTRAINT [DF_WPE_OrderIndex] DEFAULT 0,
        [CreatedAt]    DATETIME2      NOT NULL CONSTRAINT [DF_WPE_CreatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_WPE] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [FK_WPE_ProgramId] FOREIGN KEY ([ProgramId]) REFERENCES [dbo].[WorkoutPrograms]([Id]) ON DELETE CASCADE
    );
END
GO

-- ============================================================
-- 16. WorkoutProgramFavorites
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[WorkoutProgramFavorites]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[WorkoutProgramFavorites] (
        [Id]        INT       IDENTITY(1,1) NOT NULL,
        [UserId]    INT       NOT NULL,
        [ProgramId] INT       NOT NULL,
        [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_WPF_CreatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_WPF] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UQ_WPF_UserProgram] UNIQUE ([UserId], [ProgramId]),
        CONSTRAINT [FK_WPF_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]),
        CONSTRAINT [FK_WPF_ProgramId] FOREIGN KEY ([ProgramId]) REFERENCES [dbo].[WorkoutPrograms]([Id])
    );
END
GO

-- ============================================================
-- 17. WorkoutProgramSaves
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[WorkoutProgramSaves]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[WorkoutProgramSaves] (
        [Id]        INT       IDENTITY(1,1) NOT NULL,
        [UserId]    INT       NOT NULL,
        [ProgramId] INT       NOT NULL,
        [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_WPS_CreatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_WPS] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UQ_WPS_UserProgram] UNIQUE ([UserId], [ProgramId]),
        CONSTRAINT [FK_WPS_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]),
        CONSTRAINT [FK_WPS_ProgramId] FOREIGN KEY ([ProgramId]) REFERENCES [dbo].[WorkoutPrograms]([Id])
    );
END
GO

-- ============================================================
-- 18. DietPlans
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DietPlans]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[DietPlans] (
        [Id]            INT            IDENTITY(1,1) NOT NULL,
        [MemberId]      INT            NOT NULL,
        [CoachId]       INT            NULL,
        [Title]         NVARCHAR(200)  NOT NULL,
        [Description]   NVARCHAR(MAX)  NULL,
        [DailyCalories] INT            NULL,
        [Meals]         NVARCHAR(MAX)  NOT NULL,
        [DurationDays]  INT            NOT NULL,
        [Status]        NVARCHAR(20)   NOT NULL CONSTRAINT [DF_DietPlans_Status] DEFAULT 'ACTIVE',
        [CreatedAt]     DATETIME2      NOT NULL CONSTRAINT [DF_DietPlans_CreatedAt] DEFAULT GETUTCDATE(),
        [UpdatedAt]     DATETIME2      NOT NULL CONSTRAINT [DF_DietPlans_UpdatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_DietPlans] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [FK_DietPlans_MemberId] FOREIGN KEY ([MemberId]) REFERENCES [dbo].[Users]([Id]),
        CONSTRAINT [FK_DietPlans_CoachId] FOREIGN KEY ([CoachId]) REFERENCES [dbo].[Coaches]([Id]),
        CONSTRAINT [CK_DietPlans_Status] CHECK ([Status] IN ('ACTIVE', 'COMPLETED', 'ARCHIVED'))
    );
END
GO

-- ============================================================
-- 19. DietPlanSaves
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DietPlanSaves]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[DietPlanSaves] (
        [Id]         INT       IDENTITY(1,1) NOT NULL,
        [UserId]     INT       NOT NULL,
        [DietPlanId] INT       NOT NULL,
        [CreatedAt]  DATETIME2 NOT NULL CONSTRAINT [DF_DietPlanSaves_CreatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_DietPlanSaves] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UQ_DietPlanSaves_UserPlan] UNIQUE ([UserId], [DietPlanId]),
        CONSTRAINT [FK_DietPlanSaves_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]),
        CONSTRAINT [FK_DietPlanSaves_DietPlanId] FOREIGN KEY ([DietPlanId]) REFERENCES [dbo].[DietPlans]([Id])
    );
END
GO

-- ============================================================
-- 20. Blogs
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Blogs]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Blogs] (
        [Id]          INT            IDENTITY(1,1) NOT NULL,
        [AuthorId]    INT            NOT NULL,
        [Title]       NVARCHAR(300)  NOT NULL,
        [Slug]        NVARCHAR(300)  NOT NULL,
        [Content]     NVARCHAR(MAX)  NOT NULL,
        [Excerpt]     NVARCHAR(500)  NULL,
        [CoverImage]  NVARCHAR(500)  NULL,
        [Tags]        NVARCHAR(500)  NULL,
        [Status]      NVARCHAR(20)   NOT NULL CONSTRAINT [DF_Blogs_Status] DEFAULT 'DRAFT',
        [ViewCount]   INT            NOT NULL CONSTRAINT [DF_Blogs_ViewCount] DEFAULT 0,
        [PublishedAt] DATETIME2      NULL,
        [CreatedAt]   DATETIME2      NOT NULL CONSTRAINT [DF_Blogs_CreatedAt] DEFAULT GETUTCDATE(),
        [UpdatedAt]   DATETIME2      NOT NULL CONSTRAINT [DF_Blogs_UpdatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_Blogs] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UQ_Blogs_Slug] UNIQUE ([Slug]),
        CONSTRAINT [FK_Blogs_AuthorId] FOREIGN KEY ([AuthorId]) REFERENCES [dbo].[Users]([Id]),
        CONSTRAINT [CK_Blogs_Status] CHECK ([Status] IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
    );
END
GO

-- ============================================================
-- 21. BlogComments
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[BlogComments]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[BlogComments] (
        [Id]        INT            IDENTITY(1,1) NOT NULL,
        [BlogId]    INT            NOT NULL,
        [UserId]    INT            NOT NULL,
        [Content]   NVARCHAR(1000) NOT NULL,
        [CreatedAt] DATETIME2      NOT NULL CONSTRAINT [DF_BlogComments_CreatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_BlogComments] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [FK_BlogComments_BlogId] FOREIGN KEY ([BlogId]) REFERENCES [dbo].[Blogs]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_BlogComments_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id])
    );
END
GO

-- ============================================================
-- 22. BlogLikes
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[BlogLikes]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[BlogLikes] (
        [Id]        INT       IDENTITY(1,1) NOT NULL,
        [BlogId]    INT       NOT NULL,
        [UserId]    INT       NOT NULL,
        [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_BlogLikes_CreatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_BlogLikes] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UQ_BlogLikes_UserBlog] UNIQUE ([BlogId], [UserId]),
        CONSTRAINT [FK_BlogLikes_BlogId] FOREIGN KEY ([BlogId]) REFERENCES [dbo].[Blogs]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_BlogLikes_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id])
    );
END
GO

-- ============================================================
-- 23. Reviews
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Reviews]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Reviews] (
        [Id]           INT            IDENTITY(1,1) NOT NULL,
        [UserId]       INT            NOT NULL,
        [CoachId]      INT            NULL,
        [SupplementId] INT            NULL,
        [Rating]       TINYINT        NOT NULL,
        [Comment]      NVARCHAR(1000) NULL,
        [IsApproved]   BIT            NOT NULL CONSTRAINT [DF_Reviews_IsApproved] DEFAULT 0,
        [CreatedAt]    DATETIME2      NOT NULL CONSTRAINT [DF_Reviews_CreatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_Reviews] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [FK_Reviews_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]),
        CONSTRAINT [FK_Reviews_CoachId] FOREIGN KEY ([CoachId]) REFERENCES [dbo].[Coaches]([Id]),
        CONSTRAINT [FK_Reviews_SupplementId] FOREIGN KEY ([SupplementId]) REFERENCES [dbo].[Supplements]([Id]),
        CONSTRAINT [CK_Reviews_Rating] CHECK ([Rating] >= 1 AND [Rating] <= 5),
        CONSTRAINT [CK_Reviews_Target] CHECK (
            ([CoachId] IS NOT NULL AND [SupplementId] IS NULL)
            OR ([CoachId] IS NULL AND [SupplementId] IS NOT NULL)
        )
    );
END
GO

-- ============================================================
-- ALTER DietPlans - Add new columns
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[DietPlans]') AND name = N'CreatedBy')
BEGIN
    ALTER TABLE [dbo].[DietPlans] ADD [CreatedBy] NVARCHAR(20) NOT NULL CONSTRAINT [DF_DietPlans_CreatedBy] DEFAULT 'ADMIN';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[DietPlans]') AND name = N'Calories')
BEGIN
    ALTER TABLE [dbo].[DietPlans] ADD [Calories] INT NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[DietPlans]') AND name = N'Protein')
BEGIN
    ALTER TABLE [dbo].[DietPlans] ADD [Protein] DECIMAL(10,2) NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[DietPlans]') AND name = N'Carbs')
BEGIN
    ALTER TABLE [dbo].[DietPlans] ADD [Carbs] DECIMAL(10,2) NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[DietPlans]') AND name = N'Fat')
BEGIN
    ALTER TABLE [dbo].[DietPlans] ADD [Fat] DECIMAL(10,2) NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[DietPlans]') AND name = N'MealPlanJson')
BEGIN
    ALTER TABLE [dbo].[DietPlans] ADD [MealPlanJson] NVARCHAR(MAX) NULL;
END
GO

-- ============================================================
-- INDEXES
-- ============================================================

-- Users
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Users_Email' AND object_id = OBJECT_ID(N'[dbo].[Users]'))
    CREATE UNIQUE NONCLUSTERED INDEX [IX_Users_Email] ON [dbo].[Users] ([Email]);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Users_RoleId' AND object_id = OBJECT_ID(N'[dbo].[Users]'))
    CREATE NONCLUSTERED INDEX [IX_Users_RoleId] ON [dbo].[Users] ([RoleId]) INCLUDE ([IsActive]);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Users_IsActive' AND object_id = OBJECT_ID(N'[dbo].[Users]'))
    CREATE NONCLUSTERED INDEX [IX_Users_IsActive] ON [dbo].[Users] ([IsActive]);
GO

-- RefreshTokens
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_RefreshTokens_Token' AND object_id = OBJECT_ID(N'[dbo].[RefreshTokens]'))
    CREATE UNIQUE NONCLUSTERED INDEX [IX_RefreshTokens_Token] ON [dbo].[RefreshTokens] ([Token]);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_RefreshTokens_UserId' AND object_id = OBJECT_ID(N'[dbo].[RefreshTokens]'))
    CREATE NONCLUSTERED INDEX [IX_RefreshTokens_UserId] ON [dbo].[RefreshTokens] ([UserId]) INCLUDE ([IsRevoked], [ExpiresAt]);
GO

-- MembershipPlans
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_MembershipPlans_IsActive' AND object_id = OBJECT_ID(N'[dbo].[MembershipPlans]'))
    CREATE NONCLUSTERED INDEX [IX_MembershipPlans_IsActive] ON [dbo].[MembershipPlans] ([IsActive]) INCLUDE ([Name], [Price]);
GO

-- Memberships
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Memberships_UserId' AND object_id = OBJECT_ID(N'[dbo].[Memberships]'))
    CREATE NONCLUSTERED INDEX [IX_Memberships_UserId] ON [dbo].[Memberships] ([UserId]) INCLUDE ([Status], [EndDate]);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Memberships_Status' AND object_id = OBJECT_ID(N'[dbo].[Memberships]'))
    CREATE NONCLUSTERED INDEX [IX_Memberships_Status] ON [dbo].[Memberships] ([Status]) INCLUDE ([EndDate]);
GO

-- Coaches
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Coaches_UserId' AND object_id = OBJECT_ID(N'[dbo].[Coaches]'))
    CREATE UNIQUE NONCLUSTERED INDEX [IX_Coaches_UserId] ON [dbo].[Coaches] ([UserId]);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Coaches_IsAvailable' AND object_id = OBJECT_ID(N'[dbo].[Coaches]'))
    CREATE NONCLUSTERED INDEX [IX_Coaches_IsAvailable] ON [dbo].[Coaches] ([IsAvailable]) INCLUDE ([Specialization], [HourlyRate]);
GO

-- CoachSchedules
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_CoachSchedules_CoachId_Day' AND object_id = OBJECT_ID(N'[dbo].[CoachSchedules]'))
    CREATE NONCLUSTERED INDEX [IX_CoachSchedules_CoachId_Day] ON [dbo].[CoachSchedules] ([CoachId], [DayOfWeek]) INCLUDE ([IsBooked]);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_CoachSchedules_SpecificDate' AND object_id = OBJECT_ID(N'[dbo].[CoachSchedules]'))
    CREATE NONCLUSTERED INDEX [IX_CoachSchedules_SpecificDate] ON [dbo].[CoachSchedules] ([SpecificDate]) INCLUDE ([CoachId]);
GO

-- Bookings
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Bookings_MemberId' AND object_id = OBJECT_ID(N'[dbo].[Bookings]'))
    CREATE NONCLUSTERED INDEX [IX_Bookings_MemberId] ON [dbo].[Bookings] ([MemberId]) INCLUDE ([Status], [BookingDate]);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Bookings_CoachId_Date' AND object_id = OBJECT_ID(N'[dbo].[Bookings]'))
    CREATE NONCLUSTERED INDEX [IX_Bookings_CoachId_Date] ON [dbo].[Bookings] ([CoachId], [BookingDate]) INCLUDE ([Status]);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Bookings_ScheduleId' AND object_id = OBJECT_ID(N'[dbo].[Bookings]'))
    CREATE UNIQUE NONCLUSTERED INDEX [IX_Bookings_ScheduleId] ON [dbo].[Bookings] ([ScheduleId]);
GO

-- SupplementCategories
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_SupplementCategories_Name' AND object_id = OBJECT_ID(N'[dbo].[SupplementCategories]'))
    CREATE UNIQUE NONCLUSTERED INDEX [IX_SupplementCategories_Name] ON [dbo].[SupplementCategories] ([Name]);
GO

-- Supplements
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Supplements_CategoryId' AND object_id = OBJECT_ID(N'[dbo].[Supplements]'))
    CREATE NONCLUSTERED INDEX [IX_Supplements_CategoryId] ON [dbo].[Supplements] ([CategoryId]) INCLUDE ([IsActive]);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Supplements_IsActive' AND object_id = OBJECT_ID(N'[dbo].[Supplements]'))
    CREATE NONCLUSTERED INDEX [IX_Supplements_IsActive] ON [dbo].[Supplements] ([IsActive]) INCLUDE ([Name], [Price]);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Supplements_Name' AND object_id = OBJECT_ID(N'[dbo].[Supplements]'))
    CREATE NONCLUSTERED INDEX [IX_Supplements_Name] ON [dbo].[Supplements] ([Name]);
GO

-- Orders
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Orders_UserId' AND object_id = OBJECT_ID(N'[dbo].[Orders]'))
    CREATE NONCLUSTERED INDEX [IX_Orders_UserId] ON [dbo].[Orders] ([UserId]) INCLUDE ([Status], [CreatedAt]);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Orders_Status' AND object_id = OBJECT_ID(N'[dbo].[Orders]'))
    CREATE NONCLUSTERED INDEX [IX_Orders_Status] ON [dbo].[Orders] ([Status]);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Orders_StripeSessionId' AND object_id = OBJECT_ID(N'[dbo].[Orders]'))
    CREATE UNIQUE NONCLUSTERED INDEX [IX_Orders_StripeSessionId] ON [dbo].[Orders] ([StripeSessionId]) WHERE [StripeSessionId] IS NOT NULL;
GO

-- OrderItems
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_OrderItems_OrderId' AND object_id = OBJECT_ID(N'[dbo].[OrderItems]'))
    CREATE NONCLUSTERED INDEX [IX_OrderItems_OrderId] ON [dbo].[OrderItems] ([OrderId]);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_OrderItems_SupplementId' AND object_id = OBJECT_ID(N'[dbo].[OrderItems]'))
    CREATE NONCLUSTERED INDEX [IX_OrderItems_SupplementId] ON [dbo].[OrderItems] ([SupplementId]);
GO

-- Payments
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Payments_UserId' AND object_id = OBJECT_ID(N'[dbo].[Payments]'))
    CREATE NONCLUSTERED INDEX [IX_Payments_UserId] ON [dbo].[Payments] ([UserId]);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Payments_StripePaymentIntentId' AND object_id = OBJECT_ID(N'[dbo].[Payments]'))
    CREATE UNIQUE NONCLUSTERED INDEX [IX_Payments_StripePaymentIntentId] ON [dbo].[Payments] ([StripePaymentIntentId]) WHERE [StripePaymentIntentId] IS NOT NULL;
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Payments_Status' AND object_id = OBJECT_ID(N'[dbo].[Payments]'))
    CREATE NONCLUSTERED INDEX [IX_Payments_Status] ON [dbo].[Payments] ([Status]);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Payments_OrderId' AND object_id = OBJECT_ID(N'[dbo].[Payments]'))
    CREATE NONCLUSTERED INDEX [IX_Payments_OrderId] ON [dbo].[Payments] ([OrderId]) WHERE [OrderId] IS NOT NULL;
GO

-- WorkoutPrograms
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_WorkoutPrograms_MemberId' AND object_id = OBJECT_ID(N'[dbo].[WorkoutPrograms]'))
    CREATE NONCLUSTERED INDEX [IX_WorkoutPrograms_MemberId] ON [dbo].[WorkoutPrograms] ([MemberId]) INCLUDE ([Status]);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_WorkoutPrograms_CoachId' AND object_id = OBJECT_ID(N'[dbo].[WorkoutPrograms]'))
    CREATE NONCLUSTERED INDEX [IX_WorkoutPrograms_CoachId] ON [dbo].[WorkoutPrograms] ([CoachId]);
GO

-- DietPlans
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_DietPlans_MemberId' AND object_id = OBJECT_ID(N'[dbo].[DietPlans]'))
    CREATE NONCLUSTERED INDEX [IX_DietPlans_MemberId] ON [dbo].[DietPlans] ([MemberId]) INCLUDE ([Status]);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_DietPlans_CoachId' AND object_id = OBJECT_ID(N'[dbo].[DietPlans]'))
    CREATE NONCLUSTERED INDEX [IX_DietPlans_CoachId] ON [dbo].[DietPlans] ([CoachId]);
GO

-- DietPlanSaves
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_DietPlanSaves_UserId' AND object_id = OBJECT_ID(N'[dbo].[DietPlanSaves]'))
    CREATE NONCLUSTERED INDEX [IX_DietPlanSaves_UserId] ON [dbo].[DietPlanSaves] ([UserId]);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_DietPlanSaves_DietPlanId' AND object_id = OBJECT_ID(N'[dbo].[DietPlanSaves]'))
    CREATE NONCLUSTERED INDEX [IX_DietPlanSaves_DietPlanId] ON [dbo].[DietPlanSaves] ([DietPlanId]);
GO

-- Blogs
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Blogs_Slug' AND object_id = OBJECT_ID(N'[dbo].[Blogs]'))
    CREATE UNIQUE NONCLUSTERED INDEX [IX_Blogs_Slug] ON [dbo].[Blogs] ([Slug]);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Blogs_Status_PublishedAt' AND object_id = OBJECT_ID(N'[dbo].[Blogs]'))
    CREATE NONCLUSTERED INDEX [IX_Blogs_Status_PublishedAt] ON [dbo].[Blogs] ([Status], [PublishedAt]) WHERE [Status] = 'PUBLISHED';
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Blogs_AuthorId' AND object_id = OBJECT_ID(N'[dbo].[Blogs]'))
    CREATE NONCLUSTERED INDEX [IX_Blogs_AuthorId] ON [dbo].[Blogs] ([AuthorId]);
GO

-- Reviews
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Reviews_CoachId' AND object_id = OBJECT_ID(N'[dbo].[Reviews]'))
    CREATE NONCLUSTERED INDEX [IX_Reviews_CoachId] ON [dbo].[Reviews] ([CoachId]) INCLUDE ([Rating], [IsApproved]);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Reviews_SupplementId' AND object_id = OBJECT_ID(N'[dbo].[Reviews]'))
    CREATE NONCLUSTERED INDEX [IX_Reviews_SupplementId] ON [dbo].[Reviews] ([SupplementId]) INCLUDE ([Rating], [IsApproved]);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Reviews_UserId' AND object_id = OBJECT_ID(N'[dbo].[Reviews]'))
    CREATE NONCLUSTERED INDEX [IX_Reviews_UserId] ON [dbo].[Reviews] ([UserId]);
GO

-- ============================================================
-- SEED DATA
-- ============================================================

-- Roles
IF NOT EXISTS (SELECT 1 FROM [dbo].[Roles])
BEGIN
    INSERT INTO [dbo].[Roles] ([Name], [Description])
    VALUES
        (N'ADMIN', N'Full system administrator'),
        (N'COACH', N'Personal trainer / coach'),
        (N'MEMBER', N'Gym member');
END
GO

-- Users (password: GymFit@123 - bcrypt hash)
IF NOT EXISTS (SELECT 1 FROM [dbo].[Users])
BEGIN
    INSERT INTO [dbo].[Users] ([Email], [PasswordHash], [FullName], [Phone], [Avatar], [RoleId], [IsActive])
    VALUES
        (
            N'admin@gymfit.com',
            N'$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5nF0q5nF0q5nF0q5nF0q5nF0',
            N'System Admin',
            N'+84123456789',
            NULL,
            (SELECT [Id] FROM [dbo].[Roles] WHERE [Name] = 'ADMIN'),
            1
        ),
        (
            N'coach.john@gymfit.com',
            N'$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5nF0q5nF0q5nF0q5nF0q5nF0',
            N'John Smith',
            N'+84123456788',
            NULL,
            (SELECT [Id] FROM [dbo].[Roles] WHERE [Name] = 'COACH'),
            1
        ),
        (
            N'member.test@gymfit.com',
            N'$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5nF0q5nF0q5nF0q5nF0q5nF0',
            N'Test Member',
            N'+84123456787',
            NULL,
            (SELECT [Id] FROM [dbo].[Roles] WHERE [Name] = 'MEMBER'),
            1
        );
END
GO

-- Coach profile for John Smith
IF NOT EXISTS (SELECT 1 FROM [dbo].[Coaches])
BEGIN
    INSERT INTO [dbo].[Coaches] ([UserId], [Specialization], [Bio], [ExperienceYears], [HourlyRate], [Certifications], [IsAvailable], [Rating])
    VALUES
        (
            (SELECT [Id] FROM [dbo].[Users] WHERE [Email] = N'coach.john@gymfit.com'),
            N'Strength Training, Bodybuilding, Nutrition',
            N'John is a certified personal trainer with over 8 years of experience in strength training and bodybuilding. He has helped hundreds of clients achieve their fitness goals.',
            8,
            50.00,
            N'ACE Certified Personal Trainer, NASM Certified, CPR/AED Certified',
            1,
            4.8
        );
END
GO

-- Supplement Categories
IF NOT EXISTS (SELECT 1 FROM [dbo].[SupplementCategories])
BEGIN
    INSERT INTO [dbo].[SupplementCategories] ([Name], [Description], [IsActive])
    VALUES
        (N'Protein', N'Whey protein, casein, plant-based protein powders', 1),
        (N'Pre-Workout', N'Pre-workout supplements for energy and focus', 1),
        (N'BCAA & Amino', N'Branch chain amino acids for recovery', 1),
        (N'Creatine', N'Creatine monohydrate and other forms', 1),
        (N'Vitamins & Minerals', N'Daily vitamins and mineral supplements', 1);
END
GO

-- Supplements
IF NOT EXISTS (SELECT 1 FROM [dbo].[Supplements])
BEGIN
    INSERT INTO [dbo].[Supplements] ([Name], [Description], [Price], [StockQuantity], [Image], [CategoryId], [Brand], [Weight], [Flavor], [StripePriceId], [StripeProductId], [IsActive])
    VALUES
        (
            N'Whey Gold Standard 100%',
            N'Premium whey protein blend with 24g protein per serving. Mixes instantly and tastes great.',
            59.99,
            50,
            NULL,
            (SELECT [Id] FROM [dbo].[SupplementCategories] WHERE [Name] = 'Protein'),
            N'Optimum Nutrition',
            N'5lb',
            N'Double Rich Chocolate',
            NULL,
            NULL,
            1
        ),
        (
            N'C4 Original Pre-Workout',
            N'Explosive pre-workout with 150mg caffeine, beta-alanine, and creatine for energy and focus.',
            39.99,
            75,
            NULL,
            (SELECT [Id] FROM [dbo].[SupplementCategories] WHERE [Name] = 'Pre-Workout'),
            N'Cellucor',
            N'60 servings',
            N'Icy Blue Razz',
            NULL,
            NULL,
            1
        ),
        (
            N'Micronized Creatine Monohydrate',
            N'Pure micronized creatine monohydrate powder. Supports strength, power, and muscle growth.',
            29.99,
            100,
            NULL,
            (SELECT [Id] FROM [dbo].[SupplementCategories] WHERE [Name] = 'Creatine'),
            N'Optimum Nutrition',
            N'1kg',
            N'Unflavored',
            NULL,
            NULL,
            1
        ),
        (
            N'Evogen BCAA 5000',
            N'Recovery formula with 5g of BCAA per serving in a 2:1:1 ratio. Helps reduce muscle soreness.',
            34.99,
            40,
            NULL,
            (SELECT [Id] FROM [dbo].[SupplementCategories] WHERE [Name] = 'BCAA & Amino'),
            N'Evogen Nutrition',
            N'30 servings',
            N'Green Apple',
            NULL,
            NULL,
            1
        ),
        (
            N'Animal Pak Daily Multivitamin',
            N'Complete daily multivitamin pack with 44 years of excellence. Supports energy, immunity, and performance.',
            35.99,
            60,
            NULL,
            (SELECT [Id] FROM [dbo].[SupplementCategories] WHERE [Name] = 'Vitamins & Minerals'),
            N'Animal',
            N'44 packs',
            NULL,
            NULL,
            NULL,
            1
        );
END
GO

-- Membership Plans
IF NOT EXISTS (SELECT 1 FROM [dbo].[MembershipPlans])
BEGIN
    INSERT INTO [dbo].[MembershipPlans] ([Name], [Description], [DurationDays], [Price], [MaxSessionsPerWeek], [IncludesPersonalTraining], [IncludesDietPlan], [IsActive])
    VALUES
        (
            N'Monthly Basic',
            N'Access to gym facilities during staffed hours. Perfect for beginners.',
            30,
            49.99,
            NULL,
            0,
            0,
            1
        ),
        (
            N'Quarterly Standard',
            N'Full gym access with 2 personal training sessions per week and a customized diet plan.',
            90,
            129.99,
            2,
            1,
            1,
            1
        ),
        (
            N'Annual Premium',
            N'Unlimited gym access, unlimited PT sessions, personalized diet plan, and exclusive workshops.',
            365,
            399.99,
            NULL,
            1,
            1,
            1
        );
END
GO

-- Blog
IF NOT EXISTS (SELECT 1 FROM [dbo].[Blogs])
BEGIN
    INSERT INTO [dbo].[Blogs] ([AuthorId], [Title], [Slug], [Content], [Excerpt], [CoverImage], [Tags], [Status], [ViewCount], [PublishedAt])
    VALUES
        (
            (SELECT [Id] FROM [dbo].[Users] WHERE [Email] = N'admin@gymfit.com'),
            N'10 Tips for Building Muscle Naturally',
            N'10-tips-for-building-muscle-naturally',
            N'<article><h2>Introduction</h2><p>Building muscle naturally requires dedication, proper nutrition, and consistent training. In this guide, we will cover the top 10 tips to help you maximize your muscle growth without relying on artificial enhancements.</p><h2>1. Progressive Overload</h2><p>To build muscle, you must continuously challenge your muscles by increasing weight, reps, or sets over time.</p><h2>2. Protein Intake</h2><p>Consume 1.6-2.2g of protein per kg of bodyweight daily. Spread protein intake across 4-5 meals.</p><h2>3. Sleep & Recovery</h2><p>Aim for 7-9 hours of quality sleep per night. Muscles grow during rest, not during workouts.</p><h2>4. Compound Exercises</h2><p>Focus on squats, deadlifts, bench press, and rows. These exercises recruit multiple muscle groups.</p><h2>5. Stay Consistent</h2><p>Results take time. Stick to your program for at least 12 weeks before evaluating progress.</p></article>',
            N'Discover the top 10 scientifically-backed tips for building muscle naturally. From progressive overload to proper nutrition, this guide covers everything you need.',
            NULL,
            N'muscle-building,fitness,nutrition,workout-tips',
            N'PUBLISHED',
            0,
            GETUTCDATE()
        );
END
GO

-- ============================================================
-- V2: HealthProfiles - BMI, body fat, health goals
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[HealthProfiles]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[HealthProfiles] (
        [Id]              INT            IDENTITY(1,1) NOT NULL,
        [UserId]          INT            NOT NULL,
        [Gender]          NVARCHAR(10)   NOT NULL,
        [DateOfBirth]     DATE           NULL,
        [HeightCm]        DECIMAL(5,2)   NULL,
        [WeightKg]        DECIMAL(5,2)   NULL,
        [NeckCm]          DECIMAL(5,2)   NULL,
        [WaistCm]         DECIMAL(5,2)   NULL,
        [HipCm]           DECIMAL(5,2)   NULL,
        [FitnessGoal]     NVARCHAR(50)   NULL,
        [ActivityLevel]   NVARCHAR(30)   NULL,
        [UpdatedAt]       DATETIME2      NOT NULL CONSTRAINT [DF_HealthProfiles_UpdatedAt] DEFAULT GETUTCDATE(),
        [CreatedAt]       DATETIME2      NOT NULL CONSTRAINT [DF_HealthProfiles_CreatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_HealthProfiles] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UQ_HealthProfiles_UserId] UNIQUE ([UserId]),
        CONSTRAINT [FK_HealthProfiles_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE,
        CONSTRAINT [CK_HealthProfiles_Gender] CHECK ([Gender] IN ('MALE', 'FEMALE'))
    );
END
GO

-- ============================================================
-- V2: FreeTrials - 14-day trial management
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[FreeTrials]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[FreeTrials] (
        [Id]         INT       IDENTITY(1,1) NOT NULL,
        [UserId]     INT       NOT NULL,
        [StartDate]  DATE      NOT NULL,
        [EndDate]    DATE      NOT NULL,
        [IsActive]   BIT       NOT NULL CONSTRAINT [DF_FreeTrials_IsActive] DEFAULT 1,
        [CreatedAt]  DATETIME2 NOT NULL CONSTRAINT [DF_FreeTrials_CreatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_FreeTrials] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UQ_FreeTrials_UserId] UNIQUE ([UserId]),
        CONSTRAINT [FK_FreeTrials_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE
    );
END
GO

-- ============================================================
-- V2: ProgressLogs - Member body measurements tracking
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ProgressLogs]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[ProgressLogs] (
        [Id]          INT            IDENTITY(1,1) NOT NULL,
        [UserId]      INT            NOT NULL,
        [LogDate]     DATE           NOT NULL,
        [WeightKg]    DECIMAL(5,2)   NULL,
        [BodyFatPct]  DECIMAL(4,2)   NULL,
        [MuscleMassKg] DECIMAL(5,2)  NULL,
        [ChestCm]     DECIMAL(5,2)   NULL,
        [WaistCm]     DECIMAL(5,2)   NULL,
        [HipCm]       DECIMAL(5,2)   NULL,
        [ArmCm]       DECIMAL(5,2)   NULL,
        [ThighCm]     DECIMAL(5,2)   NULL,
        [Notes]       NVARCHAR(500)  NULL,
        [PhotoUrl]    NVARCHAR(500)  NULL,
        [CreatedAt]   DATETIME2      NOT NULL CONSTRAINT [DF_ProgressLogs_CreatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_ProgressLogs] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [FK_ProgressLogs_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE
    );
END
GO

-- ============================================================
-- V2: WorkoutLogs - Workout logbook (actual sessions)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[WorkoutLogs]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[WorkoutLogs] (
        [Id]          INT            IDENTITY(1,1) NOT NULL,
        [UserId]      INT            NOT NULL,
        [ProgramId]   INT            NULL,
        [LogDate]     DATE           NOT NULL,
        [DurationMin] INT            NULL,
        [Notes]       NVARCHAR(500)  NULL,
        [Rating]      TINYINT        NULL,
        [CreatedAt]   DATETIME2      NOT NULL CONSTRAINT [DF_WorkoutLogs_CreatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_WorkoutLogs] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [FK_WorkoutLogs_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_WorkoutLogs_ProgramId] FOREIGN KEY ([ProgramId]) REFERENCES [dbo].[WorkoutPrograms]([Id]),
        CONSTRAINT [CK_WorkoutLogs_Rating] CHECK ([Rating] IS NULL OR ([Rating] >= 1 AND [Rating] <= 5))
    );
END
GO

-- ============================================================
-- V2: WorkoutLogExercises
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[WorkoutLogExercises]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[WorkoutLogExercises] (
        [Id]           INT            IDENTITY(1,1) NOT NULL,
        [LogId]        INT            NOT NULL,
        [ExerciseName] NVARCHAR(200)  NOT NULL,
        [SetNumber]    INT            NOT NULL,
        [Reps]         INT            NULL,
        [WeightKg]     DECIMAL(6,2)   NULL,
        [DurationSec]  INT            NULL,
        [Notes]        NVARCHAR(200)  NULL,
        [CreatedAt]    DATETIME2      NOT NULL CONSTRAINT [DF_WLE_CreatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_WorkoutLogExercises] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [FK_WLE_LogId] FOREIGN KEY ([LogId]) REFERENCES [dbo].[WorkoutLogs]([Id]) ON DELETE CASCADE
    );
END
GO

-- ============================================================
-- V2: FoodDatabase
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[FoodDatabase]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[FoodDatabase] (
        [Id]            INT            IDENTITY(1,1) NOT NULL,
        [Name]          NVARCHAR(200)  NOT NULL,
        [Category]      NVARCHAR(100)  NULL,
        [ServingSize]   DECIMAL(8,2)   NOT NULL CONSTRAINT [DF_FoodDB_ServingSize] DEFAULT 100,
        [Calories]      DECIMAL(8,2)   NOT NULL,
        [ProteinG]      DECIMAL(6,2)   NULL,
        [CarbsG]        DECIMAL(6,2)   NULL,
        [FatG]          DECIMAL(6,2)   NULL,
        [FiberG]        DECIMAL(6,2)   NULL,
        [IsCustom]      BIT            NOT NULL CONSTRAINT [DF_FoodDB_IsCustom] DEFAULT 0,
        [CreatedBy]     INT            NULL,
        [CreatedAt]     DATETIME2      NOT NULL CONSTRAINT [DF_FoodDB_CreatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_FoodDatabase] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [FK_FoodDB_CreatedBy] FOREIGN KEY ([CreatedBy]) REFERENCES [dbo].[Users]([Id])
    );
END
GO

-- ============================================================
-- V2: MealLogs
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[MealLogs]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[MealLogs] (
        [Id]          INT            IDENTITY(1,1) NOT NULL,
        [UserId]      INT            NOT NULL,
        [LogDate]     DATE           NOT NULL,
        [MealType]    NVARCHAR(20)   NOT NULL,
        [FoodId]      INT            NULL,
        [FoodName]    NVARCHAR(200)  NOT NULL,
        [ServingSize] DECIMAL(8,2)   NOT NULL,
        [Calories]    DECIMAL(8,2)   NOT NULL,
        [ProteinG]    DECIMAL(6,2)   NULL,
        [CarbsG]      DECIMAL(6,2)   NULL,
        [FatG]        DECIMAL(6,2)   NULL,
        [CreatedAt]   DATETIME2      NOT NULL CONSTRAINT [DF_MealLogs_CreatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_MealLogs] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [FK_MealLogs_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_MealLogs_FoodId] FOREIGN KEY ([FoodId]) REFERENCES [dbo].[FoodDatabase]([Id]),
        CONSTRAINT [CK_MealLogs_MealType] CHECK ([MealType] IN ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'))
    );
END
GO

-- ============================================================
-- V2: CoachStudentAssignments
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CoachStudentAssignments]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[CoachStudentAssignments] (
        [Id]          INT       IDENTITY(1,1) NOT NULL,
        [CoachId]     INT       NOT NULL,
        [StudentId]   INT       NOT NULL,
        [WorkoutPlanId] INT     NULL,
        [DietPlanId]  INT       NULL,
        [Notes]       NVARCHAR(500) NULL,
        [IsActive]    BIT       NOT NULL CONSTRAINT [DF_CSA_IsActive] DEFAULT 1,
        [AssignedAt]  DATETIME2 NOT NULL CONSTRAINT [DF_CSA_AssignedAt] DEFAULT GETUTCDATE(),
        [UpdatedAt]   DATETIME2 NOT NULL CONSTRAINT [DF_CSA_UpdatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_CoachStudentAssignments] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UQ_CSA_CoachStudent] UNIQUE ([CoachId], [StudentId]),
        CONSTRAINT [FK_CSA_CoachId] FOREIGN KEY ([CoachId]) REFERENCES [dbo].[Coaches]([Id]),
        CONSTRAINT [FK_CSA_StudentId] FOREIGN KEY ([StudentId]) REFERENCES [dbo].[Users]([Id]),
        CONSTRAINT [FK_CSA_WorkoutPlanId] FOREIGN KEY ([WorkoutPlanId]) REFERENCES [dbo].[WorkoutPrograms]([Id]),
        CONSTRAINT [FK_CSA_DietPlanId] FOREIGN KEY ([DietPlanId]) REFERENCES [dbo].[DietPlans]([Id])
    );
END
GO

-- ============================================================
-- V2: QAPosts
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[QAPosts]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[QAPosts] (
        [Id]          INT            IDENTITY(1,1) NOT NULL,
        [UserId]      INT            NOT NULL,
        [Title]       NVARCHAR(300)  NOT NULL,
        [Content]     NVARCHAR(MAX)  NOT NULL,
        [Tags]        NVARCHAR(300)  NULL,
        [IsPinned]    BIT            NOT NULL CONSTRAINT [DF_QAPosts_IsPinned] DEFAULT 0,
        [IsVerified]  BIT            NOT NULL CONSTRAINT [DF_QAPosts_IsVerified] DEFAULT 0,
        [ViewCount]   INT            NOT NULL CONSTRAINT [DF_QAPosts_ViewCount] DEFAULT 0,
        [CreatedAt]   DATETIME2      NOT NULL CONSTRAINT [DF_QAPosts_CreatedAt] DEFAULT GETUTCDATE(),
        [UpdatedAt]   DATETIME2      NOT NULL CONSTRAINT [DF_QAPosts_UpdatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_QAPosts] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [FK_QAPosts_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id])
    );
END
GO

-- ============================================================
-- V2: QAAnswers
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[QAAnswers]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[QAAnswers] (
        [Id]           INT            IDENTITY(1,1) NOT NULL,
        [PostId]       INT            NOT NULL,
        [UserId]       INT            NOT NULL,
        [Content]      NVARCHAR(MAX)  NOT NULL,
        [IsAccepted]   BIT            NOT NULL CONSTRAINT [DF_QAAnswers_IsAccepted] DEFAULT 0,
        [IsVerified]   BIT            NOT NULL CONSTRAINT [DF_QAAnswers_IsVerified] DEFAULT 0,
        [Upvotes]      INT            NOT NULL CONSTRAINT [DF_QAAnswers_Upvotes] DEFAULT 0,
        [CreatedAt]    DATETIME2      NOT NULL CONSTRAINT [DF_QAAnswers_CreatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_QAAnswers] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [FK_QAAnswers_PostId] FOREIGN KEY ([PostId]) REFERENCES [dbo].[QAPosts]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_QAAnswers_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id])
    );
END
GO

-- ============================================================
-- V2: Videos
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Videos]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[Videos] (
        [Id]           INT            IDENTITY(1,1) NOT NULL,
        [Title]        NVARCHAR(300)  NOT NULL,
        [Description]  NVARCHAR(MAX)  NULL,
        [VideoUrl]     NVARCHAR(500)  NOT NULL,
        [ThumbnailUrl] NVARCHAR(500)  NULL,
        [DurationSec]  INT            NULL,
        [Category]     NVARCHAR(100)  NULL,
        [Difficulty]   NVARCHAR(20)   NOT NULL CONSTRAINT [DF_Videos_Difficulty] DEFAULT 'BEGINNER',
        [IsPremium]    BIT            NOT NULL CONSTRAINT [DF_Videos_IsPremium] DEFAULT 0,
        [UploadedBy]   INT            NOT NULL,
        [ViewCount]    INT            NOT NULL CONSTRAINT [DF_Videos_ViewCount] DEFAULT 0,
        [IsActive]     BIT            NOT NULL CONSTRAINT [DF_Videos_IsActive] DEFAULT 1,
        [CreatedAt]    DATETIME2      NOT NULL CONSTRAINT [DF_Videos_CreatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_Videos] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [FK_Videos_UploadedBy] FOREIGN KEY ([UploadedBy]) REFERENCES [dbo].[Users]([Id]),
        CONSTRAINT [CK_Videos_Difficulty] CHECK ([Difficulty] IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED'))
    );
END
GO

-- ============================================================
-- V2: ChatConversations
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ChatConversations]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[ChatConversations] (
        [Id]          INT            IDENTITY(1,1) NOT NULL,
        [UserId]      INT            NOT NULL,
        [CoachId]     INT            NOT NULL,
        [CreatedAt]   DATETIME2      NOT NULL CONSTRAINT [DF_ChatConv_CreatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_ChatConversations] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [FK_ChatConv_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]),
        CONSTRAINT [FK_ChatConv_CoachId] FOREIGN KEY ([CoachId]) REFERENCES [dbo].[Users]([Id]),
        CONSTRAINT [UQ_ChatConv_UserCoach] UNIQUE ([UserId], [CoachId])
    );
END
GO

-- ============================================================
-- V2: ChatMessages
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ChatMessages]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[ChatMessages] (
        [Id]             INT            IDENTITY(1,1) NOT NULL,
        [ConversationId] INT            NOT NULL,
        [SenderId]       INT            NOT NULL,
        [ReceiverId]     INT            NOT NULL,
        [Content]        NVARCHAR(2000) NOT NULL,
        [IsRead]         BIT            NOT NULL CONSTRAINT [DF_ChatMessages_IsRead] DEFAULT 0,
        [CreatedAt]      DATETIME2      NOT NULL CONSTRAINT [DF_ChatMessages_CreatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_ChatMessages] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [FK_ChatMsg_ConversationId] FOREIGN KEY ([ConversationId]) REFERENCES [dbo].[ChatConversations]([Id]),
        CONSTRAINT [FK_ChatMessages_SenderId] FOREIGN KEY ([SenderId]) REFERENCES [dbo].[Users]([Id]),
        CONSTRAINT [FK_ChatMessages_ReceiverId] FOREIGN KEY ([ReceiverId]) REFERENCES [dbo].[Users]([Id])
    );
END
GO

-- ============================================================
-- V2: Credits
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Credits]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[Credits] (
        [Id]          INT            IDENTITY(1,1) NOT NULL,
        [UserId]      INT            NOT NULL,
        [Balance]     INT            NOT NULL CONSTRAINT [DF_Credits_Balance] DEFAULT 0,
        [UpdatedAt]   DATETIME2      NOT NULL CONSTRAINT [DF_Credits_UpdatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_Credits] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UQ_Credits_UserId] UNIQUE ([UserId]),
        CONSTRAINT [FK_Credits_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE
    );
END
GO

-- ============================================================
-- V2: CreditTransactions
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CreditTransactions]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[CreditTransactions] (
        [Id]          INT            IDENTITY(1,1) NOT NULL,
        [UserId]      INT            NOT NULL,
        [Amount]      INT            NOT NULL,
        [Type]        NVARCHAR(50)   NOT NULL,
        [Description] NVARCHAR(200)  NULL,
        [CreatedAt]   DATETIME2      NOT NULL CONSTRAINT [DF_CreditTx_CreatedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_CreditTransactions] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [FK_CreditTx_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE
    );
END
GO

-- ============================================================
-- V2: Indexes
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_HealthProfiles_UserId' AND object_id = OBJECT_ID(N'[dbo].[HealthProfiles]'))
    CREATE UNIQUE NONCLUSTERED INDEX [IX_HealthProfiles_UserId] ON [dbo].[HealthProfiles] ([UserId]);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_ProgressLogs_UserId_Date' AND object_id = OBJECT_ID(N'[dbo].[ProgressLogs]'))
    CREATE NONCLUSTERED INDEX [IX_ProgressLogs_UserId_Date] ON [dbo].[ProgressLogs] ([UserId], [LogDate] DESC);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_WorkoutLogs_UserId_Date' AND object_id = OBJECT_ID(N'[dbo].[WorkoutLogs]'))
    CREATE NONCLUSTERED INDEX [IX_WorkoutLogs_UserId_Date] ON [dbo].[WorkoutLogs] ([UserId], [LogDate] DESC);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_MealLogs_UserId_Date' AND object_id = OBJECT_ID(N'[dbo].[MealLogs]'))
    CREATE NONCLUSTERED INDEX [IX_MealLogs_UserId_Date] ON [dbo].[MealLogs] ([UserId], [LogDate] DESC);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_QAPosts_UserId' AND object_id = OBJECT_ID(N'[dbo].[QAPosts]'))
    CREATE NONCLUSTERED INDEX [IX_QAPosts_UserId] ON [dbo].[QAPosts] ([UserId]);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_QAAnswers_PostId' AND object_id = OBJECT_ID(N'[dbo].[QAAnswers]'))
    CREATE NONCLUSTERED INDEX [IX_QAAnswers_PostId] ON [dbo].[QAAnswers] ([PostId]);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_ChatMessages_Sender_Receiver' AND object_id = OBJECT_ID(N'[dbo].[ChatMessages]'))
    CREATE NONCLUSTERED INDEX [IX_ChatMessages_Sender_Receiver] ON [dbo].[ChatMessages] ([SenderId], [ReceiverId]) INCLUDE ([CreatedAt]);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Videos_Category' AND object_id = OBJECT_ID(N'[dbo].[Videos]'))
    CREATE NONCLUSTERED INDEX [IX_Videos_Category] ON [dbo].[Videos] ([Category]) INCLUDE ([IsActive], [IsPremium]);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_CSA_CoachId' AND object_id = OBJECT_ID(N'[dbo].[CoachStudentAssignments]'))
    CREATE NONCLUSTERED INDEX [IX_CSA_CoachId] ON [dbo].[CoachStudentAssignments] ([CoachId]) INCLUDE ([IsActive]);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_FoodDatabase_Name' AND object_id = OBJECT_ID(N'[dbo].[FoodDatabase]'))
    CREATE NONCLUSTERED INDEX [IX_FoodDatabase_Name] ON [dbo].[FoodDatabase] ([Name]);
GO

-- ============================================================
-- V2: Seed Food Database
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM [dbo].[FoodDatabase])
BEGIN
    INSERT INTO [dbo].[FoodDatabase] ([Name],[Category],[ServingSize],[Calories],[ProteinG],[CarbsG],[FatG],[FiberG],[IsCustom])
    VALUES
        (N'Cơm trắng', N'Ngũ cốc', 100, 130, 2.7, 28.2, 0.3, 0.4, 0),
        (N'Ức gà luộc', N'Thịt', 100, 165, 31.0, 0.0, 3.6, 0.0, 0),
        (N'Trứng gà luộc', N'Trứng', 100, 155, 13.0, 1.1, 10.6, 0.0, 0),
        (N'Cá hồi nướng', N'Hải sản', 100, 206, 20.0, 0.0, 13.0, 0.0, 0),
        (N'Rau muống xào', N'Rau', 100, 25, 2.6, 3.5, 0.4, 2.0, 0),
        (N'Chuối', N'Trái cây', 100, 89, 1.1, 23.0, 0.3, 2.6, 0),
        (N'Sữa tươi', N'Sữa', 100, 61, 3.2, 4.8, 3.3, 0.0, 0),
        (N'Đậu phụ', N'Đậu', 100, 76, 8.0, 1.9, 4.8, 0.3, 0),
        (N'Khoai lang', N'Củ', 100, 86, 1.6, 20.1, 0.1, 3.0, 0),
        (N'Bơ đậu phộng', N'Hạt', 100, 588, 25.0, 20.0, 50.0, 6.0, 0),
        (N'Yến mạch', N'Ngũ cốc', 100, 389, 16.9, 66.3, 6.9, 10.6, 0),
        (N'Thịt bò nạc', N'Thịt', 100, 250, 26.0, 0.0, 15.0, 0.0, 0),
        (N'Tôm luộc', N'Hải sản', 100, 99, 24.0, 0.2, 0.3, 0.0, 0),
        (N'Táo', N'Trái cây', 100, 52, 0.3, 14.0, 0.2, 2.4, 0),
        (N'Sữa chua không đường', N'Sữa', 100, 59, 10.0, 3.6, 0.4, 0.0, 0);
END
GO

PRINT '============================================================';
PRINT 'GymFit SQL Server Database Script - Completed Successfully!';
PRINT '============================================================';
PRINT '';
PRINT 'Database: GymFit';
PRINT 'Collation: SQL_Latin1_General_CP1_CI_AS';
PRINT '';
PRINT 'V1 Tables + V2 Tables';
PRINT '';
PRINT 'V1 Tables:';
PRINT '  1. Roles';
PRINT '  2. Users';
PRINT '  3. RefreshTokens';
PRINT '  4. MembershipPlans';
PRINT '  5. Memberships';
PRINT '  6. Coaches';
PRINT '  7. CoachSchedules';
PRINT '  8. Bookings';
PRINT '  9. SupplementCategories';
PRINT ' 10. Supplements';
PRINT ' 11. Orders';
PRINT ' 12. OrderItems';
PRINT ' 13. Payments';
PRINT ' 14. WorkoutPrograms';
PRINT ' 15. WorkoutProgramExercises';
PRINT ' 16. WorkoutProgramFavorites';
PRINT ' 17. WorkoutProgramSaves';
PRINT ' 18. DietPlans';
PRINT ' 19. DietPlanSaves';
PRINT ' 20. Blogs';
PRINT ' 21. BlogComments';
PRINT ' 22. BlogLikes';
PRINT ' 23. Reviews';
PRINT '';
PRINT 'V2 Tables (New Features):';
PRINT ' 24. HealthProfiles';
PRINT ' 25. FreeTrials';
PRINT ' 26. ProgressLogs';
PRINT ' 27. WorkoutLogs';
PRINT ' 28. WorkoutLogExercises';
PRINT ' 29. FoodDatabase';
PRINT ' 30. MealLogs';
PRINT ' 31. CoachStudentAssignments';
PRINT ' 32. QAPosts';
PRINT ' 33. QAAnswers';
PRINT ' 34. Videos';
PRINT ' 35. ChatConversations';
PRINT ' 36. ChatMessages';
PRINT ' 37. Credits';
PRINT ' 38. CreditTransactions';
GO
