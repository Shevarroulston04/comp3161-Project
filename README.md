# EduVLE — Virtual Learning Environment
### COMP3161 Database Management Systems — Final Project

A full-stack course management system built with **Node.js + Express** (REST API), **MySQL**, and a **vanilla JS/HTML/CSS** single-page frontend. No frameworks, no ORM — raw SQL throughout.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MySQL / MariaDB |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Frontend | Vanilla JS, HTML5, CSS3 (SPA, hash router) |
| Dev server | nodemon |

---

## Project Structure

```
comp3161-project/
├── app.js                    # Entry point — mounts routes, serves frontend
├── db.js                     # MySQL connection pool (mysql2)
├── .env                      # DB credentials + JWT secret (not committed)
├── middleware/
│   └── authMiddleware.js     # JWT verify + role guard
├── routes/
│   ├── authRoutes.js         # /api/register, /api/login, /api/me
│   ├── courseRoutes.js       # Courses + enroll + members
│   ├── contentRoutes.js      # Sections + content items
│   ├── forumRoutes.js        # Forums, threads, nested replies
│   ├── assignmentRoutes.js   # Assignments + submissions + grading + grades
│   ├── calendarRoutes.js     # Calendar events
│   └── reportRoutes.js       # 5 admin report views
├── sql/
│   ├── schema.sql            # Full schema (fresh install)
│   └── migrate.sql           # Non-destructive migration for existing DB
├── frontend/
│   ├── index.html            # SPA shell
│   ├── css/style.css         # Full design system
│   └── js/
│       ├── api.js            # API client wrapper
│       └── app.js            # Hash router + all 10 page renderers
└── EduVLE.postman_collection.json   # Postman collection (all routes)
```

---

## Database Setup

### Option A — Fresh installation

```sql
-- In MySQL Workbench or mysql CLI:
source sql/schema.sql;
```

Then populate with the Python seeder:

```bash
python eduDB_pop.py
```

### Option B — Already have a populated database

Run the migration script to add AUTO_INCREMENT, nullable columns, and submission fields — **no data is lost**:

```sql
source sql/migrate.sql;
```

> **PowerShell users:** use `Get-Content sql\migrate.sql | mysql -u root -p edu_db`  
> **CMD users:** `mysql -u root -p edu_db < sql\migrate.sql`

---

## Environment Setup

1. **Install dependencies:**

```bash
npm install
```

2. **Create `.env`:**

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=edu_db
JWT_SECRET=any_long_random_string
PORT=3000
```

3. **Start the server:**

```bash
npm run dev        # development (nodemon, auto-restart)
npm start          # production
```

The app runs at `http://localhost:3000`.  
The frontend SPA is served at `http://localhost:3000/` (opens automatically).

---

## Logging In

### Seeder-populated accounts (SHA-256 passwords)

The Python seeder creates users with SHA-256 hashed passwords. Any username from the seeded data works — check your `Users` table in MySQL Workbench for real usernames, or use:

```sql
SELECT username, role FROM Users LIMIT 20;
```

Default seeder password for most accounts: `password123`

### New accounts (via Register form or API)

Use the Register form in the frontend or `POST /api/register`. Passwords are bcrypt-hashed. The system supports both hash formats simultaneously.

---

## API Reference

All endpoints are prefixed with `/api`. Protected routes require:  
`Authorization: Bearer <token>`

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/register` | — | Register new user (student / lecturer / admin) |
| POST | `/api/login` | — | Login, returns JWT token + user object |
| GET | `/api/me` | ✓ | Get current user profile |

**Register body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe",
  "password": "secret123",
  "role": "student"
}
```

**Login body:**
```json
{ "username": "johndoe", "password": "secret123" }
```

---

### Courses

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/courses` | admin | Create a course (max 5 per lecturer) |
| GET | `/api/courses` | — | List all courses |
| GET | `/api/courses/student/:studentID` | — | Courses a student is enrolled in |
| GET | `/api/courses/lecturer/:lecturerID` | — | Courses taught by a lecturer |
| POST | `/api/courses/:courseID/enroll` | student | Enroll in a course (max 6 per student) |
| GET | `/api/courses/:courseID/members` | — | Course lecturer + enrolled students |

---

### Course Content

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/courses/:courseID/sections` | lecturer / admin | Create a section |
| POST | `/api/sections/:secNumber/content` | lecturer | Add content to a section |
| GET | `/api/courses/:courseID/content` | — | All sections + content for a course |

**Content body:**
```json
{
  "contentName": "Week 1 Slides",
  "fileType": "slides",
  "contentURL": "https://example.com/slides.pdf"
}
```
`fileType` must be: `link`, `file`, or `slides`

---

### Forums & Threads

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/courses/:courseID/forums` | ✓ | Create a forum for a course |
| GET | `/api/courses/:courseID/forums` | — | List forums for a course (with thread counts) |
| POST | `/api/forums/:forumNumber/threads` | ✓ | Post a top-level thread |
| GET | `/api/forums/:forumNumber/threads` | — | List top-level threads in a forum |
| GET | `/api/threads/:threadNumber` | — | Get thread + all nested replies |
| POST | `/api/threads/:threadNumber/replies` | ✓ | Reply to a thread or existing reply |

Replies are stored in the same `Thread` table using a self-referencing `parentThreadID`. Nested reply trees are fetched using a **recursive CTE** (`WITH RECURSIVE`).

---

### Assignments & Grades

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/courses/:courseID/assignments` | lecturer | Create an assignment |
| GET | `/api/courses/:courseID/assignments` | — | List assignments for a course |
| POST | `/api/assignments/:assignmentNumber/submissions` | student | Submit (or resubmit) work |
| GET | `/api/assignments/:assignmentNumber/submissions` | lecturer / admin | View all submissions for an assignment |
| POST | `/api/submissions/:studentID/:assignmentNumber/grade` | lecturer | Grade a submission |
| GET | `/api/students/:studentID/grades` | ✓ | Get all graded submissions + overall average |

**Submit body:**
```json
{
  "submissionText": "My answer here...",
  "submissionURL": "https://github.com/myrepo"
}
```

**Grade body:**
```json
{ "grade": 85.5, "feedback": "Good work, clean code." }
```

---

### Calendar Events

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/courses/:courseID/events` | lecturer / admin | Create a calendar event |
| GET | `/api/courses/:courseID/events` | — | List all events for a course |
| GET | `/api/students/:studentID/events` | — | Events across all enrolled courses (optional `?date=YYYY-MM-DD`) |

---

### Reports (Admin Views)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/reports/courses-50-plus` | admin | Courses with 50+ enrolled students |
| GET | `/api/reports/students-5-plus` | admin | Students enrolled in 5+ courses |
| GET | `/api/reports/lecturers-3-plus` | admin | Lecturers teaching 3+ courses |
| GET | `/api/reports/top-courses` | admin | Top 10 most enrolled courses |
| GET | `/api/reports/top-students` | admin | Top 10 students by overall grade average |

Each report reads directly from a SQL view defined in `schema.sql`.

---

## Frontend

Open `http://localhost:3000` in a browser. The SPA auto-detects login state and routes via URL hash.

### Pages

| Route | Description |
|-------|-------------|
| `#/dashboard` | Role-aware dashboard with stats cards and recent activity |
| `#/courses` | Browse all courses, enroll (students), view content |
| `#/my-courses` | Student's enrolled courses only |
| `#/course/:id` | Course detail — 5 tabs: Overview, Content, Assignments, Forum, Calendar |
| `#/forum/:id` | Forum thread list |
| `#/thread/:id` | Full thread view with nested Reddit-style reply tree |
| `#/calendar` | Student calendar view with event list |
| `#/grades` | Student grade tracker with overall average |
| `#/reports` | Admin reports dashboard (all 5 views) |
| `#/manage-courses` | Admin course + lecturer management |

### Features

- **Role-aware UI** — different nav items and actions shown based on student / lecturer / admin role
- **Reddit-style nested replies** — replies can be nested to any depth, client builds the tree
- **Assignment flow** — students submit text or URL; lecturers see all submissions and assign grades with feedback
- **Calendar** — per-student aggregated view of all events across enrolled courses
- **Toast notifications** — success/error feedback on every action
- **Modal forms** — create forums, threads, events, assignments all in-page without navigation
- **Responsive layout** — collapsible sidebar, mobile-friendly topbar
- **Persistent auth** — JWT stored in localStorage, session survives page refresh

---

## Database Schema Overview

The schema matches the group ERD exactly. Key design decisions:

- **Subtype tables** (`Students`, `Lecturers`, `Admins`) act as FK constraints to `Users.idNumber` — role is enforced at both the application and DB layer
- **Thread self-reference** — `Thread.parentThreadID` references `Thread.threadNumber` (nullable) enabling unlimited nesting without a separate reply table
- **Nullable grade** — `Submit.grade` is NULL until a lecturer grades, allowing submission before grading
- **Dual password support** — API users use bcrypt; seeder-populated users use SHA-256 hex; both work at login

### Required SQL Views

| View Name | Purpose |
|-----------|---------|
| `CoursesWithFiftyPlusStudents` | Courses with ≥ 50 enrolled students |
| `StudentsFivePlusCourses` | Students enrolled in ≥ 5 courses |
| `LecturersThreePlusCourses` | Lecturers teaching ≥ 3 courses |
| `TopTenEnrolledCourses` | Top 10 courses by enrollment |
| `TopTenStudentAverages` | Top 10 students by graded average |

---

## Testing with Postman

Import `EduVLE.postman_collection.json` into Postman.

- The **Login** request automatically saves the returned token to a collection variable `token`
- All other protected requests use `{{token}}` in the Authorization header automatically
- Requests are organized by feature group

---

## Business Rules Enforced

| Rule | Enforced in |
|------|-------------|
| Lecturer may teach at most 5 courses | `POST /api/courses` |
| Student may enroll in at most 6 courses | `POST /api/courses/:id/enroll` |
| Student may resubmit an assignment | `ON DUPLICATE KEY UPDATE` in Submit |
| Content `fileType` must be `link`, `file`, or `slides` | Route validation |
| Only admins can create courses | `requireRole('admin')` |
| Only lecturers can add content and grade | `requireRole('lecturer')` |
