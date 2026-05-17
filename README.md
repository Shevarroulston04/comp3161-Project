# COMP3161 Course Management System API

Backend API for the COMP3161 final project. This project uses Node.js, Express, MySQL/MariaDB, and raw SQL queries only.

## Main fixes added

- Added `email`, `username`, `role`, and hashed password support to `Users`.
- Kept subtype tables: `Students`, `Lecturers`, and `Admins`.
- Added `courseCode` and `courseDescription` to `Course`.
- Added `ThreadReply` for Reddit-style nested replies.
- Improved `Submit` to store submission text, file/link URL, grade, feedback, grader, and graded date.
- Added required report views in `sql/views.sql`.
- Added indexes for important query paths.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

3. Update your DB password inside `.env`.

4. Run the SQL files in MySQL/MariaDB:

```bash
mysql -u root -p < sql/schema_fixed.sql
mysql -u root -p < sql/views.sql
```

5. Start the API:

```bash
npm run dev
```

## Main API routes

### Auth

- `POST /api/register`
- `POST /api/login`

### Courses and enrollment

- `POST /api/courses` admin only
- `GET /api/courses`
- `GET /api/courses/student/:studentID`
- `GET /api/courses/lecturer/:lecturerID`
- `POST /api/courses/:courseID/enroll` student only
- `GET /api/courses/:courseID/members`

### Calendar events

- `POST /api/courses/:courseID/events`
- `GET /api/courses/:courseID/events`
- `GET /api/students/:studentID/events?date=YYYY-MM-DD`

### Forums and threads

- `POST /api/courses/:courseID/forums`
- `GET /api/courses/:courseID/forums`
- `POST /api/forums/:forumNumber/threads`
- `GET /api/forums/:forumNumber/threads`
- `POST /api/threads/:threadNumber/replies`
- `GET /api/threads/:threadNumber/replies`

### Course content

- `POST /api/courses/:courseID/sections`
- `POST /api/sections/:secNumber/content`
- `GET /api/courses/:courseID/content`

### Assignments

- `POST /api/courses/:courseID/assignments`
- `GET /api/courses/:courseID/assignments`
- `POST /api/assignments/:assignmentNumber/submissions`
- `POST /api/submissions/:studentID/:assignmentNumber/grade`

### Reports

- `GET /api/reports/courses-50-plus`
- `GET /api/reports/students-5-plus`
- `GET /api/reports/lecturers-3-plus`
- `GET /api/reports/top-courses`
- `GET /api/reports/top-students`

## GitHub steps

```bash
git init
git add .
git commit -m "Initial backend API with fixed database schema"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```
