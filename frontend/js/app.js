/* ═══════════════════════════════════════════════════════
   EduVLE — Main Application
   SPA with hash-based routing.
   Pages: dashboard, courses, my-courses, course/:id,
          forum/:id, thread/:id, calendar, grades,
          reports, manage-courses
═══════════════════════════════════════════════════════ */

'use strict';

// ──────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const esc = (str) => String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function toast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-msg">${esc(msg)}</span>`;
  $('#toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function showModal(title, bodyHTML, footerHTML = '') {
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML  = bodyHTML;
  $('#modal-footer').innerHTML = footerHTML;
  $('#modal-overlay').classList.remove('hidden');
}
function closeModal() { $('#modal-overlay').classList.add('hidden'); }

function setLoading(target = '#page-content') {
  $(target).innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
}
function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric',
                                         hour:'2-digit', minute:'2-digit' });
}
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

function avatarInitials(first, last) {
  return `${(first||'?')[0]}${(last||'')[0] || ''}`.toUpperCase();
}

function roleColor(role) {
  if (role === 'admin')    return 'badge-admin';
  if (role === 'lecturer') return 'badge-lecturer';
  return 'badge-student';
}

// ──────────────────────────────────────────────────────
// ROUTER
// ──────────────────────────────────────────────────────
const routes = {};
function route(path, handler) { routes[path] = handler; }

function navigate(hash) {
  window.location.hash = hash;
}

async function handleRoute() {
  const raw   = window.location.hash.slice(1) || '/dashboard';
  const parts = raw.split('/').filter(Boolean);
  const page  = parts[0] || 'dashboard';

  // Update active nav
  $$('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page ||
      (page === 'course' && el.dataset.page === 'courses'));
  });

  // Update page title
  const titles = {
    'dashboard':'Dashboard', 'courses':'All Courses', 'my-courses':'My Courses',
    'course':'Course Detail', 'forum':'Forum', 'thread':'Discussion Thread',
    'calendar':'My Calendar', 'grades':'My Grades', 'reports':'Reports',
    'manage-courses':'Manage Courses',
  };
  $('#page-title').textContent = titles[page] || 'EduVLE';

  setLoading();

  try {
    if (routes[page]) {
      await routes[page](parts);
    } else {
      $('#page-content').innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔍</div><h3>Page Not Found</h3><p>The page you're looking for doesn't exist.</p></div>`;
    }
  } catch (err) {
    $('#page-content').innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Something went wrong</h3><p>${esc(err.message)}</p></div>`;
  }
}

// ──────────────────────────────────────────────────────
// AUTH SCREEN
// ──────────────────────────────────────────────────────
function showAuth() {
  $('#auth-screen').classList.remove('hidden');
  $('#app-shell').classList.add('hidden');
}
function showApp() {
  $('#auth-screen').classList.add('hidden');
  $('#app-shell').classList.remove('hidden');
  updateSidebarUser();
  applyRoleVisibility();
  handleRoute();
}

function updateSidebarUser() {
  const u = Auth.getUser();
  if (!u) return;
  const initials = avatarInitials(u.firstName, u.lastName);
  $('#sidebar-avatar').textContent  = initials;
  $('#topbar-avatar').textContent   = initials;
  $('#sidebar-name').textContent    = `${u.firstName} ${u.lastName}`;
  $('#topbar-name').textContent     = `${u.firstName} ${u.lastName}`;
  $('#sidebar-role').className      = `user-role badge ${roleColor(u.role)}`;
  $('#sidebar-role').textContent    = u.role;
}

function applyRoleVisibility() {
  const u = Auth.getUser();
  if (!u) return;
  const isStudent  = u.role === 'student';
  const isAdmin    = u.role === 'admin';
  const isLecturer = u.role === 'lecturer';

  $('#nav-student-section').style.display = isStudent ? '' : 'none';
  $('#nav-admin-section').style.display   = (isAdmin || isLecturer) ? '' : 'none';
}

// ──────────────────────────────────────────────────────
// AUTH EVENT HANDLERS
// ──────────────────────────────────────────────────────
function initAuth() {
  // Tab switching
  $$('.auth-tab').forEach(btn => {
    btn.addEventListener('click', () => switchAuthTab(btn.dataset.tab));
  });
  $$('[data-switch]').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); switchAuthTab(a.dataset.switch); });
  });

  // Login
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#login-btn');
    const username = $('#login-username').value.trim();
    const password = $('#login-password').value;
    setAuthBtn(btn, true);
    $('#login-error').classList.add('hidden');
    try {
      const data = await api.auth.login(username, password);
      Auth.setToken(data.token);
      Auth.setUser(data.user);
      showApp();
    } catch (err) {
      showAuthError('login-error', err.message);
    } finally {
      setAuthBtn(btn, false);
    }
  });

  // Register
  $('#register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#register-btn');
    const payload = {
      firstName: $('#reg-firstname').value.trim(),
      lastName:  $('#reg-lastname').value.trim(),
      username:  $('#reg-username').value.trim(),
      password:  $('#reg-password').value,
      role:      $('#reg-role').value,
    };
    setAuthBtn(btn, true);
    $('#register-error').classList.add('hidden');
    try {
      await api.auth.register(payload);
      toast('Account created! Please sign in.', 'success');
      switchAuthTab('login');
      $('#login-username').value = payload.username;
    } catch (err) {
      showAuthError('register-error', err.message);
    } finally {
      setAuthBtn(btn, false);
    }
  });
}

function switchAuthTab(tab) {
  $$('.auth-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $('#login-form').classList.toggle('hidden', tab !== 'login');
  $('#register-form').classList.toggle('hidden', tab !== 'register');
}
function showAuthError(id, msg) {
  const el = $(`#${id}`);
  el.textContent = msg;
  el.classList.remove('hidden');
}
function setAuthBtn(btn, loading) {
  btn.disabled = loading;
  $('.btn-text', btn).classList.toggle('hidden', loading);
  $('.btn-spinner', btn).classList.toggle('hidden', !loading);
}

// ──────────────────────────────────────────────────────
// SIDEBAR / NAV
// ──────────────────────────────────────────────────────
function initNav() {
  // Desktop collapse
  $('#sidebar-toggle').addEventListener('click', () => {
    $('#sidebar').classList.toggle('collapsed');
  });
  // Mobile menu
  $('#mobile-menu-btn').addEventListener('click', () => {
    $('#sidebar').classList.toggle('open');
  });
  // Overlay click closes mobile
  document.addEventListener('click', (e) => {
    const sidebar = $('#sidebar');
    if (window.innerWidth <= 768 && sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) && e.target !== $('#mobile-menu-btn')) {
      sidebar.classList.remove('open');
    }
  });
  // Logout
  $('#logout-btn').addEventListener('click', () => {
    Auth.clear();
    showAuth();
    toast('You have been signed out.', 'info');
  });
  // Modal close
  $('#modal-close').addEventListener('click', closeModal);
  $('#modal-overlay').addEventListener('click', (e) => {
    if (e.target === $('#modal-overlay')) closeModal();
  });
}

// ──────────────────────────────────────────────────────
// ── PAGE: DASHBOARD ──────────────────────────────────
// ──────────────────────────────────────────────────────
route('dashboard', async () => {
  const user = Auth.getUser();
  const role = user.role;

  if (role === 'student')  await renderStudentDashboard(user);
  else if (role === 'lecturer') await renderLecturerDashboard(user);
  else await renderAdminDashboard(user);
});

async function renderStudentDashboard(user) {
  const [coursesData, gradesData] = await Promise.all([
    api.courses.getForStudent(user.idNumber).catch(() => []),
    api.grades.getForStudent(user.idNumber).catch(() => ({ grades: [], overallAverage: null })),
  ]);
  const courses = Array.isArray(coursesData) ? coursesData : [];
  const grades  = gradesData.grades || [];
  const avg     = gradesData.overallAverage;

  const recent = courses.slice(0, 6);

  $('#page-content').innerHTML = `
    <div class="welcome-banner">
      <h2>Welcome back, ${esc(user.firstName)}! 👋</h2>
      <p>You have ${courses.length} active course${courses.length !== 1 ? 's' : ''}. Keep up the great work!</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card" style="--stat-color:#4F46E5;--stat-bg:#EEF2FF">
        <div class="stat-icon">📚</div>
        <div class="stat-body">
          <div class="stat-value">${courses.length}</div>
          <div class="stat-label">Enrolled Courses</div>
        </div>
      </div>
      <div class="stat-card" style="--stat-color:#10B981;--stat-bg:#D1FAE5">
        <div class="stat-icon">✅</div>
        <div class="stat-body">
          <div class="stat-value">${grades.length}</div>
          <div class="stat-label">Graded Assignments</div>
        </div>
      </div>
      <div class="stat-card" style="--stat-color:#F59E0B;--stat-bg:#FEF3C7">
        <div class="stat-icon">📊</div>
        <div class="stat-body">
          <div class="stat-value">${avg !== null ? avg.toFixed(1) + '%' : '—'}</div>
          <div class="stat-label">Overall Average</div>
        </div>
      </div>
    </div>

    <div class="page-header">
      <div><h2>My Courses</h2></div>
      <a href="#/my-courses" class="btn btn-secondary btn-sm">View all →</a>
    </div>
    <div class="courses-grid">
      ${recent.length ? recent.map(c => courseCard(c, user)).join('') :
        `<div class="empty-state"><div class="empty-state-icon">📚</div><h3>No courses yet</h3><p>Browse available courses to enroll.</p><a href="#/courses" class="btn btn-primary">Browse Courses</a></div>`}
    </div>

    ${grades.length ? `
    <div class="section-divider"></div>
    <div class="page-header"><h2>Recent Grades</h2></div>
    <div class="card" style="padding:0">
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Assignment</th><th>Course</th><th>Grade</th><th>Graded</th></tr></thead>
          <tbody>
            ${grades.slice(0,5).map(g => `
              <tr>
                <td><strong>${esc(g.assignmentName)}</strong></td>
                <td>${esc(g.courseName)}</td>
                <td>${gradeChip(g.grade, g.maxMarks)}</td>
                <td class="text-muted">${formatDate(g.gradedDate)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}
  `;
  attachCourseCardListeners();
}

async function renderLecturerDashboard(user) {
  const courses = await api.courses.getForLecturer(user.idNumber).catch(() => []);
  $('#page-content').innerHTML = `
    <div class="welcome-banner">
      <h2>Welcome, ${esc(user.firstName)}! 🎓</h2>
      <p>You are teaching ${courses.length} course${courses.length !== 1 ? 's' : ''}.</p>
    </div>
    <div class="stats-grid">
      <div class="stat-card" style="--stat-color:#7C3AED;--stat-bg:#EDE9FE">
        <div class="stat-icon">📖</div>
        <div class="stat-body">
          <div class="stat-value">${courses.length}</div>
          <div class="stat-label">Courses Teaching</div>
        </div>
      </div>
    </div>
    <div class="page-header"><h2>My Courses</h2></div>
    <div class="courses-grid">
      ${courses.map(c => courseCard(c, user)).join('') ||
        '<div class="empty-state"><div class="empty-state-icon">📖</div><h3>No courses assigned yet</h3></div>'}
    </div>
  `;
  attachCourseCardListeners();
}

async function renderAdminDashboard(user) {
  const courses = await api.courses.getAll().catch(() => []);
  $('#page-content').innerHTML = `
    <div class="welcome-banner">
      <h2>Admin Dashboard 🛡️</h2>
      <p>Managing ${courses.length} courses across the institution.</p>
    </div>
    <div class="stats-grid">
      <div class="stat-card" style="--stat-color:#4F46E5;--stat-bg:#EEF2FF">
        <div class="stat-icon">📚</div>
        <div class="stat-body"><div class="stat-value">${courses.length}</div><div class="stat-label">Total Courses</div></div>
      </div>
    </div>
    <div class="page-header">
      <div><h2>All Courses</h2></div>
      <a href="#/manage-courses" class="btn btn-primary btn-sm">+ New Course</a>
    </div>
    <div class="courses-grid">
      ${courses.slice(0, 9).map(c => courseCard(c, user)).join('')}
    </div>
    <div class="mt-4" style="text-align:center">
      <a href="#/courses" class="btn btn-secondary">View all courses →</a>
    </div>
  `;
  attachCourseCardListeners();
}

// ──────────────────────────────────────────────────────
// ── PAGE: ALL COURSES ────────────────────────────────
// ──────────────────────────────────────────────────────
route('courses', async () => {
  const user    = Auth.getUser();
  const courses = await api.courses.getAll();

  $('#page-content').innerHTML = `
    <div class="page-header">
      <div><h2>All Courses</h2><p>Browse the full course catalogue</p></div>
      <div class="search-bar" style="width:260px">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="course-search" placeholder="Search courses…" />
      </div>
    </div>
    <div class="courses-grid" id="courses-grid">
      ${courses.map(c => courseCard(c, user)).join('') ||
        '<div class="empty-state"><div class="empty-state-icon">📚</div><h3>No courses found</h3></div>'}
    </div>
  `;
  attachCourseCardListeners();

  // Live search
  $('#course-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    $$('.course-card').forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(q) ? '' : 'none';
    });
  });
});

// ──────────────────────────────────────────────────────
// ── PAGE: MY COURSES (student) ───────────────────────
// ──────────────────────────────────────────────────────
route('my-courses', async () => {
  const user    = Auth.getUser();
  const courses = await api.courses.getForStudent(user.idNumber);
  $('#page-content').innerHTML = `
    <div class="page-header">
      <div><h2>My Courses</h2><p>Courses you are enrolled in</p></div>
      <a href="#/courses" class="btn btn-secondary btn-sm">Browse more</a>
    </div>
    <div class="courses-grid">
      ${courses.map(c => courseCard(c, user)).join('') ||
        `<div class="empty-state"><div class="empty-state-icon">📚</div><h3>No courses yet</h3>
         <p>You haven't enrolled in any courses.</p>
         <a href="#/courses" class="btn btn-primary">Browse Courses</a></div>`}
    </div>
  `;
  attachCourseCardListeners();
});

// ──────────────────────────────────────────────────────
// ── PAGE: COURSE DETAIL ──────────────────────────────
// ──────────────────────────────────────────────────────
route('course', async ([, courseID]) => {
  if (!courseID) { navigate('/courses'); return; }
  const user = Auth.getUser();

  const [members, content, assignments, forums, events, allCourses] = await Promise.all([
    api.courses.getMembers(courseID).catch(() => ({ lecturer: null, students: [] })),
    api.content.getCourse(courseID).catch(() => []),
    api.assignments.getCourse(courseID).catch(() => []),
    api.forums.getCourse(courseID).catch(() => []),
    api.calendar.getCourseEvents(courseID).catch(() => []),
    api.courses.getAll().catch(() => []),
  ]);

  const course = allCourses.find(c => String(c.courseID) === String(courseID));
  const isEnrolled = members.students.some(s => String(s.idNumber) === String(user.idNumber));
  const isLecturer = members.lecturer && String(members.lecturer.idNumber) === String(user.idNumber);
  const canManage  = isLecturer || user.role === 'admin';

  $('#page-content').innerHTML = `
    <div class="course-header">
      <div class="course-header-code">Course #${courseID}</div>
      <div class="course-header-name">${esc(course?.courseName || 'Course Detail')}</div>
      <div class="course-header-meta">
        ${members.lecturer ? `<span>👨‍🏫 ${esc(members.lecturer.firstName)} ${esc(members.lecturer.lastName)}</span>` : ''}
        <span>👥 ${members.students.length} students</span>
        <span>📁 ${assignments.length} assignments</span>
        <span>💬 ${forums.length} forums</span>
      </div>
    </div>

    ${user.role === 'student' && !isEnrolled ? `
      <div class="card" style="margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;gap:16px">
        <div><strong>You are not enrolled in this course.</strong><br><span class="text-muted">Enroll to access assignments, forums, and more.</span></div>
        <button class="btn btn-primary" id="enroll-btn">Enroll Now</button>
      </div>` : ''}

    <div class="tabs" id="course-tabs">
      <button class="tab-btn active" data-tab="content">📁 Content</button>
      <button class="tab-btn" data-tab="assignments">📝 Assignments</button>
      <button class="tab-btn" data-tab="forums">💬 Forums</button>
      <button class="tab-btn" data-tab="calendar">📅 Calendar</button>
      <button class="tab-btn" data-tab="members">👥 Members</button>
    </div>

    <div id="tab-content"  class="tab-panel active">${renderContentTab(content, canManage)}</div>
    <div id="tab-assignments" class="tab-panel">${renderAssignmentsTab(assignments, user, courseID, canManage, isEnrolled)}</div>
    <div id="tab-forums"   class="tab-panel">${renderForumsTab(forums, courseID, user)}</div>
    <div id="tab-calendar" class="tab-panel">${renderCalendarTab(events, courseID, canManage)}</div>
    <div id="tab-members"  class="tab-panel">${renderMembersTab(members)}</div>
  `;

  // Tab switching
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      $$('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      $(`#tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  // Enroll button
  const enrollBtn = $('#enroll-btn');
  if (enrollBtn) {
    enrollBtn.addEventListener('click', async () => {
      enrollBtn.disabled = true;
      try {
        await api.courses.enroll(courseID);
        toast('Enrolled successfully!', 'success');
        navigate(`/course/${courseID}`);
      } catch (err) { toast(err.message, 'error'); enrollBtn.disabled = false; }
    });
  }

  // Forum card clicks
  document.addEventListener('click', forumClickHandler);

  // Add content modal (lecturer)
  if (canManage) attachContentListeners(courseID, content);
  if (canManage) attachEventListeners(courseID);
  if (canManage) attachAssignmentListeners(courseID);
});

// ── Content tab ──
function renderContentTab(content, canManage) {
  // Group by section
  const sections = {};
  content.forEach(row => {
    if (!sections[row.secNumber]) {
      sections[row.secNumber] = { name: row.sectionName, order: row.sectionOrder, items: [] };
    }
    if (row.contentNumber) sections[row.secNumber].items.push(row);
  });

  const sectionList = Object.entries(sections)
    .sort((a, b) => a[1].order - b[1].order);

  const typeIcon = { link: '🔗', file: '📄', slides: '📊' };
  const typeCls  = { link: 'content-type-link', file: 'content-type-file', slides: 'content-type-slides' };

  return `
    ${canManage ? `<div class="page-header"><div></div>
      <button class="btn btn-primary btn-sm" id="add-section-btn">+ Add Section</button>
    </div>` : ''}
    ${sectionList.length ? `
    <div class="sections-list">
      ${sectionList.map(([secNum, sec]) => `
        <div class="section-block">
          <div class="section-header" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'':'none';this.querySelector('.section-toggle').classList.toggle('open')">
            <span class="section-title">📂 ${esc(sec.name)}</span>
            <div style="display:flex;gap:10px;align-items:center">
              ${canManage ? `<button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();openAddContentModal(${secNum})">+ Content</button>` : ''}
              <svg class="section-toggle open" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
          <div class="section-content">
            ${sec.items.length ? sec.items.map(item => `
              <div class="content-item">
                <div class="content-type-icon ${typeCls[item.fileType]}">${typeIcon[item.fileType]}</div>
                <div>
                  <div class="content-item-name">${esc(item.contentName)}</div>
                  <div class="content-item-type">${esc(item.fileType)}</div>
                </div>
                <a href="${esc(item.contentURL)}" target="_blank" class="btn btn-ghost btn-sm" style="margin-left:auto">Open →</a>
              </div>`).join('') :
              '<div class="content-item text-muted" style="font-size:13px">No content in this section yet.</div>'}
          </div>
        </div>`).join('')}
    </div>` :
    `<div class="empty-state"><div class="empty-state-icon">📂</div><h3>No content yet</h3><p>The lecturer hasn't uploaded any content yet.</p></div>`}
  `;
}

// ── Assignments tab ──
function renderAssignmentsTab(assignments, user, courseID, canManage, isEnrolled) {
  return `
    ${canManage ? `<div class="page-header"><div></div>
      <button class="btn btn-primary btn-sm" id="add-assignment-btn">+ Add Assignment</button>
    </div>` : ''}
    ${assignments.length ? `
    <div style="display:flex;flex-direction:column;gap:12px">
      ${assignments.map(a => {
        const due = a.dueDate ? new Date(a.dueDate) : null;
        const overdue = due && due < new Date();
        return `
        <div class="assignment-card">
          <div>
            <div class="assignment-name">${esc(a.assignmentName)}</div>
            <div class="assignment-meta">
              <span>Max Marks: <strong>${a.maxMarks}</strong></span>
              ${due ? `<span class="assignment-due ${overdue ? 'overdue' : ''}">
                ${overdue ? '⚠️ Overdue' : '📅'} Due: ${formatDate(a.dueDate)}
              </span>` : ''}
            </div>
            ${a.assignmentDescription ? `<p style="margin-top:8px;font-size:13px;color:var(--text-2)">${esc(a.assignmentDescription)}</p>` : ''}
            ${canManage ? `<button class="btn btn-secondary btn-sm mt-3" onclick="viewSubmissions(${a.assignmentNumber})">View Submissions</button>` : ''}
          </div>
          ${user.role === 'student' && isEnrolled ? `
            <div style="text-align:center">
              <button class="btn btn-primary btn-sm" onclick="openSubmitModal(${a.assignmentNumber})">Submit</button>
            </div>` : ''}
        </div>`;
      }).join('')}
    </div>` :
    `<div class="empty-state"><div class="empty-state-icon">📝</div><h3>No assignments yet</h3></div>`}
  `;
}

// ── Forums tab ──
function renderForumsTab(forums, courseID, user) {
  return `
    <div class="page-header"><div></div>
      <button class="btn btn-primary btn-sm" id="create-forum-btn" data-course="${courseID}">+ New Forum</button>
    </div>
    ${forums.length ? `
    <div class="forum-list">
      ${forums.map(f => `
        <div class="forum-card" data-forum="${f.forumNumber}" data-course="${courseID}">
          <div>
            <div class="forum-card-title">${esc(f.header)}</div>
            <div class="forum-card-meta">Created by ${esc(f.firstName)} ${esc(f.lastName)} · ${timeAgo(f.createdAt)}</div>
          </div>
          <div class="forum-card-stat">
            <div class="forum-card-stat-num">${f.threadCount}</div>
            <div class="forum-card-stat-lbl">Threads</div>
          </div>
        </div>`).join('')}
    </div>` :
    `<div class="empty-state"><div class="empty-state-icon">💬</div><h3>No forums yet</h3><p>Start a discussion for this course.</p></div>`}
  `;
}

// ── Calendar tab ──
function renderCalendarTab(events, courseID, canManage) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `
    ${canManage ? `<div class="page-header"><div></div>
      <button class="btn btn-primary btn-sm" id="add-event-btn">+ Add Event</button>
    </div>` : ''}
    ${events.length ? `
    <div class="calendar-events">
      ${events.map(ev => {
        const d = new Date(ev.eventDate);
        return `
        <div class="event-card">
          <div class="event-date-box">
            <div class="event-date-day">${d.getUTCDate()}</div>
            <div class="event-date-mon">${months[d.getUTCMonth()]}</div>
          </div>
          <div>
            <div class="event-name">${esc(ev.eventName)}</div>
            <div class="event-meta">${ev.startTime ? `🕐 ${ev.startTime}` : ''} ${ev.eventDescription ? esc(ev.eventDescription) : ''}</div>
          </div>
        </div>`;
      }).join('')}
    </div>` :
    `<div class="empty-state"><div class="empty-state-icon">📅</div><h3>No events scheduled</h3></div>`}
  `;
}

// ── Members tab ──
function renderMembersTab(members) {
  const { lecturer, students } = members;
  return `
    ${lecturer ? `
    <div class="card card-sm" style="margin-bottom:16px;display:flex;align-items:center;gap:12px">
      <div class="user-avatar">${avatarInitials(lecturer.firstName, lecturer.lastName)}</div>
      <div>
        <div style="font-weight:700">${esc(lecturer.firstName)} ${esc(lecturer.lastName)}</div>
        <div><span class="badge badge-lecturer">Lecturer</span></div>
      </div>
    </div>` : ''}
    <div class="card" style="padding:0">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);font-weight:700">
        Students (${students.length})
      </div>
      <div class="members-list" style="padding:8px 12px;max-height:400px;overflow-y:auto">
        ${students.map(s => `
          <div class="member-row">
            <div class="user-avatar sm">${avatarInitials(s.firstName, s.lastName)}</div>
            <div>
              <div class="member-name">${esc(s.firstName)} ${esc(s.lastName)}</div>
              <div class="member-id">${esc(s.email || '')}</div>
            </div>
          </div>`).join('') ||
          '<p class="text-muted" style="padding:12px">No students enrolled.</p>'}
      </div>
    </div>
  `;
}

// ── Lecturer content management ──
function attachContentListeners(courseID, existingSections) {
  const addSecBtn = $('#add-section-btn');
  if (addSecBtn) {
    addSecBtn.addEventListener('click', () => {
      showModal('Add Section', `
        <div class="form-group"><label>Section Name</label>
          <input type="text" id="new-sec-name" placeholder="e.g. Unit 1: Introduction" /></div>
        <div class="form-group"><label>Order</label>
          <input type="number" id="new-sec-order" value="1" min="1" /></div>`,
        `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
         <button class="btn btn-primary" id="save-section-btn">Add Section</button>`);
      $('#save-section-btn').addEventListener('click', async () => {
        const name  = $('#new-sec-name').value.trim();
        const order = $('#new-sec-order').value;
        if (!name) return;
        try {
          await api.content.createSection(courseID, { sectionName: name, sectionOrder: order });
          closeModal(); toast('Section added!', 'success');
          navigate(`/course/${courseID}`);
        } catch (err) { toast(err.message, 'error'); }
      });
    });
  }
}

window.openAddContentModal = (secNumber) => {
  showModal('Add Content', `
    <div class="form-group"><label>Content Name</label>
      <input type="text" id="cont-name" placeholder="Lecture 1 Slides" /></div>
    <div class="form-group"><label>Type</label>
      <select id="cont-type"><option value="link">Link</option><option value="file">File</option><option value="slides">Slides</option></select></div>
    <div class="form-group"><label>URL</label>
      <input type="url" id="cont-url" placeholder="https://…" /></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" id="save-cont-btn">Add Content</button>`);
  $('#save-cont-btn').addEventListener('click', async () => {
    const data = { contentName: $('#cont-name').value, fileType: $('#cont-type').value, contentURL: $('#cont-url').value };
    if (!data.contentName || !data.contentURL) { toast('Fill all fields', 'error'); return; }
    try {
      await api.content.addContent(secNumber, data);
      closeModal(); toast('Content added!', 'success');
      window.location.reload();
    } catch (err) { toast(err.message, 'error'); }
  });
};

function attachEventListeners(courseID) {
  const addEvtBtn = $('#add-event-btn');
  if (addEvtBtn) {
    addEvtBtn.addEventListener('click', () => {
      showModal('Add Calendar Event', `
        <div class="form-group"><label>Event Name</label>
          <input type="text" id="ev-name" placeholder="Midterm Exam" /></div>
        <div class="form-group"><label>Date</label>
          <input type="date" id="ev-date" /></div>
        <div class="form-row">
          <div class="form-group"><label>Start Time</label><input type="time" id="ev-start" /></div>
          <div class="form-group"><label>End Time</label><input type="time" id="ev-end" /></div>
        </div>
        <div class="form-group"><label>Description</label>
          <textarea id="ev-desc" placeholder="Optional details…"></textarea></div>`,
        `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
         <button class="btn btn-primary" id="save-ev-btn">Save Event</button>`);
      $('#save-ev-btn').addEventListener('click', async () => {
        const data = {
          eventName: $('#ev-name').value, eventDate: $('#ev-date').value,
          startTime: $('#ev-start').value || null, endTime: $('#ev-end').value || null,
          eventDescription: $('#ev-desc').value || null,
        };
        if (!data.eventName || !data.eventDate) { toast('Name and date are required', 'error'); return; }
        try {
          await api.calendar.create(courseID, data);
          closeModal(); toast('Event added!', 'success');
          window.location.reload();
        } catch (err) { toast(err.message, 'error'); }
      });
    });
  }
}

function attachAssignmentListeners(courseID) {
  const addABtn = $('#add-assignment-btn');
  if (addABtn) {
    addABtn.addEventListener('click', () => {
      showModal('Create Assignment', `
        <div class="form-group"><label>Assignment Name</label>
          <input type="text" id="as-name" placeholder="Assignment 1" /></div>
        <div class="form-group"><label>Description</label>
          <textarea id="as-desc" placeholder="Details about the assignment…"></textarea></div>
        <div class="form-row">
          <div class="form-group"><label>Max Marks</label>
            <input type="number" id="as-marks" value="100" min="1" /></div>
          <div class="form-group"><label>Due Date</label>
            <input type="datetime-local" id="as-due" /></div>
        </div>`,
        `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
         <button class="btn btn-primary" id="save-as-btn">Create</button>`);
      $('#save-as-btn').addEventListener('click', async () => {
        const data = {
          assignmentName: $('#as-name').value,
          assignmentDescription: $('#as-desc').value || null,
          maxMarks: parseFloat($('#as-marks').value) || 100,
          dueDate: $('#as-due').value || null,
        };
        if (!data.assignmentName) { toast('Name is required', 'error'); return; }
        try {
          await api.assignments.create(courseID, data);
          closeModal(); toast('Assignment created!', 'success');
          window.location.reload();
        } catch (err) { toast(err.message, 'error'); }
      });
    });
  }
}

// Forum buttons
document.addEventListener('click', (e) => {
  // Create forum button
  if (e.target.id === 'create-forum-btn' || e.target.closest('#create-forum-btn')) {
    const btn = e.target.id === 'create-forum-btn' ? e.target : e.target.closest('#create-forum-btn');
    const courseID = btn.dataset.course;
    showModal('Create Forum', `
      <div class="form-group"><label>Forum Title</label>
        <input type="text" id="forum-header" placeholder="e.g. Week 1 Discussion" /></div>`,
      `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
       <button class="btn btn-primary" id="save-forum-btn">Create</button>`);
    $('#save-forum-btn').addEventListener('click', async () => {
      const header = $('#forum-header').value.trim();
      if (!header) return;
      try {
        await api.forums.create(courseID, header);
        closeModal(); toast('Forum created!', 'success');
        window.location.reload();
      } catch (err) { toast(err.message, 'error'); }
    });
  }
});

// Submit assignment
window.openSubmitModal = (assignmentNumber) => {
  showModal('Submit Assignment', `
    <div class="form-group"><label>Submission Text</label>
      <textarea id="sub-text" placeholder="Your answer…"></textarea></div>
    <div class="form-group"><label>Or provide a URL</label>
      <input type="url" id="sub-url" placeholder="https://…" /></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" id="do-submit-btn">Submit</button>`);
  $('#do-submit-btn').addEventListener('click', async () => {
    const data = { submissionText: $('#sub-text').value || null, submissionURL: $('#sub-url').value || null };
    if (!data.submissionText && !data.submissionURL) { toast('Provide text or URL', 'error'); return; }
    try {
      await api.assignments.submit(assignmentNumber, data);
      closeModal(); toast('Assignment submitted!', 'success');
    } catch (err) { toast(err.message, 'error'); }
  });
};

// View submissions (lecturer)
window.viewSubmissions = async (assignmentNumber) => {
  let subs = [];
  try { subs = await api.assignments.getSubmissions(assignmentNumber); } catch (e) {}
  showModal(`Submissions (${subs.length})`, `
    <div class="table-wrapper">
      <table>
        <thead><tr><th>Student</th><th>Submitted</th><th>Grade</th><th>Action</th></tr></thead>
        <tbody>
          ${subs.map(s => `
            <tr>
              <td><strong>${esc(s.firstName)} ${esc(s.lastName)}</strong></td>
              <td>${formatDateTime(s.submissionDate)}</td>
              <td>${s.grade !== null ? gradeChip(s.grade, 100) : '<span class="badge badge-gray">Ungraded</span>'}</td>
              <td><button class="btn btn-secondary btn-sm" onclick="openGradeModal(${s.studentID},${assignmentNumber},${s.grade||''})">Grade</button></td>
            </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;padding:24px" class="text-muted">No submissions yet</td></tr>'}
        </tbody>
      </table>
    </div>`);
};

window.openGradeModal = (studentID, assignmentNumber, currentGrade) => {
  showModal('Submit Grade', `
    <div class="form-group"><label>Grade (out of 100)</label>
      <input type="number" id="grade-val" value="${currentGrade || ''}" min="0" max="100" step="0.01" /></div>
    <div class="form-group"><label>Feedback (optional)</label>
      <textarea id="grade-feedback" placeholder="Comments for the student…"></textarea></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" id="do-grade-btn">Save Grade</button>`);
  $('#do-grade-btn').addEventListener('click', async () => {
    const grade    = parseFloat($('#grade-val').value);
    const feedback = $('#grade-feedback').value;
    if (isNaN(grade)) { toast('Enter a valid grade', 'error'); return; }
    try {
      await api.assignments.grade(studentID, assignmentNumber, { grade, feedback });
      closeModal(); toast('Grade saved!', 'success');
    } catch (err) { toast(err.message, 'error'); }
  });
};

// Forum click handler (delegated)
function forumClickHandler(e) {
  const card = e.target.closest('.forum-card');
  if (!card) return;
  const forumID  = card.dataset.forum;
  const courseID = card.dataset.course;
  if (forumID) navigate(`/forum/${forumID}?course=${courseID}`);
}

// ──────────────────────────────────────────────────────
// ── PAGE: FORUM ──────────────────────────────────────
// ──────────────────────────────────────────────────────
route('forum', async ([, forumID]) => {
  if (!forumID) { navigate('/courses'); return; }
  const user    = Auth.getUser();
  const threads = await api.threads.getForForum(forumID);

  $('#page-content').innerHTML = `
    <div class="page-header">
      <div><h2>Forum Threads</h2><p>${threads.length} thread${threads.length !== 1 ? 's' : ''}</p></div>
      <button class="btn btn-primary btn-sm" id="new-thread-btn">+ New Thread</button>
    </div>
    <div class="thread-list">
      ${threads.map(t => `
        <div class="thread-card" data-thread="${t.threadNumber}">
          <div>
            <div class="thread-title">${esc(t.title)}</div>
            <div class="thread-meta">
              <span>By ${esc(t.firstName)} ${esc(t.lastName)}</span> ·
              <span>${timeAgo(t.createdAt)}</span>
            </div>
          </div>
          <div class="thread-replies-badge">
            💬 ${t.replyCount}
          </div>
        </div>`).join('') ||
        `<div class="empty-state"><div class="empty-state-icon">💬</div><h3>No threads yet</h3><p>Be the first to start a discussion!</p></div>`}
    </div>
  `;

  // Thread click
  $$('.thread-card').forEach(card => {
    card.addEventListener('click', () => navigate(`/thread/${card.dataset.thread}`));
  });

  // New thread
  $('#new-thread-btn').addEventListener('click', () => {
    showModal('Start New Thread', `
      <div class="form-group"><label>Title</label>
        <input type="text" id="th-title" placeholder="Thread title…" /></div>
      <div class="form-group"><label>Your Post</label>
        <textarea id="th-message" style="min-height:120px" placeholder="Write your post…"></textarea></div>`,
      `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
       <button class="btn btn-primary" id="post-thread-btn">Post Thread</button>`);
    $('#post-thread-btn').addEventListener('click', async () => {
      const data = { title: $('#th-title').value, forumMessage: $('#th-message').value };
      if (!data.title || !data.forumMessage) { toast('Fill all fields', 'error'); return; }
      try {
        const t = await api.threads.create(forumID, data);
        closeModal(); toast('Thread posted!', 'success');
        navigate(`/thread/${t.threadNumber}`);
      } catch (err) { toast(err.message, 'error'); }
    });
  });
});

// ──────────────────────────────────────────────────────
// ── PAGE: THREAD ─────────────────────────────────────
// ──────────────────────────────────────────────────────
route('thread', async ([, threadID]) => {
  if (!threadID) return;
  const user = Auth.getUser();
  const { thread, replies } = await api.threads.get(threadID);

  // replies are Thread rows (parentThreadID set); build nested tree recursively
  const buildReplyTree = (parentID, depth = 0) => {
    const children = replies.filter(r => String(r.parentThreadID) === String(parentID));
    return children.map(r => `
      <div class="reply-node ${depth > 0 ? 'nested' : ''}">
        <div class="reply-avatar user-avatar sm">${avatarInitials(r.firstName, r.lastName)}</div>
        <div class="reply-body">
          <div class="reply-header">
            <span class="reply-author">${esc(r.firstName)} ${esc(r.lastName)}</span>
          </div>
          <div class="reply-text">${esc(r.forumMessage)}</div>
          <div class="reply-actions">
            <button class="reply-btn" onclick="openReplyBox(${threadID}, ${r.threadNumber})">↩ Reply</button>
          </div>
          ${depth < 3 ? buildReplyTree(r.threadNumber, depth + 1) : ''}
        </div>
      </div>`).join('');
  };

  $('#page-content').innerHTML = `
    <div class="thread-op">
      <div class="thread-op-title">${esc(thread.title)}</div>
      <div class="thread-op-meta">
        <div class="user-avatar sm">${avatarInitials(thread.firstName, thread.lastName)}</div>
        <strong>${esc(thread.firstName)} ${esc(thread.lastName)}</strong>
      </div>
      <div class="thread-op-body">${esc(thread.forumMessage)}</div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <div class="card-title" style="margin-bottom:14px">💬 ${replies.length} ${replies.length === 1 ? 'Reply' : 'Replies'}</div>
      <div class="reply-tree" id="reply-tree">
        ${buildReplyTree(null)}
        ${!replies.length ? '<p class="text-muted" style="font-size:14px">No replies yet. Be the first!</p>' : ''}
      </div>
    </div>

    <div class="card" id="reply-box">
      <div class="card-title" style="margin-bottom:14px">Add a Reply</div>
      <div id="reply-in-reply-to" style="display:none;background:var(--primary-light);border-radius:6px;padding:8px 12px;margin-bottom:10px;font-size:13px;color:var(--primary)"></div>
      <div class="form-group"><textarea id="reply-text" placeholder="Write your reply…" style="min-height:100px"></textarea></div>
      <div style="display:flex;justify-content:flex-end;gap:10px">
        <button class="btn btn-ghost" id="cancel-reply" style="display:none">Cancel reply</button>
        <button class="btn btn-primary" id="post-reply-btn">Post Reply</button>
      </div>
    </div>
  `;

  let replyingTo = null;

  window.openReplyBox = (threadNum, parentReplyID) => {
    replyingTo = parentReplyID;
    const parent = replies.find(r => r.threadNumber === parentReplyID);
    const inReplyTo = $('#reply-in-reply-to');
    const parentName = parent ? (parent.firstName + ' ' + parent.lastName) : 'comment';
    inReplyTo.textContent = `↩ Replying to ${parentName}`;
    inReplyTo.style.display = '';
    $('#cancel-reply').style.display = '';
    $('#reply-text').focus();
    document.getElementById('reply-box').scrollIntoView({ behavior: 'smooth' });
  };

  $('#cancel-reply').addEventListener('click', () => {
    replyingTo = null;
    $('#reply-in-reply-to').style.display = 'none';
    $('#cancel-reply').style.display = 'none';
  });

  $('#post-reply-btn').addEventListener('click', async () => {
    const msg = $('#reply-text').value.trim();
    if (!msg) return;
    try {
      await api.threads.reply(threadID, { replyMessage: msg, parentReplyID: replyingTo });
      toast('Reply posted!', 'success');
      navigate(`/thread/${threadID}`);
    } catch (err) { toast(err.message, 'error'); }
  });
});

// ──────────────────────────────────────────────────────
// ── PAGE: CALENDAR ───────────────────────────────────
// ──────────────────────────────────────────────────────
route('calendar', async () => {
  const user   = Auth.getUser();
  const today  = new Date().toISOString().split('T')[0];
  const events = await api.calendar.getStudentEvents(user.idNumber, today);

  $('#page-content').innerHTML = `
    <div class="page-header">
      <div><h2>Today's Events</h2><p>${formatDate(today)}</p></div>
    </div>
    ${events.length ? `
    <div class="calendar-events">
      ${events.map(ev => {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const d = new Date(ev.eventDate);
        return `<div class="event-card">
          <div class="event-date-box">
            <div class="event-date-day">${d.getUTCDate()}</div>
            <div class="event-date-mon">${months[d.getUTCMonth()]}</div>
          </div>
          <div>
            <div class="event-name">${esc(ev.eventName)}</div>
            <div class="event-meta">${ev.startTime ? '🕐 ' + ev.startTime : ''} ${ev.eventDescription ? esc(ev.eventDescription) : ''}</div>
          </div>
        </div>`;
      }).join('')}
    </div>` :
    `<div class="empty-state"><div class="empty-state-icon">🎉</div><h3>Nothing scheduled today!</h3><p>You have no events for today.</p></div>`}
  `;
});

// ──────────────────────────────────────────────────────
// ── PAGE: GRADES ─────────────────────────────────────
// ──────────────────────────────────────────────────────
route('grades', async () => {
  const user = Auth.getUser();
  const data = await api.grades.getForStudent(user.idNumber);
  const { grades, overallAverage } = data;

  const pct = overallAverage !== null ? overallAverage : 0;

  $('#page-content').innerHTML = `
    <div class="card" style="margin-bottom:24px">
      <div class="card-header">
        <div>
          <div class="card-title">Overall Average</div>
          <div class="card-subtitle">${grades.length} graded assignment${grades.length !== 1 ? 's' : ''}</div>
        </div>
        <div class="grade-chip ${pct < 50 ? 'low' : ''}" style="font-size:36px">
          ${overallAverage !== null ? overallAverage.toFixed(1) + '%' : '—'}
          <small style="font-size:12px;color:var(--text-2)">${pct >= 70 ? '🏆 Excellent' : pct >= 50 ? '📈 Good' : pct > 0 ? '⚠️ Needs work' : ''}</small>
        </div>
      </div>
      <div class="grade-bar-wrap">
        <div class="grade-bar-track"><div class="grade-bar-fill" style="width:${pct}%"></div></div>
      </div>
    </div>

    ${grades.length ? `
    <div class="card" style="padding:0">
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Assignment</th><th>Course</th><th>Grade</th><th>Max</th><th>Date Graded</th></tr></thead>
          <tbody>
            ${grades.map(g => `
              <tr>
                <td><strong>${esc(g.assignmentName)}</strong></td>
                <td>${esc(g.courseName)}</td>
                <td>${gradeChip(g.grade, g.maxMarks)}</td>
                <td>${g.maxMarks}</td>
                <td class="text-muted">${formatDate(g.gradedDate)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` :
    `<div class="empty-state"><div class="empty-state-icon">📊</div><h3>No grades yet</h3><p>Submit assignments to see your grades here.</p></div>`}
  `;
});

// ──────────────────────────────────────────────────────
// ── PAGE: REPORTS ────────────────────────────────────
// ──────────────────────────────────────────────────────
route('reports', async () => {
  const reportDefs = [
    { key:'courses-50-plus',  title:'Courses with 50+ Students',   icon:'📈', desc:'All courses that have enrolled 50 or more students', bg:'#EEF2FF' },
    { key:'students-5-plus',  title:'Students in 5+ Courses',      icon:'👥', desc:'Students enrolled in 5 or more courses',             bg:'#D1FAE5' },
    { key:'lecturers-3-plus', title:'Lecturers Teaching 3+ Courses',icon:'👨‍🏫',desc:'Lecturers assigned to 3 or more courses',           bg:'#EDE9FE' },
    { key:'top-courses',      title:'Top 10 Most Enrolled',         icon:'🏆', desc:'The 10 courses with the most student enrollments',   bg:'#FEF3C7' },
    { key:'top-students',     title:'Top 10 Students by Average',   icon:'⭐', desc:'Students with the highest overall grade averages',   bg:'#FEE2E2' },
  ];

  // Load all reports in parallel
  const results = await Promise.all(
    reportDefs.map(r => api.reports.get(r.key).catch(() => []))
  );

  const renderReportTable = (key, rows) => {
    if (!rows || rows.length === 0)
      return '<p class="text-muted" style="padding:20px;text-align:center">No data available.</p>';

    const cols = Object.keys(rows[0]);
    return `<div class="table-wrapper"><table>
      <thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(row =>
        `<tr>${cols.map(c => `<td>${esc(row[c])}</td>`).join('')}</tr>`
      ).join('')}</tbody>
    </table></div>`;
  };

  $('#page-content').innerHTML = `
    <div class="page-header"><div><h2>Reports</h2><p>Analytics views from the database</p></div></div>
    <div class="reports-grid">
      ${reportDefs.map((r, i) => `
        <div class="report-card">
          <div class="report-card-header">
            <div class="report-icon" style="background:${r.bg}">${r.icon}</div>
            <div>
              <div class="report-card-title">${r.title}</div>
              <div class="report-card-desc">${r.desc}</div>
            </div>
            <div class="badge badge-primary" style="margin-left:auto">${results[i].length}</div>
          </div>
          <div class="report-card-body">${renderReportTable(r.key, results[i])}</div>
        </div>`).join('')}
    </div>
  `;
});

// ──────────────────────────────────────────────────────
// ── PAGE: MANAGE COURSES (admin) ─────────────────────
// ──────────────────────────────────────────────────────
route('manage-courses', async () => {
  const user    = Auth.getUser();
  const courses = await api.courses.getAll();

  $('#page-content').innerHTML = `
    <div class="page-header">
      <div><h2>Manage Courses</h2><p>Create and oversee all courses</p></div>
      ${user.role === 'admin' ? `<button class="btn btn-primary" id="create-course-btn">+ Create Course</button>` : ''}
    </div>
    <div class="card" style="padding:0">
      <div class="table-wrapper">
        <table>
          <thead><tr><th>ID</th><th>Name</th><th>Lecturer</th><th></th></tr></thead>
          <tbody>
            ${courses.map(c => `
              <tr>
                <td><span class="badge badge-primary">#${c.courseID}</span></td>
                <td><strong>${esc(c.courseName)}</strong></td>
                <td>${esc(c.lecturerName || '—')}</td>
                <td><a href="#/course/${c.courseID}" class="btn btn-ghost btn-sm">View →</a></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  if (user.role === 'admin') {
    $('#create-course-btn').addEventListener('click', () => openCreateCourseModal());
  }
});

function openCreateCourseModal() {
  showModal('Create New Course', `
    <div class="form-group"><label>Course Name</label>
      <input type="text" id="cc-name" placeholder="e.g. Database Systems" /></div>
    <div class="form-group"><label>Lecturer ID</label>
      <input type="number" id="cc-lecturer" placeholder="Lecturer user ID" /></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" id="save-course-btn">Create Course</button>`);
  $('#save-course-btn').addEventListener('click', async () => {
    const data = {
      courseName: $('#cc-name').value.trim(),
      lecturerID: parseInt($('#cc-lecturer').value),
    };
    if (!data.courseName || !data.lecturerID) {
      toast('Course name and lecturer ID are required', 'error'); return;
    }
    try {
      await api.courses.create(data);
      closeModal(); toast('Course created!', 'success');
      navigate('/manage-courses');
    } catch (err) { toast(err.message, 'error'); }
  });
}

// ──────────────────────────────────────────────────────
// SHARED COMPONENTS
// ──────────────────────────────────────────────────────
function courseCard(c, user) {
  const colors = ['#4F46E5','#7C3AED','#DB2777','#059669','#D97706','#2563EB'];
  const color  = colors[c.courseID % colors.length];
  return `
    <div class="course-card" data-course="${c.courseID}">
      <div class="course-card-banner" style="background:linear-gradient(90deg,${color},${color}99)"></div>
      <div class="course-card-body">
        <div class="course-card-code">Course #${c.courseID}</div>
        <div class="course-card-name">${esc(c.courseName)}</div>
        <div class="course-card-meta">
          <span class="course-card-lecturer">👨‍🏫 ${esc(c.lecturerName || 'TBA')}</span>
        </div>
      </div>
      <div class="course-card-footer">
        <span class="badge badge-primary">ID: ${c.courseID}</span>
        <button class="btn btn-primary btn-sm">View →</button>
      </div>
    </div>`;
}

function attachCourseCardListeners() {
  $$('.course-card').forEach(card => {
    card.addEventListener('click', () => navigate(`/course/${card.dataset.course}`));
  });
}

function gradeChip(grade, max) {
  const pct = max > 0 ? (grade / max * 100) : grade;
  const cls = pct < 50 ? 'badge-danger' : pct < 70 ? 'badge-warning' : 'badge-success';
  return `<span class="badge ${cls}">${grade}/${max}</span>`;
}

// ──────────────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────────────
function init() {
  initAuth();
  initNav();

  window.addEventListener('hashchange', handleRoute);

  if (Auth.isLoggedIn()) {
    showApp();
  } else {
    showAuth();
  }
}

window.closeModal = closeModal;
document.addEventListener('DOMContentLoaded', init);
