-- ============================================================
-- EduVLE — Migration
-- Run this ONCE on the existing database (created from edu_db.sql
-- + populated by eduDB_pop.py).  Does NOT touch any data.
-- ============================================================
USE edu_db;

-- Temporarily disable FK checks so we can modify referenced columns
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Add AUTO_INCREMENT to primary keys so the API can insert
--    new rows without knowing the next ID.
--    (The seeder's explicit IDs are already stored, so this is safe.)
ALTER TABLE Users       MODIFY idNumber     INT NOT NULL AUTO_INCREMENT;
ALTER TABLE Course      MODIFY courseID     INT NOT NULL AUTO_INCREMENT;
ALTER TABLE Section     MODIFY secNumber    INT NOT NULL AUTO_INCREMENT;
ALTER TABLE Content     MODIFY contentNumber INT NOT NULL AUTO_INCREMENT;
ALTER TABLE CalendarEvent MODIFY eventNumber INT NOT NULL AUTO_INCREMENT;
ALTER TABLE Forum       MODIFY forumNumber  INT NOT NULL AUTO_INCREMENT;
ALTER TABLE Thread      MODIFY threadNumber INT NOT NULL AUTO_INCREMENT;
ALTER TABLE Assignment  MODIFY assignmentNumber INT NOT NULL AUTO_INCREMENT;

-- 2. Add optional email column to Users (nullable — existing rows get NULL)
ALTER TABLE Users ADD COLUMN email VARCHAR(150) NULL;

-- 3. Make Submit.grade nullable (students submit first, lecturer grades later)
ALTER TABLE Submit MODIFY grade DECIMAL(5,2) NULL;

-- 4. Add submission detail columns to Submit (nullable — existing rows get NULL)
ALTER TABLE Submit ADD COLUMN submissionText TEXT NULL;
ALTER TABLE Submit ADD COLUMN submissionURL  TEXT NULL;
ALTER TABLE Submit ADD COLUMN feedback       TEXT NULL;
ALTER TABLE Submit ADD COLUMN gradedDate     DATETIME NULL;

-- Re-enable FK checks
SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Migration complete. Your existing data is untouched.' AS status;
