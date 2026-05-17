/* ═══════════════════════════════════════════════════════
   EduVLE — API Client
   All communication with the backend REST API lives here.
═══════════════════════════════════════════════════════ */

const API_BASE = '/api';

// ── Token helpers ──────────────────────────────────────
const Auth = {
  getToken: () => localStorage.getItem('eduvle_token'),
  setToken: (t) => localStorage.setItem('eduvle_token', t),
  getUser:  () => JSON.parse(localStorage.getItem('eduvle_user') || 'null'),
  setUser:  (u) => localStorage.setItem('eduvle_user', JSON.stringify(u)),
  clear:    () => { localStorage.removeItem('eduvle_token'); localStorage.removeItem('eduvle_user'); },
  isLoggedIn: () => !!localStorage.getItem('eduvle_token'),
};

// ── Core fetch wrapper ─────────────────────────────────
async function request(method, path, body = null, auth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = Auth.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

const get    = (path, auth = true)        => request('GET',    path, null, auth);
const post   = (path, body, auth = true)  => request('POST',   path, body, auth);
const put    = (path, body, auth = true)  => request('PUT',    path, body, auth);
const patch  = (path, body, auth = true)  => request('PATCH',  path, body, auth);
const del    = (path, auth = true)        => request('DELETE', path, null, auth);

// ═══════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════
const api = {

  auth: {
    login:    (username, password) => post('/login', { username, password }, false),
    register: (data)               => post('/register', data, false),
    me:       ()                   => get('/me'),
  },

  // ═══════════════════════════════════════════════════════
  // COURSES
  // ═══════════════════════════════════════════════════════
  courses: {
    getAll:        ()          => get('/courses', false),
    getForStudent: (id)        => get(`/courses/student/${id}`),
    getForLecturer:(id)        => get(`/courses/lecturer/${id}`),
    create:        (data)      => post('/courses', data),
    getMembers:    (courseID)  => get(`/courses/${courseID}/members`),
    enroll:        (courseID)  => post(`/courses/${courseID}/enroll`, {}),
  },

  // ═══════════════════════════════════════════════════════
  // CALENDAR
  // ═══════════════════════════════════════════════════════
  calendar: {
    getCourseEvents:  (courseID)       => get(`/courses/${courseID}/events`),
    getStudentEvents: (studentID, date) =>
      get(`/students/${studentID}/events${date ? `?date=${date}` : ''}`),
    create: (courseID, data)           => post(`/courses/${courseID}/events`, data),
  },

  // ═══════════════════════════════════════════════════════
  // FORUMS & THREADS
  // ═══════════════════════════════════════════════════════
  forums: {
    getCourse: (courseID)         => get(`/courses/${courseID}/forums`),
    create:    (courseID, header) => post(`/courses/${courseID}/forums`, { header }),
  },

  threads: {
    getForForum: (forumNumber)      => get(`/forums/${forumNumber}/threads`),
    get:         (threadNumber)     => get(`/threads/${threadNumber}`),
    create:      (forumNumber, data) => post(`/forums/${forumNumber}/threads`, data),
    reply:       (threadNumber, data) => post(`/threads/${threadNumber}/replies`, data),
  },

  // ═══════════════════════════════════════════════════════
  // CONTENT
  // ═══════════════════════════════════════════════════════
  content: {
    getCourse:      (courseID)        => get(`/courses/${courseID}/content`),
    createSection:  (courseID, data)  => post(`/courses/${courseID}/sections`, data),
    addContent:     (secNumber, data) => post(`/sections/${secNumber}/content`, data),
  },

  // ═══════════════════════════════════════════════════════
  // ASSIGNMENTS
  // ═══════════════════════════════════════════════════════
  assignments: {
    getCourse:     (courseID)           => get(`/courses/${courseID}/assignments`),
    create:        (courseID, data)     => post(`/courses/${courseID}/assignments`, data),
    getSubmissions:(assignmentNumber)   => get(`/assignments/${assignmentNumber}/submissions`),
    submit:        (assignmentNumber, data) =>
      post(`/assignments/${assignmentNumber}/submissions`, data),
    grade:         (studentID, assignmentNumber, data) =>
      post(`/submissions/${studentID}/${assignmentNumber}/grade`, data),
  },

  // ═══════════════════════════════════════════════════════
  // GRADES
  // ═══════════════════════════════════════════════════════
  grades: {
    getForStudent: (studentID) => get(`/students/${studentID}/grades`),
  },

  // ═══════════════════════════════════════════════════════
  // REPORTS
  // ═══════════════════════════════════════════════════════
  reports: {
    get: (name) => get(`/reports/${name}`),
  },
};

window.api  = api;
window.Auth = Auth;
