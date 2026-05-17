DROP VIEW IF EXISTS courses_50_or_more_students;
DROP VIEW IF EXISTS students_5_or_more_courses;
DROP VIEW IF EXISTS lecturers_3_or_more_courses;
DROP VIEW IF EXISTS top_10_most_enrolled_courses;
DROP VIEW IF EXISTS top_10_students_highest_averages;

CREATE VIEW courses_50_or_more_students AS
SELECT c.course_id, c.course_code, c.course_name, COUNT(e.student_id) AS student_count
FROM courses c
JOIN enrollments e ON c.course_id = e.course_id
GROUP BY c.course_id, c.course_code, c.course_name
HAVING COUNT(e.student_id) >= 50;

CREATE VIEW students_5_or_more_courses AS
SELECT u.user_id, u.username, COUNT(e.course_id) AS course_count
FROM users u
JOIN enrollments e ON u.user_id = e.student_id
WHERE u.role = 'student'
GROUP BY u.user_id, u.username
HAVING COUNT(e.course_id) >= 5;

CREATE VIEW lecturers_3_or_more_courses AS
SELECT u.user_id, u.username, COUNT(c.course_id) AS course_count
FROM users u
JOIN courses c ON u.user_id = c.lecturer_id
WHERE u.role = 'lecturer'
GROUP BY u.user_id, u.username
HAVING COUNT(c.course_id) >= 3;

CREATE VIEW top_10_most_enrolled_courses AS
SELECT c.course_id, c.course_code, c.course_name, COUNT(e.student_id) AS total_students
FROM courses c
JOIN enrollments e ON c.course_id = e.course_id
GROUP BY c.course_id, c.course_code, c.course_name
ORDER BY total_students DESC
LIMIT 10;

CREATE VIEW top_10_students_highest_averages AS
SELECT u.user_id, u.username, AVG(g.marks_awarded) AS overall_average
FROM users u
JOIN submissions s ON u.user_id = s.student_id
JOIN grades g ON s.submission_id = g.submission_id
WHERE u.role = 'student'
GROUP BY u.user_id, u.username
ORDER BY overall_average DESC
LIMIT 10;