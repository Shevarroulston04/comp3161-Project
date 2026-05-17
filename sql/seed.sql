-- ============================================================
-- EduVLE — Seed Data
-- COMP3161 Final Project
-- Run AFTER schema.sql and views.sql
-- ============================================================
USE edu_db;

DELIMITER //

DROP PROCEDURE IF EXISTS seed_eduvle //
CREATE PROCEDURE seed_eduvle()
BEGIN
  -- ── counters ──
  DECLARE i          INT DEFAULT 1;
  DECLARE j          INT DEFAULT 1;
  DECLARE cid        INT;
  DECLARE sid        INT;
  DECLARE lid        INT;
  DECLARE aid        INT;
  DECLARE enroll_cnt INT;
  DECLARE course_cnt INT;
  DECLARE fn         VARCHAR(60);
  DECLARE ln         VARCHAR(60);

  -- name pools (30 first / 30 last) so rows look varied
  DECLARE first_names VARCHAR(600) DEFAULT
    'James,Maria,David,Sarah,Michael,Ashley,Robert,Jessica,William,Emily,Daniel,Megan,Christopher,Amanda,Matthew,Brittany,Joshua,Samantha,Andrew,Lauren,Justin,Kayla,Ryan,Rachel,Kevin,Stephanie,John,Jennifer,Brian,Melissa';
  DECLARE last_names  VARCHAR(600) DEFAULT
    'Smith,Johnson,Williams,Brown,Jones,Garcia,Miller,Davis,Wilson,Taylor,Moore,Anderson,Thomas,Jackson,White,Harris,Martin,Thompson,Robinson,Lewis,Walker,Hall,Young,Allen,King,Wright,Scott,Green,Adams,Baker';

  -- ─────────────────────────────────────────────────────────
  -- 1.  Admins  (10 admins, IDs will be auto-assigned)
  -- ─────────────────────────────────────────────────────────
  SET i = 1;
  WHILE i <= 10 DO
    SET fn = ELT(1 + MOD(i - 1, 30), 'James','Maria','David','Sarah','Michael','Ashley','Robert','Jessica','William','Emily','Daniel','Megan','Christopher','Amanda','Matthew','Brittany','Joshua','Samantha','Andrew','Lauren','Justin','Kayla','Ryan','Rachel','Kevin','Stephanie','John','Jennifer','Brian','Melissa');
    SET ln = ELT(1 + MOD(i + 4, 30), 'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson','Taylor','Moore','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Robinson','Lewis','Walker','Hall','Young','Allen','King','Wright','Scott','Green','Adams','Baker');

    INSERT INTO Users (firstName, lastName, email, username, userPassword, role)
    VALUES (
      fn, ln,
      CONCAT('admin', i, '@eduvle.edu'),
      CONCAT('admin', i),
      -- bcrypt hash of 'adminpass' (pre-hashed, cost 10)
      '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
      'admin'
    );
    SET aid = LAST_INSERT_ID();
    INSERT INTO Admins (adminID) VALUES (aid);
    SET i = i + 1;
  END WHILE;

  -- ─────────────────────────────────────────────────────────
  -- 2.  Lecturers  (50 lecturers → up to 200 courses at 4 each)
  -- ─────────────────────────────────────────────────────────
  SET i = 1;
  WHILE i <= 50 DO
    SET fn = ELT(1 + MOD(i,     30), 'James','Maria','David','Sarah','Michael','Ashley','Robert','Jessica','William','Emily','Daniel','Megan','Christopher','Amanda','Matthew','Brittany','Joshua','Samantha','Andrew','Lauren','Justin','Kayla','Ryan','Rachel','Kevin','Stephanie','John','Jennifer','Brian','Melissa');
    SET ln = ELT(1 + MOD(i + 7, 30), 'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson','Taylor','Moore','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Robinson','Lewis','Walker','Hall','Young','Allen','King','Wright','Scott','Green','Adams','Baker');

    INSERT INTO Users (firstName, lastName, email, username, userPassword, role)
    VALUES (
      fn, ln,
      CONCAT('lecturer', i, '@eduvle.edu'),
      CONCAT('lect', i),
      -- bcrypt hash of 'lectpass'
      '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      'lecturer'
    );
    SET lid = LAST_INSERT_ID();
    INSERT INTO Lecturers (lecturerID) VALUES (lid);
    SET i = i + 1;
  END WHILE;

  -- ─────────────────────────────────────────────────────────
  -- 3.  Courses  (200 courses — 4 per lecturer)
  --     Subject pool gives realistic names
  -- ─────────────────────────────────────────────────────────
  SET i = 1;
  WHILE i <= 200 DO
    -- cycle through lecturers (IDs 11–60 since admins were 1-10)
    SET lid = 10 + (1 + MOD(i - 1, 50));   -- lecturer user IDs 11..60
    -- first admin
    SET aid = 1;

    INSERT INTO Course (courseCode, courseName, courseDescription, lecturerID, adminID)
    VALUES (
      CONCAT('CRS', LPAD(i, 4, '0')),
      ELT(1 + MOD(i - 1, 40),
        'Introduction to Computing','Calculus I','Database Systems',
        'Data Structures','Algorithms','Operating Systems',
        'Computer Networks','Software Engineering','Web Development',
        'Artificial Intelligence','Machine Learning','Statistics',
        'Linear Algebra','Discrete Mathematics','Programming Fundamentals',
        'Object-Oriented Programming','Mobile Development','Cybersecurity',
        'Cloud Computing','Digital Logic','Computer Architecture',
        'Compiler Design','Human-Computer Interaction','Project Management',
        'Technical Writing','Research Methods','Numerical Analysis',
        'Parallel Computing','Distributed Systems','Game Development',
        'Data Mining','Business Intelligence','Information Systems',
        'Systems Analysis','Network Security','Cryptography',
        'Computer Graphics','Robotics','Embedded Systems','Big Data Analytics'),
      CONCAT('This course covers fundamental concepts and advanced topics in the subject area. Students will gain practical and theoretical knowledge through lectures, assignments, and projects.'),
      lid,
      aid
    );
    SET cid = LAST_INSERT_ID();

    -- Add a default section and a calendar event per course
    INSERT INTO Section (sectionName, sectionOrder, courseID)
    VALUES (CONCAT('Unit 1: Introduction'), 1, cid),
           (CONCAT('Unit 2: Core Concepts'), 2, cid),
           (CONCAT('Unit 3: Advanced Topics'), 3, cid);

    INSERT INTO CalendarEvent (courseID, eventName, eventDate, createdBy)
    VALUES
      (cid, 'Midterm Exam',  DATE_ADD('2025-03-01', INTERVAL MOD(i, 60)  DAY), lid),
      (cid, 'Final Exam',    DATE_ADD('2025-05-01', INTERVAL MOD(i, 30)  DAY), lid),
      (cid, 'Assignment Due',DATE_ADD('2025-02-15', INTERVAL MOD(i, 45)  DAY), lid);

    -- Add an assignment per course
    INSERT INTO Assignment (courseID, assignmentName, assignmentDescription, maxMarks, dueDate, createdBy)
    VALUES
      (cid, 'Assignment 1', 'Complete the problems in the first chapter.', 100.00,
       DATE_ADD('2025-02-28', INTERVAL MOD(i, 60) DAY), lid),
      (cid, 'Midterm Project', 'Group project covering units 1 and 2.', 100.00,
       DATE_ADD('2025-04-01', INTERVAL MOD(i, 30) DAY), lid);

    -- Add a forum per course
    INSERT INTO Forum (courseID, header, createdBy)
    VALUES (cid, 'General Discussion', lid),
           (cid, 'Q&A — Ask your questions here', lid);

    SET i = i + 1;
  END WHILE;

  -- ─────────────────────────────────────────────────────────
  -- 4.  Students  (100,000 students)
  --     Batch commit every 5000 to avoid huge transactions
  -- ─────────────────────────────────────────────────────────
  SET i = 1;
  WHILE i <= 100000 DO
    SET fn = ELT(1 + MOD(i,      30), 'James','Maria','David','Sarah','Michael','Ashley','Robert','Jessica','William','Emily','Daniel','Megan','Christopher','Amanda','Matthew','Brittany','Joshua','Samantha','Andrew','Lauren','Justin','Kayla','Ryan','Rachel','Kevin','Stephanie','John','Jennifer','Brian','Melissa');
    SET ln = ELT(1 + MOD(i + 13, 30), 'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson','Taylor','Moore','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Robinson','Lewis','Walker','Hall','Young','Allen','King','Wright','Scott','Green','Adams','Baker');

    INSERT INTO Users (firstName, lastName, email, username, userPassword, role)
    VALUES (
      fn, ln,
      CONCAT('student', i, '@eduvle.edu'),
      CONCAT('stu', LPAD(i, 6, '0')),
      -- bcrypt hash of 'studentpass'
      '$2a$10$TKh8H1.PfQx37YgCFWjXLOlnXeNP5h4e1P3I1gXnEBVqW3hBb8Fci',
      'student'
    );
    SET sid = LAST_INSERT_ID();
    INSERT INTO Students (studentID) VALUES (sid);

    -- ── Enroll this student in 3–6 courses (weighted random via MOD tricks) ──
    SET enroll_cnt = 3 + MOD(i * 7 + 13, 4);   -- gives 3,4,5,6 cycling

    -- We use MOD-based offsets to spread enrollments evenly across 200 courses
    SET j = 1;
    SET course_cnt = 0;
    WHILE course_cnt < enroll_cnt DO
      SET cid = 1 + MOD((i * 3 + j * 97 + course_cnt * 31) , 200);
      -- ignore duplicate key errors via INSERT IGNORE
      INSERT IGNORE INTO Enroll (studentID, courseID) VALUES (sid, cid);
      SET course_cnt = course_cnt + IF(ROW_COUNT() > 0, 1, 0);
      SET j = j + 1;
      -- safety exit to avoid infinite loop on collision
      IF j > 30 THEN SET course_cnt = enroll_cnt; END IF;
    END WHILE;

    SET i = i + 1;
  END WHILE;

  -- ─────────────────────────────────────────────────────────
  -- 5.  Sample grades — give ~20% of enrollments a submitted + graded assignment
  -- ─────────────────────────────────────────────────────────
  INSERT INTO Submit (studentID, assignmentNumber, submissionText, grade, gradedDate, gradedBy)
  SELECT
    e.studentID,
    a.assignmentNumber,
    'Submitted via seeder.',
    ROUND(50 + (MOD(e.studentID * 7 + a.assignmentNumber * 13, 51)), 2),
    NOW(),
    (SELECT lecturerID FROM Course c2 WHERE c2.courseID = a.courseID LIMIT 1)
  FROM Enroll e
  JOIN Assignment a ON a.courseID = e.courseID
  WHERE MOD(e.studentID + a.assignmentNumber, 5) = 0
  LIMIT 500000;

END //

DELIMITER ;

-- ── Run the seeder ──
CALL seed_eduvle();
DROP PROCEDURE IF EXISTS seed_eduvle;

SELECT 'Seeding complete.' AS status;
SELECT COUNT(*) AS total_students  FROM Students;
SELECT COUNT(*) AS total_courses   FROM Course;
SELECT COUNT(*) AS total_lecturers FROM Lecturers;
SELECT COUNT(*) AS total_enrollments FROM Enroll;
SELECT COUNT(*) AS total_grades FROM Submit WHERE grade IS NOT NULL;
