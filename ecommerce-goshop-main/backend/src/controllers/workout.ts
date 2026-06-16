import { NextFunction, Request, Response } from "express";
import { getPool } from "../config/database";

type AuthRequest = Request & { userId?: number; roleName?: string };

// GET /workouts?page=1&limit=12&difficulty=BEGINNER - Public
export const getAllWorkouts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 12));
    const offset = (page - 1) * limit;
    const difficulty = req.query.difficulty as string;
    const difficultyUpper = difficulty?.toUpperCase();

    const pool = await getPool();
    let countQuery = `SELECT COUNT(*) AS Total FROM WorkoutPrograms WHERE Status = 'ACTIVE'`;
    if (difficultyUpper && ["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(difficultyUpper)) {
      countQuery += ` AND Difficulty = @difficulty`;
    }

    const countRequest = pool.request();
    if (difficultyUpper && ["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(difficultyUpper)) {
      countRequest.input("difficulty", difficultyUpper);
    }
    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].Total;

    let dataQuery = `
      SELECT wp.*, u.FullName AS CreatedByName
      FROM WorkoutPrograms wp
      LEFT JOIN Users u ON wp.MemberId = u.Id
      WHERE wp.Status = 'ACTIVE'
    `;
    if (difficultyUpper && ["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(difficultyUpper)) {
      dataQuery += ` AND wp.Difficulty = @difficulty`;
    }
    dataQuery += ` ORDER BY wp.CreatedAt DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

    const dataRequest = pool.request();
    if (difficultyUpper && ["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(difficultyUpper)) {
      dataRequest.input("difficulty", difficultyUpper);
    }
    dataRequest.input("limit", limit);
    dataRequest.input("offset", offset);
    const result = await dataRequest.query(dataQuery);

    res.status(200).json({
      data: result.recordset,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next({ message: "Unable to fetch workouts", error });
  }
};

// GET /workouts/:id - Public
export const getWorkoutById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const programResult = await pool.request()
      .input("id", req.params.id)
      .query(`
        SELECT wp.*, u.FullName AS CreatedByName
        FROM WorkoutPrograms wp
        LEFT JOIN Users u ON wp.MemberId = u.Id
        WHERE wp.Id = @id
      `);
    if (programResult.recordset.length === 0) {
      return res.status(404).json({ message: "Workout program not found" });
    }

    const exercisesResult = await pool.request()
      .input("programId", req.params.id)
      .query(`
        SELECT * FROM WorkoutProgramExercises
        WHERE ProgramId = @programId
        ORDER BY WeekNumber, DayNumber, OrderIndex
      `);

    res.status(200).json({
      ...programResult.recordset[0],
      exercises: exercisesResult.recordset,
    });
  } catch (error) {
    next({ message: "Unable to fetch workout program", error });
  }
};

// POST /workouts - ADMIN/COACH only
export const createWorkout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const { title, description, durationWeeks, difficulty, exercises } = req.body;
    const createdBy = authReq.roleName === "COACH" ? "COACH" : "ADMIN";
    const coachId = authReq.roleName === "COACH" ? authReq.userId : null;

    if (!title || !durationWeeks || !difficulty || !exercises) {
      return res.status(400).json({ message: "Title, durationWeeks, difficulty, and exercises are required" });
    }

    const validDifficulties = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
    if (!validDifficulties.includes(difficulty.toUpperCase())) {
      return res.status(400).json({ message: "Invalid difficulty. Use: BEGINNER, INTERMEDIATE, or ADVANCED" });
    }

    if (!Array.isArray(exercises) || exercises.length === 0) {
      return res.status(400).json({ message: "Exercises must be a non-empty array" });
    }

    const pool = await getPool();

    const programResult = await pool.request()
      .input("coachId", coachId)
      .input("title", title)
      .input("description", description || null)
      .input("durationWeeks", Number(durationWeeks))
      .input("difficulty", difficulty.toUpperCase())
      .input("createdBy", createdBy)
      .query(`
        INSERT INTO WorkoutPrograms (MemberId, CoachId, Title, Description, Exercises, DurationWeeks, Difficulty, Status, CreatedBy)
        OUTPUT INSERTED.*
        VALUES (NULL, @coachId, @title, @description, '[]', @durationWeeks, @difficulty, 'ACTIVE', @createdBy)
      `);

    const programId = programResult.recordset[0].Id;

    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      await pool.request()
        .input("programId", programId)
        .input("weekNumber", Number(ex.weekNumber) || 1)
        .input("dayNumber", Number(ex.dayNumber) || 1)
        .input("exerciseName", ex.exerciseName || ex.name)
        .input("sets", Number(ex.sets) || 0)
        .input("reps", Number(ex.reps) || 0)
        .input("restSeconds", ex.restSeconds ? Number(ex.restSeconds) : null)
        .input("notes", ex.notes || null)
        .input("orderIndex", Number(ex.orderIndex) || i)
        .query(`
          INSERT INTO WorkoutProgramExercises (ProgramId, WeekNumber, DayNumber, ExerciseName, Sets, Reps, RestSeconds, Notes, OrderIndex)
          VALUES (@programId, @weekNumber, @dayNumber, @exerciseName, @sets, @reps, @restSeconds, @notes, @orderIndex)
        `);
    }

    const exercisesResult = await pool.request()
      .input("programId", programId)
      .query(`
        SELECT * FROM WorkoutProgramExercises
        WHERE ProgramId = @programId
        ORDER BY WeekNumber, DayNumber, OrderIndex
      `);

    res.status(201).json({
      ...programResult.recordset[0],
      exercises: exercisesResult.recordset,
    });
  } catch (error) {
    next({ message: "Unable to create workout program", error });
  }
};

// PUT /workouts/:id - ADMIN/COACH only
export const updateWorkout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const programId = Number(req.params.id);
    const { title, description, durationWeeks, difficulty, status, exercises } = req.body;

    const pool = await getPool();
    const existing = await pool.request()
      .input("id", programId)
      .query("SELECT * FROM WorkoutPrograms WHERE Id = @id");
    if (existing.recordset.length === 0) {
      return res.status(404).json({ message: "Workout program not found" });
    }

    const program = existing.recordset[0];
    const finalTitle = title ?? program.Title;
    const finalDescription = description ?? program.Description;
    const finalDurationWeeks = durationWeeks !== undefined ? Number(durationWeeks) : program.DurationWeeks;
    const finalDifficulty = difficulty ? difficulty.toUpperCase() : program.Difficulty;
    const finalStatus = status ?? program.Status;

    if (finalDifficulty && !["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(finalDifficulty)) {
      return res.status(400).json({ message: "Invalid difficulty. Use: BEGINNER, INTERMEDIATE, or ADVANCED" });
    }

    if (finalStatus && !["ACTIVE", "COMPLETED", "ARCHIVED"].includes(finalStatus)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    await pool.request()
      .input("id", programId)
      .input("title", finalTitle)
      .input("description", finalDescription)
      .input("durationWeeks", finalDurationWeeks)
      .input("difficulty", finalDifficulty)
      .input("status", finalStatus)
      .query(`
        UPDATE WorkoutPrograms
        SET Title = @title, Description = @description, DurationWeeks = @durationWeeks,
            Difficulty = @difficulty, Status = @status, UpdatedAt = GETUTCDATE()
        WHERE Id = @id
      `);

    if (Array.isArray(exercises)) {
      await pool.request()
        .input("programId", programId)
        .query("DELETE FROM WorkoutProgramExercises WHERE ProgramId = @programId");

      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        await pool.request()
          .input("programId", programId)
          .input("weekNumber", Number(ex.weekNumber) || 1)
          .input("dayNumber", Number(ex.dayNumber) || 1)
          .input("exerciseName", ex.exerciseName || ex.name)
          .input("sets", Number(ex.sets) || 0)
          .input("reps", Number(ex.reps) || 0)
          .input("restSeconds", ex.restSeconds ? Number(ex.restSeconds) : null)
          .input("notes", ex.notes || null)
          .input("orderIndex", Number(ex.orderIndex) || i)
          .query(`
            INSERT INTO WorkoutProgramExercises (ProgramId, WeekNumber, DayNumber, ExerciseName, Sets, Reps, RestSeconds, Notes, OrderIndex)
            VALUES (@programId, @weekNumber, @dayNumber, @exerciseName, @sets, @reps, @restSeconds, @notes, @orderIndex)
          `);
      }
    }

    const updated = await pool.request()
      .input("id", programId)
      .query("SELECT * FROM WorkoutPrograms WHERE Id = @id");

    const exercisesResult = await pool.request()
      .input("programId", programId)
      .query(`
        SELECT * FROM WorkoutProgramExercises
        WHERE ProgramId = @programId
        ORDER BY WeekNumber, DayNumber, OrderIndex
      `);

    res.status(200).json({
      ...updated.recordset[0],
      exercises: exercisesResult.recordset,
    });
  } catch (error) {
    next({ message: "Unable to update workout program", error });
  }
};

// DELETE /workouts/:id - ADMIN/COACH only
export const deleteWorkout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const programId = Number(req.params.id);
    const pool = await getPool();

    const existing = await pool.request()
      .input("id", programId)
      .query("SELECT Id FROM WorkoutPrograms WHERE Id = @id");
    if (existing.recordset.length === 0) {
      return res.status(404).json({ message: "Workout program not found" });
    }

    await pool.request()
      .input("id", programId)
      .query("UPDATE WorkoutPrograms SET Status = 'ARCHIVED', UpdatedAt = GETUTCDATE() WHERE Id = @id");

    res.status(200).json({ message: "Workout program deleted" });
  } catch (error) {
    next({ message: "Unable to delete workout program", error });
  }
};

// =========== SAVE / UNSAVE ===========

// POST /workouts/save/:id - MEMBER only
export const saveWorkout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const programId = Number(req.params.id);

    const pool = await getPool();
    const program = await pool.request()
      .input("id", programId)
      .query("SELECT Id FROM WorkoutPrograms WHERE Id = @id AND Status = 'ACTIVE'");
    if (program.recordset.length === 0) {
      return res.status(404).json({ message: "Workout program not found" });
    }

    const existing = await pool.request()
      .input("userId", userId)
      .input("programId", programId)
      .query("SELECT Id FROM WorkoutProgramSaves WHERE UserId = @userId AND ProgramId = @programId");
    if (existing.recordset.length > 0) {
      return res.status(409).json({ message: "Workout already saved" });
    }

    await pool.request()
      .input("userId", userId)
      .input("programId", programId)
      .query("INSERT INTO WorkoutProgramSaves (UserId, ProgramId) VALUES (@userId, @programId)");

    res.status(201).json({ message: "Workout saved", saved: true });
  } catch (error) {
    next({ message: "Unable to save workout", error });
  }
};

// DELETE /workouts/unsave/:id - MEMBER only
export const unsaveWorkout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const programId = Number(req.params.id);

    const pool = await getPool();
    const existing = await pool.request()
      .input("userId", userId)
      .input("programId", programId)
      .query("SELECT Id FROM WorkoutProgramSaves WHERE UserId = @userId AND ProgramId = @programId");
    if (existing.recordset.length === 0) {
      return res.status(404).json({ message: "Saved workout not found" });
    }

    await pool.request()
      .input("userId", userId)
      .input("programId", programId)
      .query("DELETE FROM WorkoutProgramSaves WHERE UserId = @userId AND ProgramId = @programId");

    res.status(200).json({ message: "Workout unsaved", saved: false });
  } catch (error) {
    next({ message: "Unable to unsave workout", error });
  }
};

// GET /workouts/saved - MEMBER only
export const getMySavedWorkouts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;

    const pool = await getPool();
    const result = await pool.request()
      .input("userId", userId)
      .query(`
        SELECT wp.*, wps.CreatedAt AS SavedAt
        FROM WorkoutProgramSaves wps
        INNER JOIN WorkoutPrograms wp ON wps.ProgramId = wp.Id
        WHERE wps.UserId = @userId AND wp.Status = 'ACTIVE'
        ORDER BY wps.CreatedAt DESC
      `);

    res.status(200).json(result.recordset);
  } catch (error) {
    next({ message: "Unable to fetch saved workouts", error });
  }
};

// =========== FAVORITES ===========

// POST /workouts/favorite/:id - MEMBER only
export const favoriteWorkout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const programId = Number(req.params.id);

    const pool = await getPool();
    const program = await pool.request()
      .input("id", programId)
      .query("SELECT Id FROM WorkoutPrograms WHERE Id = @id AND Status = 'ACTIVE'");
    if (program.recordset.length === 0) {
      return res.status(404).json({ message: "Workout program not found" });
    }

    const existing = await pool.request()
      .input("userId", userId)
      .input("programId", programId)
      .query("SELECT Id FROM WorkoutProgramFavorites WHERE UserId = @userId AND ProgramId = @programId");
    if (existing.recordset.length > 0) {
      await pool.request()
        .input("userId", userId)
        .input("programId", programId)
        .query("DELETE FROM WorkoutProgramFavorites WHERE UserId = @userId AND ProgramId = @programId");
      return res.status(200).json({ message: "Workout unfavorited", favorited: false });
    }

    await pool.request()
      .input("userId", userId)
      .input("programId", programId)
      .query("INSERT INTO WorkoutProgramFavorites (UserId, ProgramId) VALUES (@userId, @programId)");

    res.status(200).json({ message: "Workout favorited", favorited: true });
  } catch (error) {
    next({ message: "Unable to favorite workout", error });
  }
};

// GET /workouts/favorites - MEMBER only
export const getMyFavoriteWorkouts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;

    const pool = await getPool();
    const result = await pool.request()
      .input("userId", userId)
      .query(`
        SELECT wp.*, wpf.CreatedAt AS FavoritedAt
        FROM WorkoutProgramFavorites wpf
        INNER JOIN WorkoutPrograms wp ON wpf.ProgramId = wp.Id
        WHERE wpf.UserId = @userId AND wp.Status = 'ACTIVE'
        ORDER BY wpf.CreatedAt DESC
      `);

    res.status(200).json(result.recordset);
  } catch (error) {
    next({ message: "Unable to fetch favorite workouts", error });
  }
};

// =========== EXERCISES ===========

// GET /workouts/:id/exercises - Public
export const getWorkoutExercises = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const program = await pool.request()
      .input("id", req.params.id)
      .query("SELECT Id FROM WorkoutPrograms WHERE Id = @id");
    if (program.recordset.length === 0) {
      return res.status(404).json({ message: "Workout program not found" });
    }

    const result = await pool.request()
      .input("programId", req.params.id)
      .query(`
        SELECT * FROM WorkoutProgramExercises
        WHERE ProgramId = @programId
        ORDER BY WeekNumber, DayNumber, OrderIndex
      `);

    res.status(200).json(result.recordset);
  } catch (error) {
    next({ message: "Unable to fetch exercises", error });
  }
};

// POST /workouts/:id/exercises - ADMIN/COACH only
export const addExercise = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const programId = Number(req.params.id);
    const { weekNumber, dayNumber, exerciseName, sets, reps, restSeconds, notes, orderIndex } = req.body;

    if (!exerciseName) {
      return res.status(400).json({ message: "Exercise name is required" });
    }

    const pool = await getPool();
    const program = await pool.request()
      .input("id", programId)
      .query("SELECT Id FROM WorkoutPrograms WHERE Id = @id");
    if (program.recordset.length === 0) {
      return res.status(404).json({ message: "Workout program not found" });
    }

    const result = await pool.request()
      .input("programId", programId)
      .input("weekNumber", Number(weekNumber) || 1)
      .input("dayNumber", Number(dayNumber) || 1)
      .input("exerciseName", exerciseName)
      .input("sets", Number(sets) || 0)
      .input("reps", Number(reps) || 0)
      .input("restSeconds", restSeconds ? Number(restSeconds) : null)
      .input("notes", notes || null)
      .input("orderIndex", Number(orderIndex) || 0)
      .query(`
        INSERT INTO WorkoutProgramExercises (ProgramId, WeekNumber, DayNumber, ExerciseName, Sets, Reps, RestSeconds, Notes, OrderIndex)
        OUTPUT INSERTED.*
        VALUES (@programId, @weekNumber, @dayNumber, @exerciseName, @sets, @reps, @restSeconds, @notes, @orderIndex)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (error) {
    next({ message: "Unable to add exercise", error });
  }
};

// PUT /workouts/exercises/:exerciseId - ADMIN/COACH only
export const updateExercise = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const exerciseId = Number(req.params.exerciseId);
    const { weekNumber, dayNumber, exerciseName, sets, reps, restSeconds, notes, orderIndex } = req.body;

    const pool = await getPool();
    const existing = await pool.request()
      .input("id", exerciseId)
      .query("SELECT * FROM WorkoutProgramExercises WHERE Id = @id");
    if (existing.recordset.length === 0) {
      return res.status(404).json({ message: "Exercise not found" });
    }

    const ex = existing.recordset[0];
    const finalWeekNumber = weekNumber !== undefined ? Number(weekNumber) : ex.WeekNumber;
    const finalDayNumber = dayNumber !== undefined ? Number(dayNumber) : ex.DayNumber;
    const finalExerciseName = exerciseName ?? ex.ExerciseName;
    const finalSets = sets !== undefined ? Number(sets) : ex.Sets;
    const finalReps = reps !== undefined ? Number(reps) : ex.Reps;
    const finalRestSeconds = restSeconds !== undefined ? (restSeconds ? Number(restSeconds) : null) : ex.RestSeconds;
    const finalNotes = notes !== undefined ? notes : ex.Notes;
    const finalOrderIndex = orderIndex !== undefined ? Number(orderIndex) : ex.OrderIndex;

    await pool.request()
      .input("id", exerciseId)
      .input("weekNumber", finalWeekNumber)
      .input("dayNumber", finalDayNumber)
      .input("exerciseName", finalExerciseName)
      .input("sets", finalSets)
      .input("reps", finalReps)
      .input("restSeconds", finalRestSeconds)
      .input("notes", finalNotes)
      .input("orderIndex", finalOrderIndex)
      .query(`
        UPDATE WorkoutProgramExercises
        SET WeekNumber = @weekNumber, DayNumber = @dayNumber, ExerciseName = @exerciseName,
            Sets = @sets, Reps = @reps, RestSeconds = @restSeconds, Notes = @notes, OrderIndex = @orderIndex
        WHERE Id = @id
      `);

    const updated = await pool.request()
      .input("id", exerciseId)
      .query("SELECT * FROM WorkoutProgramExercises WHERE Id = @id");

    res.status(200).json(updated.recordset[0]);
  } catch (error) {
    next({ message: "Unable to update exercise", error });
  }
};

// DELETE /workouts/exercises/:exerciseId - ADMIN/COACH only
export const deleteExercise = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const exerciseId = Number(req.params.exerciseId);

    const pool = await getPool();
    const existing = await pool.request()
      .input("id", exerciseId)
      .query("SELECT Id FROM WorkoutProgramExercises WHERE Id = @id");
    if (existing.recordset.length === 0) {
      return res.status(404).json({ message: "Exercise not found" });
    }

    await pool.request()
      .input("id", exerciseId)
      .query("DELETE FROM WorkoutProgramExercises WHERE Id = @id");

    res.status(200).json({ message: "Exercise deleted" });
  } catch (error) {
    next({ message: "Unable to delete exercise", error });
  }
};

// =========== COMPLETE PROGRAM ===========

// POST /workouts/:id/complete - MEMBER only
export const completeWorkout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const programId = Number(req.params.id);

    const pool = await getPool();
    const program = await pool.request()
      .input("id", programId)
      .query("SELECT Id, Status FROM WorkoutPrograms WHERE Id = @id");
    if (program.recordset.length === 0) {
      return res.status(404).json({ message: "Workout program not found" });
    }

    await pool.request()
      .input("id", programId)
      .query("UPDATE WorkoutPrograms SET Status = 'COMPLETED', UpdatedAt = GETUTCDATE() WHERE Id = @id");

    res.status(200).json({ message: "Workout program completed" });
  } catch (error) {
    next({ message: "Unable to complete workout program", error });
  }
};