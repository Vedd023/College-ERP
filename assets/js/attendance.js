/**
 * College ERP — Attendance Module (Firestore)
 */
const AttendanceModule = (() => {
  let currentUser = null;

  async function init(user) {
    currentUser = user;
    const container = document.getElementById('attendanceContent');
    if (user.role === 'faculty') await renderFacultyView(container, user);
    else if (user.role === 'admin') await renderAdminView(container);
    else if (user.role === 'student') await renderStudentView(container, user);
  }

  // ---- FACULTY: Mark Attendance ----
  async function renderFacultyView(container, user) {
    const faculty = await Store.getItemById('faculty', user.linkedId);
    const subjects = faculty ? faculty.subjects : [];
    const courses = await Store.getItems('courses');
    const mySubjects = courses.filter(c => subjects.includes(c.code));

    container.innerHTML = `
      <div class="card mb-2">
        <div class="card-header"><h3>Mark Attendance</h3></div>
        <div class="form-row mb-2">
          <div class="form-group">
            <label>Subject</label>
            <select id="attSubject" class="form-control">
              <option value="">Select Subject</option>
              ${mySubjects.map(s => `<option value="${s.code}">${s.code} — ${s.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Date</label>
            <input type="date" id="attDate" class="form-control" value="${Utils.today()}">
          </div>
        </div>
        <div id="attendanceGrid" class="attendance-grid"></div>
        <div class="mt-2" id="attActions" style="display:none">
          <button class="btn btn-primary" onclick="AttendanceModule.submitAttendance()" id="submitAttBtn">Submit Attendance</button>
          <button class="btn btn-secondary" onclick="AttendanceModule.markAllPresent()">Mark All Present</button>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Attendance Report</h3></div>
        <div id="reportContent"></div>
      </div>
    `;

    document.getElementById('attSubject').addEventListener('change', loadStudentsForAttendance);
    document.getElementById('attDate').addEventListener('change', loadStudentsForAttendance);
  }

  async function loadStudentsForAttendance() {
    const subjectCode = document.getElementById('attSubject').value;
    const date = document.getElementById('attDate').value;
    const grid = document.getElementById('attendanceGrid');
    const actions = document.getElementById('attActions');
    if (!subjectCode || !date) { grid.innerHTML = ''; actions.style.display = 'none'; return; }

    const [students, allRecords] = await Promise.all([
      Store.getItems('students'),
      Store.queryWhere('attendance', 'subjectCode', '==', subjectCode)
    ]);
    const existingRecords = allRecords.filter(a => a.date === date);

    grid.innerHTML = students.map(s => {
      const record = existingRecords.find(r => r.studentId === s.id);
      const status = record ? record.status : '';
      return `
        <div class="attendance-student-card ${status}" data-student-id="${s.id}" onclick="AttendanceModule.toggleAttendance(this)">
          <div class="student-name">${s.name}</div>
          <div class="student-id">${s.studentId}</div>
          <div class="status-label">${status || 'Not Marked'}</div>
        </div>
      `;
    }).join('');

    actions.style.display = 'flex';
    renderReport(subjectCode, students, allRecords);
  }

  function toggleAttendance(card) {
    if (card.classList.contains('present')) {
      card.classList.remove('present');
      card.classList.add('absent');
      card.querySelector('.status-label').textContent = 'Absent';
    } else if (card.classList.contains('absent')) {
      card.classList.remove('absent');
      card.querySelector('.status-label').textContent = 'Not Marked';
    } else {
      card.classList.add('present');
      card.querySelector('.status-label').textContent = 'Present';
    }
  }

  function markAllPresent() {
    document.querySelectorAll('.attendance-student-card').forEach(card => {
      card.classList.remove('absent');
      card.classList.add('present');
      card.querySelector('.status-label').textContent = 'Present';
    });
  }

  async function submitAttendance() {
    const subjectCode = document.getElementById('attSubject').value;
    const date = document.getElementById('attDate').value;
    if (!subjectCode || !date) return;

    const btn = document.getElementById('submitAttBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      const allRecords = await Store.queryWhere('attendance', 'subjectCode', '==', subjectCode);
      const existing = allRecords.filter(a => a.date === date);
      
      // We will execute deletions sequentially (or using batch if we refactor Store, but sequentially is fine for now)
      for (const r of existing) {
        await Store.deleteItem('attendance', r.id);
      }

      const cards = document.querySelectorAll('.attendance-student-card');
      let count = 0;
      for (const card of cards) {
        const studentId = card.dataset.studentId;
        let status = '';
        if (card.classList.contains('present')) status = 'present';
        else if (card.classList.contains('absent')) status = 'absent';
        if (status) {
          await Store.createItem('attendance', { studentId, subjectCode, date, status });
          count++;
        }
      }

      Utils.showToast(`Attendance saved for ${count} students`, 'success');
      
      // Reload report
      const [newStudents, newRecords] = await Promise.all([
        Store.getItems('students'),
        Store.queryWhere('attendance', 'subjectCode', '==', subjectCode)
      ]);
      renderReport(subjectCode, newStudents, newRecords);
    } catch (err) {
      Utils.showToast('Error saving attendance', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit Attendance';
    }
  }

  function renderReport(subjectCode, students, records) {
    const reportDiv = document.getElementById('reportContent');
    if (!reportDiv) return;

    const studentStats = students.map(s => {
      const studentRecords = records.filter(r => r.studentId === s.id);
      const present = studentRecords.filter(r => r.status === 'present').length;
      const total = studentRecords.length;
      const pct = total ? Math.round((present / total) * 100) : 0;
      return { name: s.name, id: s.studentId, present, total, pct };
    }).filter(s => s.total > 0);

    reportDiv.innerHTML = studentStats.length ? `
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Student</th><th>ID</th><th>Present</th><th>Total</th><th>%</th></tr></thead>
          <tbody>${studentStats.map(s => `
            <tr>
              <td>${s.name}</td><td>${s.id}</td><td>${s.present}</td><td>${s.total}</td>
              <td><span class="badge badge-${s.pct >= 75 ? 'success' : s.pct >= 50 ? 'warning' : 'danger'}">${s.pct}%</span></td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    ` : '<div class="empty-state"><p>No attendance records for this subject yet.</p></div>';
  }

  // ---- ADMIN: Reports ----
  async function renderAdminView(container) {
    const courses = await Store.getItems('courses');
    container.innerHTML = `
      <div class="card mb-2">
        <div class="card-header"><h3>Attendance Reports</h3></div>
        <div class="form-row mb-2">
          <div class="form-group">
            <label>Subject</label>
            <select id="reportSubject" class="form-control">
              <option value="">Select Subject</option>
              ${courses.map(c => `<option value="${c.code}">${c.code} — ${c.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div id="adminReportContent"></div>
      </div>
    `;
    document.getElementById('reportSubject').addEventListener('change', async () => {
      const code = document.getElementById('reportSubject').value;
      if (!code) { document.getElementById('adminReportContent').innerHTML = ''; return; }
      
      const [students, records] = await Promise.all([
        Store.getItems('students'),
        Store.queryWhere('attendance', 'subjectCode', '==', code)
      ]);
      
      const stats = students.map(s => {
        const sr = records.filter(r => r.studentId === s.id);
        const p = sr.filter(r => r.status === 'present').length;
        return { name: s.name, id: s.studentId, present: p, total: sr.length, pct: sr.length ? Math.round((p / sr.length) * 100) : 0 };
      }).filter(s => s.total > 0);
      
      document.getElementById('adminReportContent').innerHTML = stats.length ? `
        <div class="table-wrapper"><table>
          <thead><tr><th>Student</th><th>ID</th><th>Present</th><th>Total</th><th>%</th></tr></thead>
          <tbody>${stats.map(s => `<tr><td>${s.name}</td><td>${s.id}</td><td>${s.present}</td><td>${s.total}</td>
            <td><span class="badge badge-${s.pct >= 75 ? 'success' : s.pct >= 50 ? 'warning' : 'danger'}">${s.pct}%</span></td></tr>`).join('')}</tbody>
        </table></div>
      ` : '<div class="empty-state"><p>No records found.</p></div>';
    });
  }

  // ---- STUDENT: Own Attendance ----
  async function renderStudentView(container, user) {
    const [attendance, courses] = await Promise.all([
      Store.queryWhere('attendance', 'studentId', '==', user.linkedId),
      Store.getItems('courses')
    ]);

    // Group by subject
    const bySubject = {};
    attendance.forEach(a => {
      if (!bySubject[a.subjectCode]) bySubject[a.subjectCode] = { present: 0, absent: 0, total: 0 };
      bySubject[a.subjectCode].total++;
      if (a.status === 'present') bySubject[a.subjectCode].present++;
      else bySubject[a.subjectCode].absent++;
    });

    const totalPresent = attendance.filter(a => a.status === 'present').length;
    const overallPct = attendance.length ? Math.round((totalPresent / attendance.length) * 100) : 0;

    container.innerHTML = `
      <div class="stats-grid mb-2">
        <div class="stat-card">
          <div class="stat-icon blue">📅</div>
          <div class="stat-info"><h4>${overallPct}%</h4><p>Overall Attendance</p></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">✓</div>
          <div class="stat-info"><h4>${totalPresent}</h4><p>Classes Attended</p></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red">✕</div>
          <div class="stat-info"><h4>${attendance.length - totalPresent}</h4><p>Classes Missed</p></div>
        </div>
      </div>
      <div class="card mb-2">
        <div class="card-header"><h3>Subject-wise Attendance</h3></div>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Subject</th><th>Present</th><th>Absent</th><th>Total</th><th>Percentage</th></tr></thead>
            <tbody>${Object.entries(bySubject).map(([code, data]) => {
              const pct = Math.round((data.present / data.total) * 100);
              const courseName = courses.find(c => c.code === code);
              return `<tr><td>${code}${courseName ? ' — ' + courseName.name : ''}</td><td>${data.present}</td><td>${data.absent}</td><td>${data.total}</td>
                <td><span class="badge badge-${pct >= 75 ? 'success' : pct >= 50 ? 'warning' : 'danger'}">${pct}%</span></td></tr>`;
            }).join('')}</tbody>
          </table>
        </div>
      </div>
      <div class="card chart-card">
        <div class="card-header"><h3>Attendance Overview</h3></div>
        <canvas id="studentAttChart"></canvas>
      </div>
    `;

    // Chart
    const labels = Object.keys(bySubject);
    const pcts = labels.map(l => Math.round((bySubject[l].present / bySubject[l].total) * 100));
    if (labels.length) {
      new Chart(document.getElementById('studentAttChart'), {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Attendance %', data: pcts, backgroundColor: '#6366f1', borderRadius: 6 }] },
        options: { responsive: true, scales: { y: { beginAtZero: true, max: 100 } }, plugins: { legend: { display: false } } }
      });
    }
  }

  return { init, toggleAttendance, markAllPresent, submitAttendance };
})();
