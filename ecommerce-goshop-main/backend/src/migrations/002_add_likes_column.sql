/*
  GymFit Migration 002: Add Likes column to QAPosts table.
  Safe to run multiple times (IF NOT EXISTS).
*/

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('QAPosts') AND name='Likes')
BEGIN
  ALTER TABLE QAPosts ADD Likes INT NOT NULL CONSTRAINT DF_QAPosts_Likes DEFAULT 0;
END
GO