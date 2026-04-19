/**
 * College ERP — Dashboard Module (Firestore)
 */
const DashboardModule = (() => {
  async function init(user) {
    const container = document.getElementById('dashboardContent');
    if (!container) return;

    if (user.role === 'admin') await renderAdminDashboard(container);
    else if (user.role === 'faculty') await renderFacultyDashboard(container, user);
    else if (user.role === 'student') await renderStudentDashboard(container, user);

    if (sessionStorage.getItem('justLoggedIn') === 'true') {
      sessionStorage.removeItem('justLoggedIn');
      let gender = 'Male'; // Default
      
      if (user.role === 'student' || user.role === 'faculty') {
         const profileData = await Store.getItemById(user.role === 'student' ? 'students' : 'faculty', user.linkedId);
         if (profileData && profileData.gender) {
             gender = profileData.gender;
         }
      }
      showWelcomeAnimation(gender);
    }
  }

  function showWelcomeAnimation(gender) {
    const overlay = document.createElement('div');
    overlay.className = 'welcome-animation-overlay';
    
    const container = document.createElement('div');
    container.className = 'welcome-character-container';
    
    const character = document.createElement('div');
    character.className = 'welcome-character';
    
    if (gender === 'Female') {
      character.innerHTML = '👩‍💼'; 
    } else {
      character.innerHTML = '👨‍💼'; 
    }
    
    container.appendChild(character);
    overlay.appendChild(container);
    document.body.appendChild(overlay);
    
    setTimeout(() => {
      if(overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 5500); 
  }

  // ---- ADMIN DASHBOARD ----
  async function renderAdminDashboard(container) {
    const [students, faculty, courses, attendance, fees] = await Promise.all([
      Store.getItems('students'),
      Store.getItems('faculty'),
      Store.getItems('courses'),
      Store.getItems('attendance'),
      Store.getItems('fees')
    ]);

    const totalPresent = attendance.filter(a => a.status === 'present').length;
    const attendancePct = attendance.length ? Math.round((totalPresent / attendance.length) * 100) : 0;

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">🎓</div>
          <div class="stat-info"><h4>${students.length}</h4><p>Total Students</p></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon purple">👩‍🏫</div>
          <div class="stat-info"><h4>${faculty.length}</h4><p>Total Faculty</p></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">📚</div>
          <div class="stat-info"><h4>${courses.length}</h4><p>Total Courses</p></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange">📅</div>
          <div class="stat-info"><h4>${attendancePct}%</h4><p>Avg Attendance</p></div>
        </div>
      </div>
      <div class="charts-grid">
        <div class="card chart-card">
          <div class="card-header"><h3>Attendance by Subject</h3></div>
          <canvas id="attendanceChart"></canvas>
        </div>
        <div class="card chart-card">
          <div class="card-header"><h3>Fee Collection</h3></div>
          <canvas id="feeChart"></canvas>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Recent Students</h3></div>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>ID</th><th>Name</th><th>Course</th><th>Semester</th></tr></thead>
            <tbody>${students.slice(-5).reverse().map(s => `
              <tr><td>${s.studentId}</td><td>${s.name}</td><td>${s.course}</td><td>${s.semester}</td></tr>
            `).join('')}</tbody>
          </table>
        </div>
      </div>
    `;

    // Attendance chart
    const subjectAttendance = {};
    courses.forEach(c => { subjectAttendance[c.code] = { present: 0, total: 0 }; });
    attendance.forEach(a => {
      if (subjectAttendance[a.subjectCode]) {
        subjectAttendance[a.subjectCode].total++;
        if (a.status === 'present') subjectAttendance[a.subjectCode].present++;
      }
    });
    const labels = Object.keys(subjectAttendance);
    const pcts = labels.map(l => subjectAttendance[l].total ? Math.round((subjectAttendance[l].present / subjectAttendance[l].total) * 100) : 0);

    new Chart(document.getElementById('attendanceChart'), {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Attendance %', data: pcts, backgroundColor: '#6366f1', borderRadius: 6 }] },
      options: { responsive: true, scales: { y: { beginAtZero: true, max: 100 } }, plugins: { legend: { display: false } } }
    });

    // Fee chart
    const paid = fees.filter(f => f.status === 'paid').length;
    const partial = fees.filter(f => f.status === 'partial').length;
    const unpaid = fees.filter(f => f.status === 'unpaid').length;
    new Chart(document.getElementById('feeChart'), {
      type: 'doughnut',
      data: { labels: ['Paid', 'Partial', 'Unpaid'], datasets: [{ data: [paid, partial, unpaid], backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'] }] },
      options: { responsive: true }
    });
  }

  // ---- FACULTY DASHBOARD ----
  async function renderFacultyDashboard(container, user) {
    const facultyProfile = await Store.getItemById('faculty', user.linkedId);
    const courses = await Store.getItems('courses');
    const myCourses = courses.filter(c => facultyProfile && facultyProfile.subjects.includes(c.code));

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon purple">📚</div>
          <div class="stat-info"><h4>${myCourses.length}</h4><p>Assigned Subjects</p></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue">📅</div>
          <div class="stat-info"><h4><a href="attendance.html" style="color:inherit">Mark Now →</a></h4><p>Quick Attendance</p></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">📝</div>
          <div class="stat-info"><h4><a href="grades.html" style="color:inherit">Submit →</a></h4><p>Grade Submission</p></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>My Subjects</h3></div>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Code</th><th>Name</th><th>Credits</th><th>Semester</th></tr></thead>
            <tbody>${myCourses.map(c => `
              <tr><td>${c.code}</td><td>${c.name}</td><td>${c.credits}</td><td>${c.semester}</td></tr>
            `).join('')}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ---- STUDENT DASHBOARD ----
  async function renderStudentDashboard(container, user) {
    const [attendance, grades, fees, exams, student] = await Promise.all([
      Store.queryWhere('attendance', 'studentId', '==', user.linkedId),
      Store.queryWhere('grades', 'studentId', '==', user.linkedId),
      Store.queryWhere('fees', 'studentId', '==', user.linkedId),
      Store.getItems('exams'),
      Store.getItemById('students', user.linkedId)
    ]);

    const present = attendance.filter(a => a.status === 'present').length;
    const attendancePct = attendance.length ? Math.round((present / attendance.length) * 100) : 0;
    const feeStatus = fees.length ? fees[fees.length - 1] : null;
    const myExams = student ? exams.filter(e => e.semester === student.semester) : [];
    const statusBadge = feeStatus ? `<span class="badge badge-${feeStatus.status === 'paid' ? 'success' : feeStatus.status === 'partial' ? 'warning' : 'danger'}">${feeStatus.status}</span>` : '<span class="badge badge-neutral">N/A</span>';

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">📅</div>
          <div class="stat-info"><h4>${attendancePct}%</h4><p>Attendance</p></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">📝</div>
          <div class="stat-info"><h4>${grades.length}</h4><p>Grades Recorded</p></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange">💰</div>
          <div class="stat-info"><h4>${statusBadge}</h4><p>Fee Status</p></div>
        </div>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3>My Grades</h3></div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Subject</th><th>Exam</th><th>Marks</th><th>Grade</th></tr></thead>
              <tbody>${grades.map(g => `
                <tr><td>${g.subjectCode}</td><td>${g.examType}</td><td>${g.marks}</td><td><span class="badge badge-info">${g.grade}</span></td></tr>
              `).join('') || '<tr><td colspan="4" class="text-center">No grades yet</td></tr>'}</tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Upcoming Exams</h3></div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Subject</th><th>Date</th><th>Time</th><th>Room</th></tr></thead>
              <tbody>${myExams.map(e => `
                <tr><td>${e.subjectCode}</td><td>${Utils.formatDate(e.date)}</td><td>${e.time}</td><td>${e.room}</td></tr>
              `).join('') || '<tr><td colspan="4" class="text-center">No upcoming exams</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  return { init };
})();
