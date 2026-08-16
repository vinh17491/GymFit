/* Additive public Coach profile data. Existing Coach/Booking and Workout data are unchanged. */
IF OBJECT_ID(N'dbo.CoachProfiles', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.CoachProfiles (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_CoachProfiles PRIMARY KEY,
    coach_id INT NOT NULL,
    specialty NVARCHAR(200) NULL,
    bio NVARCHAR(2000) NULL,
    experience_years INT NULL CONSTRAINT CK_CoachProfiles_Experience CHECK (experience_years IS NULL OR experience_years >= 0),
    session_mode NVARCHAR(20) NULL CONSTRAINT CK_CoachProfiles_SessionMode CHECK (session_mode IS NULL OR session_mode IN (N'ONLINE', N'IN_PERSON', N'BOTH')),
    location NVARCHAR(255) NULL,
    booking_enabled BIT NOT NULL CONSTRAINT DF_CoachProfiles_BookingEnabled DEFAULT 1,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_CoachProfiles_Created DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL CONSTRAINT DF_CoachProfiles_Updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_CoachProfiles_Coach FOREIGN KEY (coach_id) REFERENCES dbo.Users(id),
    CONSTRAINT UQ_CoachProfiles_Coach UNIQUE (coach_id)
  );
  CREATE INDEX IX_CoachProfiles_BookingEnabled ON dbo.CoachProfiles(coach_id, booking_enabled);
END;
