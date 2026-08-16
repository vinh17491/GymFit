/* Coach-only workout authoring, assignment and schedule persistence.
   Member session/set-log flow is intentionally not part of this migration. */
CREATE TABLE dbo.WorkoutPrograms (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WorkoutPrograms PRIMARY KEY,
  name NVARCHAR(200) NOT NULL,
  description NVARCHAR(MAX) NULL,
  goal NVARCHAR(40) NOT NULL CONSTRAINT CK_WorkoutPrograms_Goal CHECK (goal IN (N'GENERAL_FITNESS',N'WEIGHT_LOSS',N'MUSCLE_GAIN',N'STRENGTH',N'ENDURANCE',N'MOBILITY')),
  difficulty NVARCHAR(20) NOT NULL CONSTRAINT CK_WorkoutPrograms_Difficulty CHECK (difficulty IN (N'BEGINNER',N'INTERMEDIATE',N'ADVANCED')),
  duration_weeks TINYINT NOT NULL CONSTRAINT CK_WorkoutPrograms_Duration CHECK (duration_weeks BETWEEN 1 AND 104),
  days_per_week TINYINT NOT NULL CONSTRAINT CK_WorkoutPrograms_Days CHECK (days_per_week BETWEEN 1 AND 7),
  owner_coach_id INT NOT NULL,
  created_by INT NOT NULL,
  is_active BIT NOT NULL CONSTRAINT DF_WorkoutPrograms_Active DEFAULT 1,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_WorkoutPrograms_Created DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_WorkoutPrograms_Updated DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_WorkoutPrograms_OwnerCoach FOREIGN KEY (owner_coach_id) REFERENCES dbo.Users(id),
  CONSTRAINT FK_WorkoutPrograms_CreatedBy FOREIGN KEY (created_by) REFERENCES dbo.Users(id)
);
CREATE INDEX IX_WorkoutPrograms_Owner_Active ON dbo.WorkoutPrograms(owner_coach_id,is_active,updated_at DESC,id DESC);

CREATE TABLE dbo.WorkoutProgramDays (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WorkoutProgramDays PRIMARY KEY,
  program_id INT NOT NULL,
  week_number TINYINT NOT NULL CONSTRAINT CK_WorkoutProgramDays_Week CHECK (week_number BETWEEN 1 AND 104),
  day_number TINYINT NOT NULL CONSTRAINT CK_WorkoutProgramDays_Day CHECK (day_number BETWEEN 1 AND 7),
  title NVARCHAR(200) NOT NULL,
  description NVARCHAR(MAX) NULL,
  sort_order SMALLINT NOT NULL CONSTRAINT CK_WorkoutProgramDays_Sort CHECK (sort_order >= 0),
  created_at DATETIME2 NOT NULL CONSTRAINT DF_WorkoutProgramDays_Created DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_WorkoutProgramDays_Updated DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_WorkoutProgramDays_Program FOREIGN KEY (program_id) REFERENCES dbo.WorkoutPrograms(id),
  CONSTRAINT UQ_WorkoutProgramDays_WeekDay UNIQUE (program_id,week_number,day_number),
  CONSTRAINT UQ_WorkoutProgramDays_Order UNIQUE (program_id,sort_order)
);

CREATE TABLE dbo.WorkoutProgramExercises (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WorkoutProgramExercises PRIMARY KEY,
  program_day_id INT NOT NULL,
  exercise_id INT NOT NULL,
  sort_order SMALLINT NOT NULL CONSTRAINT CK_WorkoutProgramExercises_Sort CHECK (sort_order >= 0),
  target_sets TINYINT NULL CONSTRAINT CK_WorkoutProgramExercises_Sets CHECK (target_sets IS NULL OR target_sets BETWEEN 1 AND 50),
  target_reps_min SMALLINT NULL CONSTRAINT CK_WorkoutProgramExercises_RepsMin CHECK (target_reps_min IS NULL OR target_reps_min BETWEEN 1 AND 1000),
  target_reps_max SMALLINT NULL CONSTRAINT CK_WorkoutProgramExercises_RepsMax CHECK (target_reps_max IS NULL OR target_reps_max BETWEEN 1 AND 1000),
  target_weight DECIMAL(8,2) NULL CONSTRAINT CK_WorkoutProgramExercises_Weight CHECK (target_weight IS NULL OR target_weight >= 0),
  target_duration_seconds INT NULL CONSTRAINT CK_WorkoutProgramExercises_Duration CHECK (target_duration_seconds IS NULL OR target_duration_seconds BETWEEN 1 AND 86400),
  rest_seconds INT NULL CONSTRAINT CK_WorkoutProgramExercises_Rest CHECK (rest_seconds IS NULL OR rest_seconds BETWEEN 0 AND 3600),
  tempo NVARCHAR(40) NULL,
  coach_note NVARCHAR(2000) NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_WorkoutProgramExercises_Created DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_WorkoutProgramExercises_Updated DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_WorkoutProgramExercises_Day FOREIGN KEY (program_day_id) REFERENCES dbo.WorkoutProgramDays(id),
  CONSTRAINT FK_WorkoutProgramExercises_Exercise FOREIGN KEY (exercise_id) REFERENCES dbo.Exercises(id),
  CONSTRAINT UQ_WorkoutProgramExercises_Order UNIQUE (program_day_id,sort_order),
  CONSTRAINT UQ_WorkoutProgramExercises_Exercise UNIQUE (program_day_id,exercise_id),
  CONSTRAINT CK_WorkoutProgramExercises_RepsOrder CHECK (target_reps_min IS NULL OR target_reps_max IS NULL OR target_reps_min <= target_reps_max),
  CONSTRAINT CK_WorkoutProgramExercises_Target CHECK (target_reps_min IS NOT NULL OR target_reps_max IS NOT NULL OR target_duration_seconds IS NOT NULL)
);

CREATE TABLE dbo.CoachProgramAssignments (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_CoachProgramAssignments PRIMARY KEY,
  member_id INT NOT NULL,
  program_id INT NOT NULL,
  coach_id INT NOT NULL,
  assigned_by INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  status NVARCHAR(20) NOT NULL CONSTRAINT DF_CoachProgramAssignments_Status DEFAULT N'ACTIVE',
  schedule_timezone NVARCHAR(64) NOT NULL CONSTRAINT DF_CoachProgramAssignments_Timezone DEFAULT N'UTC',
  note NVARCHAR(2000) NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_CoachProgramAssignments_Created DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_CoachProgramAssignments_Updated DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_CoachProgramAssignments_Member FOREIGN KEY (member_id) REFERENCES dbo.Users(id),
  CONSTRAINT FK_CoachProgramAssignments_Program FOREIGN KEY (program_id) REFERENCES dbo.WorkoutPrograms(id),
  CONSTRAINT FK_CoachProgramAssignments_Coach FOREIGN KEY (coach_id) REFERENCES dbo.Users(id),
  CONSTRAINT FK_CoachProgramAssignments_AssignedBy FOREIGN KEY (assigned_by) REFERENCES dbo.Users(id),
  CONSTRAINT CK_CoachProgramAssignments_Status CHECK (status IN (N'ACTIVE',N'PAUSED',N'COMPLETED',N'CANCELLED')),
  CONSTRAINT CK_CoachProgramAssignments_Dates CHECK (end_date IS NULL OR end_date >= start_date)
);
CREATE UNIQUE INDEX UX_CoachProgramAssignments_ActiveMember ON dbo.CoachProgramAssignments(member_id) WHERE status=N'ACTIVE';
CREATE INDEX IX_CoachProgramAssignments_Coach_Status ON dbo.CoachProgramAssignments(coach_id,status,start_date,id DESC);

CREATE TABLE dbo.CoachProgramSchedules (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_CoachProgramSchedules PRIMARY KEY,
  assignment_id INT NOT NULL,
  program_day_id INT NOT NULL,
  scheduled_date DATE NOT NULL,
  status NVARCHAR(20) NOT NULL CONSTRAINT DF_CoachProgramSchedules_Status DEFAULT N'SCHEDULED',
  created_at DATETIME2 NOT NULL CONSTRAINT DF_CoachProgramSchedules_Created DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_CoachProgramSchedules_Updated DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_CoachProgramSchedules_Assignment FOREIGN KEY (assignment_id) REFERENCES dbo.CoachProgramAssignments(id),
  CONSTRAINT FK_CoachProgramSchedules_Day FOREIGN KEY (program_day_id) REFERENCES dbo.WorkoutProgramDays(id),
  CONSTRAINT CK_CoachProgramSchedules_Status CHECK (status IN (N'SCHEDULED',N'IN_PROGRESS',N'COMPLETED',N'SKIPPED',N'CANCELLED')),
  CONSTRAINT UQ_CoachProgramSchedules_DayDate UNIQUE (assignment_id,program_day_id,scheduled_date)
);
CREATE INDEX IX_CoachProgramSchedules_Date_Status ON dbo.CoachProgramSchedules(scheduled_date,status,assignment_id);
