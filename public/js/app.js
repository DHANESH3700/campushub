const root = document.getElementById('root');
const toastEl = document.getElementById('toast');

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 3200);
}

function h(html) {
  return html;
}

function navItems(role) {
  const common = [
    ['dashboard', 'Dashboard'],
    ['announcements', 'Announcements'],
    ['events', 'Events'],
    ['notifications', 'Notifications'],
    ['resources', 'Resources'],
    ['support', 'Support & FAQ'],
    ['assistant', 'Assistant']
  ];
  const student = [
    ['leave', 'Leave'],
    ['issues', 'Campus issues'],
    ['documents', 'Documents'],
    ['attendance', 'Attendance'],
    ['timetable', 'Timetable'],
    ['marks', 'Marks'],
    ['assignments', 'Assignments'],
    ['idcard', 'Digital ID'],
    ['career', 'Career profile'],
    ['placements', 'Placements'],
    ['scholarships', 'Scholarships'],
    ['clubs', 'Clubs'],
    ['achievements', 'Achievements'],
    ['polls', 'Polls'],
    ['library', 'Library'],
    ['hostel', 'Hostel'],
    ['transport', 'Transport'],
    ['profile', 'Profile']
  ];
  const faculty = [
    ['students', 'Students'],
    ['leave', 'Leave reviews'],
    ['issues', 'Assigned issues'],
    ['attendance', 'Attendance'],
    ['timetable', 'Timetable'],
    ['marks', 'Marks'],
    ['assignments', 'Assignments'],
    ['resources', 'Resources'],
    ['clubs', 'Clubs'],
    ['achievements', 'Achievements'],
    ['polls', 'Polls'],
    ['analytics', 'Reports']
  ];
  const admin = [
    ['users', 'Users'],
    ['admin', 'Academic setup'],
    ['leave', 'Leave'],
    ['issues', 'Issues'],
    ['documents', 'Documents'],
    ['attendance', 'Attendance'],
    ['timetable', 'Timetable'],
    ['marks', 'Marks'],
    ['assignments', 'Assignments'],
    ['placements', 'Placements'],
    ['scholarships', 'Scholarships'],
    ['clubs', 'Clubs'],
    ['library', 'Library'],
    ['hostel', 'Hostel'],
    ['transport', 'Transport'],
    ['analytics', 'Analytics'],
    ['settings', 'Settings']
  ];
  const map = { student, faculty, admin, placement_officer: [['placements', 'Placements'], ['analytics', 'Analytics'], ['career', 'Student careers']], staff: [['students', 'Students'], ['library', 'Library'], ['hostel', 'Hostel'], ['transport', 'Transport'], ['documents', 'Documents'], ['issues', 'Issues']] };
  return [...common, ...(map[role] || [])];
}

function shell(user, inner) {
  const items = navItems(user.role)
    .map(([id, label]) => `<a href="#${id}" data-route="${id}">${label}</a>`)
    .join('');
  return `
    <div class="app">
      <aside class="sidebar" id="sidebar">
        <div class="brand-row"><div class="logo">CH</div><div><h1>CampusHub</h1><div class="muted">${user.role.replace('_', ' ')}</div></div></div>
        <nav class="nav">${items}</nav>
      </aside>
      <div>
        <div class="topbar">
          <button class="btn menu-btn" id="menuBtn" aria-label="Open menu">Menu</button>
          <strong>${user.name}</strong>
          <div>
            <button class="btn ghost" id="installBtn" hidden>Install app</button>
            <button class="btn" id="logoutBtn">Logout</button>
          </div>
        </div>
        <main class="content" id="view">${inner}</main>
      </div>
    </div>`;
}

function table(headers, rows) {
  if (!rows.length) return `<div class="empty">Nothing to show yet.</div>`;
  return `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function badge(status) {
  return `<span class="badge ${status || ''}">${status || '-'}</span>`;
}

function formToJson(form) {
  const data = {};
  new FormData(form).forEach((v, k) => { data[k] = v; });
  return data;
}

const Pages = {
  login() {
    return `<main class="auth-card">
        <div class="brand-row"><div class="logo">CH</div><h1>CampusHub</h1></div>
        <p class="muted">Sign in to the college management platform.</p>
        <form id="loginForm">
          <label class="field">Email <input name="email" type="email" required autocomplete="username" /></label>
          <label class="field">Password <input name="password" type="password" required autocomplete="current-password" /></label>
          <button class="btn primary" type="submit">Login</button>
        </form>
        <p><a href="#forgot">Forgot password</a> · <a href="#register">Register</a></p>
        <p class="muted">Demo: admin@campushub.edu / Admin@12345</p>
      </main>`;
  },
  register() {
    return `<main class="auth-card"><h1>Register</h1>
      <form id="regForm">
        <label class="field">Name <input name="name" required /></label>
        <label class="field">Email <input name="email" type="email" required /></label>
        <label class="field">Password <input name="password" type="password" minlength="8" required /></label>
        <label class="field">Role
          <select name="role"><option value="student">Student</option><option value="faculty">Faculty</option><option value="staff">Staff</option></select>
        </label>
        <button class="btn primary">Create account</button>
      </form>
      <p><a href="#login">Back to login</a></p></main>`;
  },
  forgot() {
    return `<main class="auth-card"><h1>Reset password</h1>
      <form id="forgotForm"><label class="field">Email <input name="email" type="email" required /></label>
      <button class="btn primary">Send reset link</button></form>
      <p><a href="#login">Back</a></p></main>`;
  }
};

async function renderDashboard() {
  const { dashboard } = await Api.request('/dashboard');
  const s = dashboard.stats || {};
  if (dashboard.role === 'admin' || dashboard.role === 'placement_officer' || dashboard.role === 'staff') {
    return `<h2>Administrator overview</h2>
      <div class="grid stats">
        ${['students','faculty','pendingLeaves','openIssues','pendingDocs','placed'].map((k) => `<div class="card"><div class="muted">${k}</div><div class="stat">${s[k] ?? 0}</div></div>`).join('')}
      </div>
      <div class="grid cards" style="margin-top:16px">
        <div class="card"><h3>Recent activity</h3>${(dashboard.recentAudit||[]).map(a => `<div>${a.action} · ${a.actor?.name || ''}</div>`).join('') || '<div class="empty">No audit events</div>'}</div>
        <div class="card"><h3>Announcements</h3>${dashboard.announcements.map(a => `<div><strong>${a.title}</strong><p class="muted">${a.body}</p></div>`).join('')}</div>
        <div class="card"><canvas id="chartMain"></canvas></div>
      </div>`;
  }
  if (dashboard.role === 'faculty') {
    return `<h2>Faculty dashboard</h2>
      <div class="grid cards">
        <div class="card"><h3>Pending leave</h3>${(dashboard.pendingLeaves||[]).map(l => `<div>${l.student?.name} ${badge(l.status)}</div>`).join('') || '<div class="empty">None</div>'}</div>
        <div class="card"><h3>Assigned issues</h3>${(dashboard.assignedIssues||[]).map(i => `<div>${i.title} ${badge(i.status)}</div>`).join('') || '<div class="empty">None</div>'}</div>
        <div class="card"><h3>Awaiting evaluation</h3>${(dashboard.awaiting||[]).map(s => `<div>${s.student?.name} — ${s.assignment?.title}</div>`).join('') || '<div class="empty">None</div>'}</div>
        <div class="card"><h3>Today's classes</h3>${(dashboard.timetable||[]).map(t => `<div>${t.subject?.name} ${t.startTime}-${t.endTime}</div>`).join('') || '<div class="empty">No slots</div>'}</div>
      </div>`;
  }
  return `<h2>Student dashboard</h2>
    <div class="grid stats">
      <div class="card"><div class="muted">Attendance</div><div class="stat">${dashboard.attendancePercent || 0}%</div>${dashboard.warning ? '<span class="badge pending">Below threshold</span>' : ''}</div>
      <div class="card"><div class="muted">Pending requests</div><div class="stat">${(dashboard.pendingRequests||[]).length}</div></div>
      <div class="card"><div class="muted">Upcoming events</div><div class="stat">${(dashboard.events||[]).length}</div></div>
    </div>
    <div class="grid cards" style="margin-top:16px">
      <div class="card"><h3>Announcements</h3>${(dashboard.announcements||[]).map(a => `<p><strong>${a.title}</strong><br>${a.body}</p>`).join('') || '<div class="empty">None</div>'}</div>
      <div class="card"><h3>Assignments due</h3>${(dashboard.assignments||[]).map(a => `<div>${a.title} · ${new Date(a.deadline).toLocaleString()}</div>`).join('') || '<div class="empty">None</div>'}</div>
      <div class="card"><h3>Opportunities</h3>${(dashboard.jobs||[]).map(j => `<div>${j.title}</div>`).join('') || '<div class="empty">None</div>'}</div>
      <div class="card"><h3>Resources</h3>${(dashboard.resources||[]).map(r => `<div>${r.title}</div>`).join('') || '<div class="empty">None</div>'}</div>
    </div>`;
}

async function crudPage(opts) {
  const data = await Api.request(opts.list);
  const items = data.items || data.applications || data.registrations || [];
  return `<h2>${opts.title}</h2>
    ${opts.form || ''}
    ${opts.render ? opts.render(data) : table(opts.headers, items.map(opts.row).join(''))}`;
}

const routes = {
  async dashboard() { return renderDashboard(); },
  async profile() {
    const u = Api.user();
    return `<h2>Profile</h2><div class="card">
      <form id="profileForm" class="form-grid">
        <label class="field">Name <input name="name" value="${u.name || ''}" /></label>
        <label class="field">Phone <input name="phone" value="${u.phone || ''}" /></label>
        <label class="field">Address <input name="address" value="${u.address || ''}" /></label>
        <button class="btn primary">Save</button>
      </form>
      <form id="pwForm" style="margin-top:16px">
        <h3>Change password</h3>
        <label class="field">Current <input name="currentPassword" type="password" required /></label>
        <label class="field">New <input name="newPassword" type="password" minlength="8" required /></label>
        <button class="btn">Update password</button>
      </form></div>`;
  },
  async leave() {
    const data = await Api.request('/leave');
    const user = Api.user();
    const form = user.role === 'student' ? `<div class="card"><form id="leaveForm" class="form-grid">
      <label class="field">Type <select name="type"><option>casual</option><option>medical</option><option>academic</option><option>emergency</option></select></label>
      <label class="field">From <input type="date" name="fromDate" required /></label>
      <label class="field">To <input type="date" name="toDate" required /></label>
      <label class="field" style="grid-column:1/-1">Reason <textarea name="reason" required></textarea></label>
      <label class="field">Document <input type="file" name="file" /></label>
      <button class="btn primary">Submit leave</button></form></div>` : '';
    return `<h2>Leave</h2>${form}${table(['Student','Type','Dates','Status','Actions'],
      (data.items||[]).map(i => `<tr><td>${i.student?.name||''}</td><td>${i.type}</td><td>${new Date(i.fromDate).toLocaleDateString()} – ${new Date(i.toDate).toLocaleDateString()}</td><td>${badge(i.status)}</td><td>${user.role!=='student' && i.status==='pending'?`<button class="btn" data-approve="${i._id}">Approve</button> <button class="btn danger" data-reject="${i._id}">Reject</button>`:''}</td></tr>`).join(''))}`;
  },
  async issues() {
    const data = await Api.request('/issues');
    return `<h2>Campus issues</h2>
      <div class="card"><form id="issueForm" class="form-grid">
        <label class="field">Title <input name="title" required /></label>
        <label class="field">Category <select name="category"><option>infrastructure</option><option>classroom</option><option>laboratory</option><option>electricity</option><option>internet</option><option>water</option><option>other</option></select></label>
        <label class="field">Priority <select name="priority"><option>low</option><option>medium</option><option>high</option><option>urgent</option></select></label>
        <label class="field">Location <input name="location" /></label>
        <label class="field" style="grid-column:1/-1">Description <textarea name="description" required></textarea></label>
        <label class="field">Photos <input type="file" name="files" multiple /></label>
        <button class="btn primary">Submit</button></form></div>
      ${table(['Title','Category','Status','Priority'], (data.items||[]).map(i=>`<tr><td>${i.title}</td><td>${i.category}</td><td>${badge(i.status)}</td><td>${i.priority}</td></tr>`).join(''))}`;
  },
  async documents() {
    const data = await Api.request('/documents');
    const user = Api.user();
    return `<h2>Document requests</h2>
      ${user.role==='student'?`<div class="card"><form id="docForm" class="form-grid">
        <label class="field">Category <select name="category"><option>bonafide</option><option>transcript</option><option>transfer</option><option>character</option><option>fee_receipt</option></select></label>
        <label class="field">Purpose <input name="purpose" required /></label>
        <button class="btn primary">Request</button></form></div>`:''}
      ${table(['Requester','Category','Status','File'], (data.items||[]).map(i=>`<tr><td>${i.requester?.name||''}</td><td>${i.category}</td><td>${badge(i.status)}</td><td>${i.completedDocument?`<button class="btn" data-file="${i.completedDocument}">Download</button>`: (['admin','staff'].includes(user.role)?`<form data-doc="${i._id}" class="upload-doc"><input type="file" name="file" /><button class="btn">Upload</button></form>`:'')}</td></tr>`).join(''))}`;
  },
  async resources() {
    const data = await Api.request('/resources');
    const user = Api.user();
    return `<h2>Academic resources</h2>
      <div class="filters"><input id="resQ" placeholder="Search" /><select id="resType"><option value="">All types</option><option>notes</option><option>study_material</option><option>question_bank</option><option>previous_paper</option></select></div>
      ${['faculty','admin'].includes(user.role)?`<div class="card"><form id="resForm" class="form-grid">
        <label class="field">Title <input name="title" required /></label>
        <label class="field">Type <select name="type"><option>notes</option><option>study_material</option><option>question_bank</option><option>previous_paper</option></select></label>
        <label class="field">Semester <input name="semester" type="number" /></label>
        <label class="field">File <input type="file" name="file" required /></label>
        <button class="btn primary">Upload</button></form></div>`:''}
      ${table(['Title','Type','Semester','File'], (data.items||[]).map(r=>`<tr><td>${r.title}</td><td>${r.type}</td><td>${r.semester||''}</td><td>${r.file?`<button class="btn" data-file="${r.file._id||r.file}">Download</button>`:''}</td></tr>`).join(''))}`;
  },
  async attendance() {
    const data = await Api.request('/attendance');
    const user = Api.user();
    return `<h2>Attendance ${data.percentage!=null?`· ${data.percentage}%`:''}</h2>
      ${['faculty','admin'].includes(user.role)?`<div class="card"><form id="attForm" class="form-grid">
        <label class="field">Student ID <input name="student" required /></label>
        <label class="field">Subject ID <input name="subject" required /></label>
        <label class="field">Date <input type="date" name="date" required /></label>
        <label class="field">Status <select name="status"><option>present</option><option>absent</option><option>late</option><option>excused</option><option>on_duty</option></select></label>
        <button class="btn primary">Record</button></form></div>`:''}
      ${table(['Student','Subject','Date','Status'], (data.items||[]).map(a=>`<tr><td>${a.student?.name||''}</td><td>${a.subject?.code||a.subject?.name||''}</td><td>${new Date(a.date).toLocaleDateString()}</td><td>${badge(a.status)}</td></tr>`).join(''))}`;
  },
  async timetable() {
    const data = await Api.request('/timetable');
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const user = Api.user();
    return `<h2>Timetable & calendar</h2>
      ${['admin','faculty'].includes(user.role)?`<div class="card"><form id="ttForm" class="form-grid">
        <label class="field">Subject ID <input name="subject" required /></label>
        <label class="field">Faculty ID <input name="faculty" required /></label>
        <label class="field">Classroom <input name="classroom" /></label>
        <label class="field">Day <select name="dayOfWeek">${days.map((d,i)=>`<option value="${i}">${d}</option>`).join('')}</select></label>
        <label class="field">Start <input name="startTime" placeholder="09:00" required /></label>
        <label class="field">End <input name="endTime" placeholder="10:00" required /></label>
        <label class="field">Semester <input name="semester" type="number" /></label>
        <label class="field">Section <input name="section" /></label>
        <button class="btn primary">Add slot</button></form></div>`:''}
      ${table(['Day','Time','Subject','Room'], (data.items||[]).map(t=>`<tr><td>${days[t.dayOfWeek]}</td><td>${t.startTime}-${t.endTime}</td><td>${t.subject?.name||''}</td><td>${t.classroom||''}</td></tr>`).join(''))}
      <div class="card"><h3>Academic calendar</h3>${(data.calendar||[]).map(c=>`<div>${c.title} · ${new Date(c.start).toLocaleDateString()} (${c.type})</div>`).join('') || '<div class="empty">No calendar entries</div>'}</div>`;
  },
  async marks() {
    const data = await Api.request('/marks');
    const user = Api.user();
    return `<h2>Marks & examinations</h2>
      ${['faculty','admin'].includes(user.role)?`<div class="card"><form id="markForm" class="form-grid">
        <label class="field">Student ID <input name="student" required /></label>
        <label class="field">Subject ID <input name="subject" required /></label>
        <label class="field">Assessment type ID <input name="assessmentType" required /></label>
        <label class="field">Marks <input name="marksObtained" type="number" required /></label>
        <label class="field">Max <input name="maxMarks" type="number" required /></label>
        <label class="field">Publish <select name="published"><option value="false">Draft</option><option value="true">Publish</option></select></label>
        <button class="btn primary">Save</button></form></div>`:''}
      ${table(['Student','Subject','Marks','Published'], (data.items||[]).map(m=>`<tr><td>${m.student?.name||''}</td><td>${m.subject?.name||''}</td><td>${m.marksObtained}/${m.maxMarks}</td><td>${m.published}</td></tr>`).join(''))}`;
  },
  async assignments() {
    const data = await Api.request('/assignments');
    const user = Api.user();
    return `<h2>Assignments</h2>
      ${['faculty','admin'].includes(user.role)?`<div class="card"><form id="asgForm" class="form-grid">
        <label class="field">Title <input name="title" required /></label>
        <label class="field">Subject ID <input name="subject" required /></label>
        <label class="field">Deadline <input type="datetime-local" name="deadline" required /></label>
        <label class="field">Max marks <input name="maxMarks" type="number" value="100" /></label>
        <label class="field">File <input type="file" name="file" /></label>
        <button class="btn primary">Create</button></form></div>`:''}
      ${table(['Title','Deadline','Actions'], (data.items||[]).map(a=>`<tr><td>${a.title}</td><td>${new Date(a.deadline).toLocaleString()}</td><td>${user.role==='student'?`<form data-submit="${a._id}" class="upload-doc"><input type="file" name="file" required /><button class="btn">Submit</button></form>`:''}</td></tr>`).join(''))}
      <div class="card"><h3>Submissions</h3>${table(['Student','Status','Marks'], (data.submissions||[]).map(s=>`<tr><td>${s.student?.name||s.student||''}</td><td>${badge(s.status)}</td><td>${s.marks??''} ${['faculty','admin'].includes(user.role)?`<button class="btn" data-grade="${s._id}">Grade</button>`:''}</td></tr>`).join(''))}</div>`;
  },
  async events() {
    const data = await Api.request('/events');
    const user = Api.user();
    return `<h2>Events</h2>
      ${['admin','faculty'].includes(user.role)?`<div class="card"><form id="eventForm" class="form-grid">
        <label class="field">Title <input name="title" required /></label>
        <label class="field">Start <input type="datetime-local" name="start" required /></label>
        <label class="field">Venue <input name="venue" /></label>
        <label class="field">Capacity <input type="number" name="capacity" /></label>
        <label class="field" style="grid-column:1/-1">Description <textarea name="description"></textarea></label>
        <button class="btn primary">Publish event</button></form></div>`:''}
      ${table(['Event','When','Venue','Action'], (data.items||[]).map(e=>`<tr><td>${e.title}</td><td>${new Date(e.start).toLocaleString()}</td><td>${e.venue||''}</td><td>${(data.registeredIds||[]).includes(e._id)?`<button class="btn" data-cancel-event="${e._id}">Cancel</button>`:`<button class="btn teal" data-reg-event="${e._id}">Register</button>`}</td></tr>`).join(''))}`;
  },
  async announcements() {
    const data = await Api.request('/announcements');
    const user = Api.user();
    return `<h2>Announcements</h2>
      ${['admin','faculty'].includes(user.role)?`<div class="card"><form id="annForm"><label class="field">Title <input name="title" required /></label><label class="field">Body <textarea name="body" required></textarea></label><button class="btn primary">Publish</button></form></div>`:''}
      <div class="grid cards">${(data.items||[]).map(a=>`<div class="card"><h3>${a.title}</h3><p>${a.body}</p></div>`).join('') || '<div class="empty">No announcements</div>'}</div>`;
  },
  async notifications() {
    const data = await Api.request('/notifications');
    return `<h2>Notifications ${data.unread?`(${data.unread} unread)`:''}</h2>
      <button class="btn" id="readAll">Mark all read</button>
      ${(data.items||[]).map(n=>`<div class="card"><strong>${n.title}</strong><p class="muted">${n.body||''}</p>${n.read?'':'<span class="badge pending">unread</span>'}</div>`).join('') || '<div class="empty">No notifications</div>'}`;
  },
  async career() {
    const data = await Api.request('/career');
    const p = data.profile || {};
    return `<h2>Career profile · ${data.completeness || 0}% complete</h2>
      <div class="card"><form id="careerForm">
        <label class="field">Headline <input name="headline" value="${p.headline||''}" /></label>
        <label class="field">Skills (comma separated) <input name="skills" value="${(p.skills||[]).join(', ')}" /></label>
        <button class="btn primary">Save profile</button></form>
        <form id="resumeForm" style="margin-top:12px"><label class="field">Resume PDF <input type="file" name="file" accept=".pdf,.doc,.docx" required /></label><button class="btn">Upload resume</button></form>
      </div>`;
  },
  async placements() {
    const data = await Api.request('/opportunities');
    const user = Api.user();
    return `<h2>Placements & internships</h2>
      ${['admin','placement_officer'].includes(user.role)?`<div class="card"><form id="jobForm" class="form-grid">
        <label class="field">Company ID <input name="company" required /></label>
        <label class="field">Title <input name="title" required /></label>
        <label class="field">Type <select name="type"><option>job</option><option>internship</option></select></label>
        <label class="field">Min CGPA <input name="minCgpa" type="number" step="0.1" /></label>
        <label class="field">Deadline <input type="date" name="deadline" /></label>
        <button class="btn primary">Publish</button></form>
        <form id="coForm" class="form-grid"><label class="field">New company <input name="name" required /></label><button class="btn">Add company</button></form></div>`:''}
      ${table(['Role','Company','Type','Deadline','Action'], (data.items||[]).map(o=>`<tr><td>${o.title}</td><td>${o.company?.name||''}</td><td>${o.type}</td><td>${o.deadline?new Date(o.deadline).toLocaleDateString():''}</td><td>${user.role==='student'?`<button class="btn teal" data-apply="${o._id}">Apply</button>`:''}</td></tr>`).join(''))}`;
  },
  async scholarships() {
    const data = await Api.request('/scholarships');
    const user = Api.user();
    return `<h2>Scholarships</h2>
      ${user.role==='admin'?`<div class="card"><form id="schForm" class="form-grid"><label class="field">Title <input name="title" required /></label><label class="field">Deadline <input type="date" name="deadline" /></label><label class="field">Eligibility <input name="eligibility" /></label><button class="btn primary">Create</button></form></div>`:''}
      ${table(['Title','Deadline','Action'], (data.items||[]).map(s=>`<tr><td>${s.title}</td><td>${s.deadline?new Date(s.deadline).toLocaleDateString():''}</td><td>${user.role==='student'?`<button class="btn" data-sch="${s._id}">Apply</button>`:''}</td></tr>`).join(''))}`;
  },
  async clubs() {
    const data = await Api.request('/clubs');
    return `<h2>Clubs</h2>${table(['Club','Coordinator','Action'], (data.items||[]).map(c=>`<tr><td>${c.name}</td><td>${c.coordinator?.name||''}</td><td><button class="btn" data-join="${c._id}">Request membership</button></td></tr>`).join(''))}`;
  },
  async achievements() {
    const data = await Api.request('/achievements');
    return `<h2>Achievements</h2>
      <div class="card"><form id="achForm" class="form-grid">
        <label class="field">Title <input name="title" required /></label>
        <label class="field">Category <select name="category"><option>academic</option><option>hackathon</option><option>sports</option><option>cultural</option><option>certification</option></select></label>
        <label class="field">Description <input name="description" /></label>
        <button class="btn primary">Submit for verification</button></form></div>
      ${table(['Title','Category','Verified'], (data.items||[]).map(a=>`<tr><td>${a.title}</td><td>${a.category}</td><td>${a.verified}</td></tr>`).join(''))}`;
  },
  async polls() {
    const data = await Api.request('/polls');
    return `<h2>Polls & surveys</h2>${(data.items||[]).map(p=>`<div class="card"><h3>${p.title}</h3><p>${p.description||''}</p><button class="btn" data-poll="${p._id}">Submit sample response</button></div>`).join('') || '<div class="empty">No polls</div>'}`;
  },
  async idcard() {
    const data = await Api.request('/id');
    const c = data.card;
    return `<h2>Digital student ID</h2><div class="id-card">
      <h3>${c.name}</h3><p>ID ${c.studentId || 'pending'} · Sem ${c.semester || '-'} · ${c.section || ''}</p>
      <p>${c.isActive ? 'Active' : 'Deactivated'}</p>
      <img alt="QR verification code" src="${c.qr}" width="180" height="180" />
      <p class="muted">QR contains a short-lived signed token, not your private records.</p>
    </div>`;
  },
  async library() {
    const data = await Api.request('/library');
    const loans = await Api.request('/library/loans');
    const user = Api.user();
    return `<h2>Library</h2>
      <div class="filters"><input id="libQ" placeholder="Search title, author, ISBN" /></div>
      ${['admin','staff'].includes(user.role)?`<div class="card"><form id="bookForm" class="form-grid"><label class="field">Title <input name="title" required /></label><label class="field">Author <input name="author" /></label><label class="field">Copies <input name="copies" type="number" value="1" /></label><button class="btn primary">Add book</button></form></div>`:''}
      ${table(['Title','Author','Available'], (data.items||[]).map(b=>`<tr><td>${b.title}</td><td>${b.author||''}</td><td>${b.available}/${b.copies}</td></tr>`).join(''))}
      <div class="card"><h3>Loans</h3>${table(['Book','Due','Status'], (loans.items||[]).map(l=>`<tr><td>${l.book?.title||''}</td><td>${l.dueAt?new Date(l.dueAt).toLocaleDateString():''}</td><td>${badge(l.status)}</td></tr>`).join(''))}</div>`;
  },
  async hostel() {
    const data = await Api.request('/hostel');
    const user = Api.user();
    return `<h2>Hostel</h2>
      ${user.role==='student'?`<div class="card"><form id="hostelForm"><label class="field">Hostel ID <input name="hostel" /></label><label class="field">Reason <textarea name="reason"></textarea></label><button class="btn primary">Apply</button></form></div>`:''}
      ${table(['Hostel','Rooms'], (data.items||[]).map(h=>`<tr><td>${h.name}</td><td>${(h.rooms||[]).map(r=>r.number).join(', ')}</td></tr>`).join(''))}
      <h3>Applications</h3>${table(['Student','Status','Room'], (data.applications||[]).map(a=>`<tr><td>${a.student?.name||''}</td><td>${badge(a.status)}</td><td>${a.roomNumber||''}</td></tr>`).join(''))}`;
  },
  async transport() {
    const data = await Api.request('/transport');
    return `<h2>Transport</h2>
      <p class="muted">Schedules and allocations only. Live GPS is not included unless a real tracker is configured.</p>
      ${table(['Route','Stops','Schedule'], (data.items||[]).map(r=>`<tr><td>${r.name}</td><td>${(r.stops||[]).join(' → ')}</td><td>${r.schedule||''}</td></tr>`).join(''))}
      <div class="card"><form id="trForm"><label class="field">Route ID <input name="route" required /></label><label class="field">Stop <input name="stop" /></label><button class="btn primary">Register</button></form></div>`;
  },
  async support() {
    const data = await Api.request('/faqs');
    return `<h2>Support & FAQs</h2>
      <div class="filters"><input id="faqQ" placeholder="Search FAQs" /></div>
      ${(data.items||[]).map(f=>`<div class="card"><strong>${f.question}</strong><p>${f.answer}</p></div>`).join('')}
      <div class="card"><h3>Office contacts</h3>${(data.contacts||[]).map(c=>`<p>${c.office}: ${c.email || ''} ${c.phone||''}</p>`).join('') || 'Add contacts in admin seed.'}
      <form id="ticketForm"><label class="field">Subject <input name="subject" required /></label><label class="field">Details <textarea name="body"></textarea></label><button class="btn primary">Open support ticket</button></form></div>`;
  },
  async assistant() {
    return `<h2>CampusHub Assistant</h2>
      <p class="muted">Rule-based help using authorized records. It will not invent marks or private data.</p>
      <div class="card"><div class="chat" id="chat"></div>
      <form id="askForm" class="form-grid"><input name="message" placeholder="Ask about leave, documents, placements..." required /><button class="btn primary">Ask</button></form></div>`;
  },
  async students() {
    const data = await Api.request('/users');
    const students = (data.items || []).filter((u) => u.role === 'student');
    return `<h2>Students</h2>${table(['Name','Email','Student ID','Department','Semester','CGPA','Status'], students.map((u) => `<tr><td>${u.name}</td><td>${u.email}</td><td>${u.studentId || '-'}</td><td>${u.department?.name || u.department || '-'}</td><td>${u.semester || '-'}</td><td>${u.cgpa ?? '-'}</td><td>${u.isActive === false ? 'Inactive' : 'Active'}</td></tr>`).join('')) || '<div class="empty">No students found.</div>'}`;
  },
  async users() {
    const data = await Api.request('/users');
    return `<h2>Users</h2>${table(['ID','Name','Email','Role','Active'], (data.items||[]).map(u=>`<tr><td><code>${u._id}</code></td><td>${u.name}</td><td>${u.email}</td><td>${u.role}</td><td>${u.isActive}</td></tr>`).join(''))}`;
  },
  async admin() {
    const [deps, subjects] = await Promise.all([Api.request('/departments'), Api.request('/subjects')]);
    return `<h2>Academic setup</h2>
      <div class="card"><form id="depForm" class="form-grid"><label class="field">Department name <input name="name" required /></label><label class="field">Code <input name="code" required /></label><button class="btn primary">Add department</button></form></div>
      ${table(['Department','Code'], (deps.items||[]).map(d=>`<tr><td>${d.name}</td><td>${d.code}</td></tr>`).join(''))}
      <div class="card"><form id="subForm" class="form-grid"><label class="field">Subject <input name="name" required /></label><label class="field">Code <input name="code" required /></label><label class="field">Department ID <input name="department" required /></label><label class="field">Semester <input name="semester" type="number" /></label><button class="btn">Add subject</button></form></div>
      ${table(['Subject','Code','Sem'], (subjects.items||[]).map(s=>`<tr><td>${s.name}</td><td>${s.code}</td><td>${s.semester||''}</td></tr>`).join(''))}`;
  },
  async analytics() {
    const data = await Api.request('/analytics');
    return `<h2>Analytics</h2>
      <div class="grid cards">
        <div class="card"><canvas id="chartLeave"></canvas></div>
        <div class="card"><canvas id="chartIssue"></canvas></div>
        <div class="card"><canvas id="chartPlace"></canvas></div>
      </div>
      <script type="application/json" id="analytics-data">${JSON.stringify(data)}</script>`;
  },
  async settings() {
    const data = await Api.request('/settings');
    const s = data.settings || {};
    return `<h2>Institution settings</h2><div class="card"><form id="setForm">
      <label class="field">Institution name <input name="institutionName" value="${s.institutionName||''}" /></label>
      <label class="field">Attendance warning % <input name="attendanceWarningPercent" type="number" value="${s.attendanceWarningPercent||75}" /></label>
      <button class="btn primary">Save</button></form></div>`;
  }
};

function bindAuth(page) {
  if (page === 'login') {
    document.getElementById('loginForm').onsubmit = async (e) => {
      e.preventDefault();
      try {
        const body = formToJson(e.target);
        const res = await Api.request('/auth/login', { method: 'POST', body });
        Api.setSession(res.token, res.user);
        location.hash = '#dashboard';
      } catch (err) { toast(err.message); }
    };
  }
  if (page === 'register') {
    document.getElementById('regForm').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await Api.request('/auth/register', { method: 'POST', body: formToJson(e.target) });
        toast('Registered. You can log in.');
        location.hash = '#login';
      } catch (err) { toast(err.message); }
    };
  }
  if (page === 'forgot') {
    document.getElementById('forgotForm').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await Api.request('/auth/forgot', { method: 'POST', body: formToJson(e.target) });
        toast('If the account exists, a reset email was sent.');
      } catch (err) { toast(err.message); }
    };
  }
}

function chartFrom(id, label, rows) {
  const el = document.getElementById(id);
  if (!el || !window.Chart || !rows) return;
  new Chart(el, {
    type: 'doughnut',
    data: { labels: rows.map((r) => r._id), datasets: [{ data: rows.map((r) => r.count), backgroundColor: ['#0f4c81','#1a9b7a','#d68910','#c0392b','#7aa2d4'] }] },
    options: { plugins: { title: { display: true, text: label } } }
  });
}

async function bindPage(name) {
  const postForm = async (id, path, method = 'POST', extra) => {
    const form = document.getElementById(id);
    if (!form) return;
    form.onsubmit = async (e) => {
      e.preventDefault();
      try {
        const fd = new FormData(form);
        const hasFile = [...fd.values()].some((v) => v instanceof File && v.size);
        if (hasFile) await Api.request(path, { method, form: fd });
        else {
          const body = formToJson(form);
          if (extra) extra(body);
          await Api.request(path, { method, body });
        }
        toast('Saved');
        route();
      } catch (err) { toast(err.message); }
    };
  };
  postForm('leaveForm', '/leave');
  postForm('issueForm', '/issues');
  postForm('docForm', '/documents');
  postForm('resForm', '/resources');
  postForm('attForm', '/attendance');
  postForm('ttForm', '/timetable');
  postForm('markForm', '/marks', 'POST', (b) => { b.published = b.published === 'true'; b.marksObtained = Number(b.marksObtained); b.maxMarks = Number(b.maxMarks); });
  postForm('asgForm', '/assignments');
  postForm('eventForm', '/events');
  postForm('annForm', '/announcements');
  postForm('jobForm', '/opportunities');
  postForm('coForm', '/companies');
  postForm('schForm', '/scholarships');
  postForm('achForm', '/achievements');
  postForm('bookForm', '/library');
  postForm('hostelForm', '/hostel/apply');
  postForm('trForm', '/transport/register');
  postForm('ticketForm', '/support');
  postForm('depForm', '/departments');
  postForm('subForm', '/subjects');
  postForm('setForm', '/settings', 'PATCH', (b) => { b.attendanceWarningPercent = Number(b.attendanceWarningPercent); });
  const profileForm = document.getElementById('profileForm');
  if (profileForm) profileForm.onsubmit = async (e) => {
    e.preventDefault();
    const res = await Api.request('/auth/profile', { method: 'PATCH', body: formToJson(profileForm) });
    Api.setSession(Api.token(), res.user);
    toast('Profile updated');
  };
  const pwForm = document.getElementById('pwForm');
  if (pwForm) pwForm.onsubmit = async (e) => {
    e.preventDefault();
    try { await Api.request('/auth/password', { method: 'POST', body: formToJson(pwForm) }); toast('Password changed'); }
    catch (err) { toast(err.message); }
  };
  const careerForm = document.getElementById('careerForm');
  if (careerForm) careerForm.onsubmit = async (e) => {
    e.preventDefault();
    const body = formToJson(careerForm);
    body.skills = (body.skills || '').split(',').map((s) => s.trim()).filter(Boolean);
    await Api.request('/career', { method: 'PATCH', body });
    toast('Saved');
  };
  postForm('resumeForm', '/career/resume');
  document.getElementById('readAll')?.addEventListener('click', async () => { await Api.request('/notifications/read-all', { method: 'POST', body: {} }); route(); });
  document.querySelectorAll('[data-approve]').forEach((b) => b.onclick = async () => { await Api.request(`/leave/${b.dataset.approve}/review`, { method: 'POST', body: { status: 'approved' } }); route(); });
  document.querySelectorAll('[data-reject]').forEach((b) => b.onclick = async () => { await Api.request(`/leave/${b.dataset.reject}/review`, { method: 'POST', body: { status: 'rejected', comment: 'Rejected' } }); route(); });
  document.querySelectorAll('[data-file]').forEach((b) => b.onclick = () => Api.download(b.dataset.file).catch((e) => toast(e.message)));
  document.querySelectorAll('[data-reg-event]').forEach((b) => b.onclick = async () => { try { await Api.request(`/events/${b.dataset.regEvent}/register`, { method: 'POST', body: {} }); toast('Registered'); route(); } catch (e) { toast(e.message); } });
  document.querySelectorAll('[data-cancel-event]').forEach((b) => b.onclick = async () => { await Api.request(`/events/${b.dataset.cancelEvent}/cancel`, { method: 'POST', body: {} }); route(); });
  document.querySelectorAll('[data-apply]').forEach((b) => b.onclick = async () => { try { await Api.request(`/opportunities/${b.dataset.apply}/apply`, { method: 'POST', body: {} }); toast('Applied'); } catch (e) { toast(e.message); } });
  document.querySelectorAll('[data-sch]').forEach((b) => b.onclick = async () => { try { await Api.request(`/scholarships/${b.dataset.sch}/apply`, { method: 'POST', body: { statement: 'Please consider my application.' } }); toast('Applied'); } catch (e) { toast(e.message); } });
  document.querySelectorAll('[data-join]').forEach((b) => b.onclick = async () => { await Api.request(`/clubs/${b.dataset.join}/join`, { method: 'POST', body: {} }); toast('Requested'); });
  document.querySelectorAll('[data-poll]').forEach((b) => b.onclick = async () => { try { await Api.request(`/polls/${b.dataset.poll}/respond`, { method: 'POST', body: { answers: ['yes'] } }); toast('Recorded'); } catch (e) { toast(e.message); } });
  document.querySelectorAll('[data-grade]').forEach((b) => b.onclick = async () => {
    const marks = prompt('Marks');
    const feedback = prompt('Feedback') || '';
    if (marks == null) return;
    await Api.request(`/submissions/${b.dataset.grade}/grade`, { method: 'POST', body: { marks: Number(marks), feedback } });
    route();
  });
  document.querySelectorAll('form.upload-doc').forEach((form) => {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      try {
        if (form.dataset.doc) await Api.request(`/documents/${form.dataset.doc}`, { method: 'PATCH', form: fd });
        if (form.dataset.submit) await Api.request(`/assignments/${form.dataset.submit}/submit`, { method: 'POST', form: fd });
        toast('Uploaded');
        route();
      } catch (err) { toast(err.message); }
    };
  });
  const ask = document.getElementById('askForm');
  if (ask) {
    ask.onsubmit = async (e) => {
      e.preventDefault();
      const message = formToJson(ask).message;
      const chat = document.getElementById('chat');
      chat.innerHTML += `<div class="bubble me">${message}</div>`;
      const res = await Api.request('/assistant', { method: 'POST', body: { message } });
      chat.innerHTML += `<div class="bubble">${res.reply}<br><span class="muted">${res.disclaimer}</span></div>`;
      ask.reset();
    };
  }
  const analytics = document.getElementById('analytics-data');
  if (analytics) {
    const data = JSON.parse(analytics.textContent);
    chartFrom('chartLeave', 'Leave', data.leaves);
    chartFrom('chartIssue', 'Issues', data.issues);
    chartFrom('chartPlace', 'Placements', data.placements);
  }
}

async function route() {
  const hash = (location.hash || '#dashboard').replace('#', '').split('?')[0] || 'dashboard';
  const publicPages = ['login', 'register', 'forgot', 'reset', 'verify'];
  const user = Api.user();
  if (!user && !publicPages.includes(hash)) {
    location.hash = '#login';
    return;
  }
  if (publicPages.includes(hash)) {
    document.body.className = 'auth-body';
    root.innerHTML = (Pages[hash] || Pages.login)();
    bindAuth(hash);
    return;
  }
  document.body.className = '';
  root.innerHTML = shell(user, '<div class="loading">Loading…</div>');
  document.getElementById('logoutBtn').onclick = () => { Api.clear(); location.hash = '#login'; };
  document.getElementById('menuBtn').onclick = () => document.getElementById('sidebar').classList.toggle('open');
  document.querySelectorAll('.nav a').forEach((a) => { if (a.dataset.route === hash) a.classList.add('active'); });
  try {
    const html = routes[hash] ? await routes[hash]() : '<div class="error">Page not found</div>';
    document.getElementById('view').innerHTML = html;
    await bindPage(hash);
    if (hash === 'dashboard' && window.Chart) {
      try {
        const a = await Api.request('/analytics');
        chartFrom('chartMain', 'Requests', a.leaves);
      } catch { /* faculty may lack analytics */ }
    }
  } catch (err) {
    document.getElementById('view').innerHTML = `<div class="error">${err.message}</div>`;
  }
}

window.addEventListener('hashchange', route);
window.addEventListener('load', route);
window.addEventListener('online', () => document.body.classList.remove('offline'));
window.addEventListener('offline', () => document.body.classList.add('offline'));

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
let deferred;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e;
  const btn = document.getElementById('installBtn');
  if (btn) {
    btn.hidden = false;
    btn.onclick = () => deferred.prompt();
  }
});
