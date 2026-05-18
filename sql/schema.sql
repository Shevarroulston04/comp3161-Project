-- ============================================================
-- EduVLE Course Management System — Database Schema
-- COMP3161 Final Project
--
--  two additions:
--   1. AUTO_INCREMENT on PKs so the REST API can insert without
--      knowing the next ID (the Python seeder's explicit IDs
--      still work fine with AUTO_INCREMENT).
--   2. email column on Users (nullable) for login UX.
-- ============================================================

DROP DATABASE IF EXISTS edu_db;
CREATE DATABASE edu_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE edu_db;

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE Users (
    idNumber     INT          PRIMARY KEY AUTO_INCREMENT,
    username     VARCHAR(100) NOT NULL UNIQUE,
    firstName    VARCHAR(100) NOT NULL,
    lastName     VARCHAR(255) NOT NULL,
    userPassword VARCHAR(255) NOT NULL,   -- SHA-256 (seeder) OR bcrypt (API)
    role         ENUM('student','lecturer','admin') NOT NULL,
    email        VARCHAR(150) NULL        -- optional; not in original ERD
);

-- ── Role subtypes ─────────────────────────────────────────────
CREATE TABLE Students (
    studentID INT PRIMARY KEY,
    FOREIGN KEY (studentID) REFERENCES Users(idNumber)
);

CREATE TABLE Lecturers (
    lecturerID INT PRIMARY KEY,
    FOREIGN KEY (lecturerID) REFERENCES Users(idNumber)
);

CREATE TABLE Admins (
    adminID INT PRIMARY KEY,
    FOREIGN KEY (adminID) REFERENCES Users(idNumber)
);

-- ── Course ────────────────────────────────────────────────────
CREATE TABLE Course (
    courseID    INT          PRIMARY KEY AUTO_INCREMENT,
    courseName  VARCHAR(100) NOT NULL,
    lecturerID  INT          NOT NULL,
    adminID     INT          NOT NULL,
    FOREIGN KEY (lecturerID) REFERENCES Lecturers(lecturerID),
    FOREIGN KEY (adminID)    REFERENCES Admins(adminID)
);

-- ── Enroll ────────────────────────────────────────────────────
CREATE TABLE Enroll (
    studentID INT NOT NULL,
    courseID  INT NOT NULL,
    PRIMARY KEY (studentID, courseID),
    FOREIGN KEY (studentID) REFERENCES Students(studentID),
    FOREIGN KEY (courseID)  REFERENCES Course(courseID)
);

-- ── Section ───────────────────────────────────────────────────
CREATE TABLE Section (
    secNumber   INT          PRIMARY KEY AUTO_INCREMENT,
    sectionName VARCHAR(255) NOT NULL,
    courseID    INT          NOT NULL,
    FOREIGN KEY (courseID) REFERENCES Course(courseID)
);

-- ── Content ───────────────────────────────────────────────────
CREATE TABLE Content (
    contentNumber INT          PRIMARY KEY AUTO_INCREMENT,
    secNumber     INT          NOT NULL,
    contentName   VARCHAR(100) NOT NULL,
    fileType      ENUM('link','file','slides') NOT NULL,
    contentURL    TEXT         NOT NULL,
    FOREIGN KEY (secNumber) REFERENCES Section(secNumber)
);

-- ── CalendarEvent ─────────────────────────────────────────────
CREATE TABLE CalendarEvent (
    eventNumber INT          PRIMARY KEY AUTO_INCREMENT,
    courseID    INT          NOT NULL,
    eventName   VARCHAR(100) NOT NULL,
    eventDate   DATETIME     NOT NULL,
    FOREIGN KEY (courseID) REFERENCES Course(courseID)
);

-- ── Forum ─────────────────────────────────────────────────────
CREATE TABLE Forum (
    forumNumber INT          PRIMARY KEY AUTO_INCREMENT,
    courseID    INT          NOT NULL,
    header      VARCHAR(100) NOT NULL,
    FOREIGN KEY (courseID) REFERENCES Course(courseID)
);

-- ── Thread  (top-level posts AND nested replies via parentThreadID)
CREATE TABLE Thread (
    threadNumber   INT          PRIMARY KEY AUTO_INCREMENT,
    forumNumber    INT          NOT NULL,
    userID         INT          NOT NULL,   -- any User (student or lecturer)
    title          VARCHAR(255) NOT NULL,
    forumMessage   TEXT         NOT NULL,
    parentThreadID INT          NULL,       -- NULL = top-level; set = reply
    FOREIGN KEY (userID)         REFERENCES Users(idNumber),
    FOREIGN KEY (forumNumber)    REFERENCES Forum(forumNumber),
    FOREIGN KEY (parentThreadID) REFERENCES Thread(threadNumber)
);

-- ── Assignment ────────────────────────────────────────────────
CREATE TABLE Assignment (
    assignmentNumber INT           PRIMARY KEY AUTO_INCREMENT,
    courseID         INT           NOT NULL,
    assignmentName   VARCHAR(255)  NOT NULL,
    maxMarks         DECIMAL(5,2)  NOT NULL,
    dueDate          DATETIME,
    FOREIGN KEY (courseID) REFERENCES Course(courseID)
);

-- ── Submit ────────────────────────────────────────────────────
-- grade is nullable so students can submit first and be graded later
CREATE TABLE Submit (
    studentID        INT          NOT NULL,
    assignmentNumber INT          NOT NULL,
    grade            DECIMAL(5,2) NULL,          -- NULL until lecturer grades
    submissionDate   DATETIME     DEFAULT CURRENT_TIMESTAMP,
    submissionText   TEXT         NULL,
    submissionURL    TEXT         NULL,
    feedback         TEXT         NULL,
    gradedDate       DATETIME     NULL,
    PRIMARY KEY (studentID, assignmentNumber),
    FOREIGN KEY (studentID)        REFERENCES Students(studentID),
    FOREIGN KEY (assignmentNumber) REFERENCES Assignment(assignmentNumber)
);

-- ── Performance indexes ───────────────────────────────────────
CREATE INDEX idx_course_lecturer   ON Course(lecturerID);
CREATE INDEX idx_enroll_course     ON Enroll(courseID);
CREATE INDEX idx_enroll_student    ON Enroll(studentID);
CREATE INDEX idx_section_course    ON Section(courseID);
CREATE INDEX idx_content_section   ON Content(secNumber);
CREATE INDEX idx_event_course      ON CalendarEvent(courseID, eventDate);
CREATE INDEX idx_forum_course      ON Forum(courseID);
CREATE INDEX idx_thread_forum      ON Thread(forumNumber);
CREATE INDEX idx_thread_parent     ON Thread(parentThreadID);
CREATE INDEX idx_submit_assignment ON Submit(assignmentNumber);

-- ── Required views  ─
-- 1. All courses with 50+ students
CREATE VIEW CoursesWithFiftyPlusStudents AS
SELECT c.courseID, c.courseName, COUNT(e.studentID) AS studentCount
FROM Course c JOIN Enroll e ON c.courseID = e.courseID
GROUP BY c.courseID, c.courseName
HAVING COUNT(e.studentID) >= 50;

-- 2. Students enrolled in 5+ courses
CREATE VIEW StudentsFivePlusCourses AS
SELECT s.studentID, u.firstName, u.lastName, COUNT(e.courseID) AS courseCount
FROM Students s
JOIN Users   u ON s.studentID = u.idNumber
JOIN Enroll  e ON s.studentID = e.studentID
GROUP BY s.studentID, u.firstName, u.lastName
HAVING COUNT(e.courseID) >= 5;

-- 3. Lecturers teaching 3+ courses
CREATE VIEW LecturersThreePlusCourses AS
SELECT l.lecturerID, u.firstName, u.lastName, COUNT(c.courseID) AS courseCount
FROM Lecturers l
JOIN Users   u ON l.lecturerID = u.idNumber
JOIN Course  c ON l.lecturerID = c.lecturerID
GROUP BY l.lecturerID, u.firstName, u.lastName
HAVING COUNT(c.courseID) >= 3;

-- 4. Top 10 most enrolled courses
CREATE VIEW TopTenEnrolledCourses AS
SELECT c.courseID, c.courseName, COUNT(e.studentID) AS enrollmentCount
FROM Course c JOIN Enroll e ON c.courseID = e.courseID
GROUP BY c.courseID, c.courseName
ORDER BY enrollmentCount DESC
LIMIT 10;

-- 5. Top 10 students by overall average
CREATE VIEW TopTenStudentAverages AS
SELECT s.studentID, u.firstName, u.lastName,
       ROUND(AVG(sub.grade), 2) AS overallAverage
FROM Students s
JOIN Users   u   ON s.studentID = u.idNumber
JOIN Submit  sub ON s.studentID = sub.studentID
WHERE sub.grade IS NOT NULL
GROUP BY s.studentID, u.firstName, u.lastName
ORDER BY overallAverage DESC
LIMIT 10;
