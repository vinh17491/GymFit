import { getPool, closePool } from "../config/database";

async function createNotificationTable() {
  try {
    const pool = await getPool();
    console.log("Connected to SQL Server.\n");

    console.log("Creating Notifications table...");
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Notifications]') AND type in (N'U'))
      BEGIN
        CREATE TABLE [dbo].[Notifications] (
          [Id]        INT            IDENTITY(1,1) NOT NULL,
          [UserId]    INT            NOT NULL,
          [Title]     NVARCHAR(255)  NOT NULL,
          [Message]   NVARCHAR(MAX)  NOT NULL,
          [IsRead]    BIT            NOT NULL CONSTRAINT [DF_Notifications_IsRead] DEFAULT 0,
          [CreatedAt] DATETIME2      NOT NULL CONSTRAINT [DF_Notifications_CreatedAt] DEFAULT GETUTCDATE(),
          CONSTRAINT [PK_Notifications] PRIMARY KEY CLUSTERED ([Id]),
          CONSTRAINT [FK_Notifications_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id])
        );
        PRINT 'Notifications table created successfully.';
      END
      ELSE
      BEGIN
        PRINT 'Notifications table already exists.';
      END
    `);
    console.log("  -> Done.\n");

    console.log("Notification table verified/created successfully!");
    await closePool();
    process.exit(0);
  } catch (error) {
    console.error("Failed to create notification table:", error);
    await closePool();
    process.exit(1);
  }
}

createNotificationTable();