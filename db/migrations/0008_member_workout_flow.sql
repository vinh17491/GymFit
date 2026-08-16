/* Member execution, immutable workout snapshots and set logs for the 0007 Coach model. */
CREATE TABLE dbo.MemberWorkoutSessions (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_MemberWorkoutSessions PRIMARY KEY,
  member_id INT NOT NULL,
  assignment_id INT NOT NULL,
  schedule_id INT NOT NULL,
  started_at DATETIME2(3) NOT NULL CONSTRAINT DF_MemberWorkoutSessions_Started DEFAULT SYSUTCDATETIME(),
  ended_at DATETIME2(3) NULL,
  status NVARCHAR(20) NOT NULL CONSTRAINT DF_MemberWorkoutSessions_Status DEFAULT N'IN_PROGRESS',
  total_duration_seconds INT NULL CONSTRAINT CK_MemberWorkoutSessions_Duration CHECK (total_duration_seconds IS NULL OR total_duration_seconds >= 0),
  note NVARCHAR(2000) NULL,
  created_at DATETIME2(3) NOT NULL CONSTRAINT DF_MemberWorkoutSessions_Created DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_MemberWorkoutSessions_Updated DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_MemberWorkoutSessions_Member FOREIGN KEY (member_id) REFERENCES dbo.Users(id),
  CONSTRAINT FK_MemberWorkoutSessions_Assignment FOREIGN KEY (assignment_id) REFERENCES dbo.CoachProgramAssignments(id),
  CONSTRAINT FK_MemberWorkoutSessions_Schedule FOREIGN KEY (schedule_id) REFERENCES dbo.CoachProgramSchedules(id),
  CONSTRAINT UQ_MemberWorkoutSessions_Schedule UNIQUE (schedule_id),
  CONSTRAINT CK_MemberWorkoutSessions_Status CHECK (status IN (N'IN_PROGRESS',N'COMPLETED',N'ABANDONED')),
  CONSTRAINT CK_MemberWorkoutSessions_EndState CHECK ((status=N'IN_PROGRESS' AND ended_at IS NULL) OR (status<>N'IN_PROGRESS' AND ended_at IS NOT NULL))
);
CREATE UNIQUE INDEX UX_MemberWorkoutSessions_ActiveMember ON dbo.MemberWorkoutSessions(member_id) WHERE status=N'IN_PROGRESS';
CREATE INDEX IX_MemberWorkoutSessions_Member_Status ON dbo.MemberWorkoutSessions(member_id,status,started_at DESC,id DESC);

CREATE TABLE dbo.MemberWorkoutSessionExercises (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_MemberWorkoutSessionExercises PRIMARY KEY,
  session_id INT NOT NULL,
  program_exercise_id INT NULL,
  exercise_id INT NOT NULL,
  exercise_name NVARCHAR(200) NOT NULL,
  sort_order SMALLINT NOT NULL CONSTRAINT CK_MemberWorkoutSessionExercises_Sort CHECK (sort_order >= 0),
  target_sets TINYINT NULL CONSTRAINT CK_MemberWorkoutSessionExercises_Sets CHECK (target_sets IS NULL OR target_sets BETWEEN 1 AND 50),
  target_reps_min SMALLINT NULL CONSTRAINT CK_MemberWorkoutSessionExercises_RepsMin CHECK (target_reps_min IS NULL OR target_reps_min BETWEEN 1 AND 1000),
  target_reps_max SMALLINT NULL CONSTRAINT CK_MemberWorkoutSessionExercises_RepsMax CHECK (target_reps_max IS NULL OR target_reps_max BETWEEN 1 AND 1000),
  target_weight DECIMAL(8,2) NULL CONSTRAINT CK_MemberWorkoutSessionExercises_Weight CHECK (target_weight IS NULL OR target_weight >= 0),
  target_duration_seconds INT NULL CONSTRAINT CK_MemberWorkoutSessionExercises_Duration CHECK (target_duration_seconds IS NULL OR target_duration_seconds BETWEEN 1 AND 86400),
  rest_seconds INT NULL CONSTRAINT CK_MemberWorkoutSessionExercises_Rest CHECK (rest_seconds IS NULL OR rest_seconds BETWEEN 0 AND 3600),
  coach_note NVARCHAR(2000) NULL,
  created_at DATETIME2(3) NOT NULL CONSTRAINT DF_MemberWorkoutSessionExercises_Created DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_MemberWorkoutSessionExercises_Session FOREIGN KEY (session_id) REFERENCES dbo.MemberWorkoutSessions(id) ON DELETE CASCADE,
  CONSTRAINT FK_MemberWorkoutSessionExercises_Exercise FOREIGN KEY (exercise_id) REFERENCES dbo.Exercises(id),
  CONSTRAINT UQ_MemberWorkoutSessionExercises_Order UNIQUE (session_id,sort_order),
  CONSTRAINT CK_MemberWorkoutSessionExercises_RepsOrder CHECK (target_reps_min IS NULL OR target_reps_max IS NULL OR target_reps_min <= target_reps_max),
  CONSTRAINT CK_MemberWorkoutSessionExercises_Target CHECK (target_reps_min IS NOT NULL OR target_reps_max IS NOT NULL OR target_duration_seconds IS NOT NULL)
);
CREATE INDEX IX_MemberWorkoutSessionExercises_Session ON dbo.MemberWorkoutSessionExercises(session_id,sort_order,id);

CREATE TABLE dbo.MemberWorkoutSetLogs (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_MemberWorkoutSetLogs PRIMARY KEY,
  session_exercise_id INT NOT NULL,
  set_number SMALLINT NOT NULL CONSTRAINT CK_MemberWorkoutSetLogs_SetNumber CHECK (set_number > 0),
  reps INT NULL CONSTRAINT CK_MemberWorkoutSetLogs_Reps CHECK (reps IS NULL OR reps >= 0),
  weight_kg DECIMAL(10,2) NULL CONSTRAINT CK_MemberWorkoutSetLogs_Weight CHECK (weight_kg IS NULL OR weight_kg >= 0),
  duration_seconds INT NULL CONSTRAINT CK_MemberWorkoutSetLogs_Duration CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  distance_meters DECIMAL(10,2) NULL CONSTRAINT CK_MemberWorkoutSetLogs_Distance CHECK (distance_meters IS NULL OR distance_meters >= 0),
  completed BIT NOT NULL CONSTRAINT DF_MemberWorkoutSetLogs_Completed DEFAULT 0,
  note NVARCHAR(500) NULL,
  created_at DATETIME2(3) NOT NULL CONSTRAINT DF_MemberWorkoutSetLogs_Created DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_MemberWorkoutSetLogs_Updated DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_MemberWorkoutSetLogs_Exercise FOREIGN KEY (session_exercise_id) REFERENCES dbo.MemberWorkoutSessionExercises(id) ON DELETE CASCADE,
  CONSTRAINT UQ_MemberWorkoutSetLogs_Exercise_Number UNIQUE (session_exercise_id,set_number),
  CONSTRAINT CK_MemberWorkoutSetLogs_Metric CHECK (completed=0 OR reps IS NOT NULL OR weight_kg IS NOT NULL OR duration_seconds IS NOT NULL OR distance_meters IS NOT NULL)
);
CREATE INDEX IX_MemberWorkoutSetLogs_Exercise_Completed ON dbo.MemberWorkoutSetLogs(session_exercise_id,completed,set_number,id);
