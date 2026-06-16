import { getPool, closePool } from "../config/database";

async function createBlogTables() {
  try {
    const pool = await getPool();
    console.log("Connected to SQL Server.\n");

    // Create BlogComments
    console.log("Creating BlogComments table...");
    await pool.request().query(`
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
        PRINT 'BlogComments table created successfully.';
      END
      ELSE
      BEGIN
        PRINT 'BlogComments table already exists.';
      END
    `);
    console.log("  -> Done.\n");

    // Create BlogLikes
    console.log("Creating BlogLikes table...");
    await pool.request().query(`
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
        PRINT 'BlogLikes table created successfully.';
      END
      ELSE
      BEGIN
        PRINT 'BlogLikes table already exists.';
      END
    `);
    console.log("  -> Done.\n");

    console.log("All blog tables verified/created successfully!");
    await closePool();
    process.exit(0);
  } catch (error) {
    console.error("Failed to create blog tables:", error);
    await closePool();
    process.exit(1);
  }
}

createBlogTables();