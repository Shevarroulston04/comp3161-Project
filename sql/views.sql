USE edu_db;

CREATE OR REPLACE VIEW courses_50_or_more_students AS
SELECT c.courseID, c.courseCode, c.courseName, COUNT(e.studentID) AS studentCount
FROM Course c
JOIN Enroll e ON c.courseID = e.courseID
GROUP BY c.courseID, c.courseCode, c.courseName
HAVING COUNT(e.studentID) >= 50;

CREATE OR REPLACE VIEW students_5_or_more_courses AS
SELECT u.idNumber AS studentID, u.firstName, u.lastName, COUNT(e.courseID) AS courseCount
FROM Users u
JOIN Enroll e ON u.idNumber = e.studentID
WHERE u.role = 'student'
GROUP BY u.idNumber, u.firstName, u.lastName
HAVING COUNT(e.courseID) >= 5;

CREATE OR REPLACE VIEW lecturers_3_or_more_courses AS
SELECT u.idNumber AS lecturerID, u.firstName, u.lastName, COUNT(c.courseID) AS courseCount
FROM Users u
JOIN Course c ON u.idNumber = c.lecturerID
WHERE u.role = 'lecturer'
GROUP BY u.idNumber, u.firstName, u.lastName
HAVING COUNT(c.courseID) >= 3;

CREATE OR REPLACE VIEW top_10_most_enrolled_courses AS
SELECT c.courseID, c.courseCode, c.courseName, COUNT(e.studentID) AS totalStudents
FROM Course c
JOIN Enroll e ON c.courseID = e.courseID
GROUP BY c.courseID, c.courseCode, c.courseName
ORDER BY totalStudents DESC
LIMIT 10;

CREATE OR REPLACE VIEW top_10_students_highest_averages AS
SELECT u.idNumber AS studentID, u.firstName, u.lastName, AVG(s.grade) AS overallAverage
FROM Users u
JOIN Submit s ON u.idNumber = s.studentID
WHERE u.role = 'student' AND s.grade IS NOT NULL
GROUP BY u.idNumber, u.firstName, u.lastName
ORDER BY overallAverage DESC
LIMIT 10;
