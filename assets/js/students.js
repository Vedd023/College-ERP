/**
 * College ERP — Students Module (Firestore)
 */
const StudentsModule = (() => {
  let currentUser = null;
  let deleteId = null;

  async function init(user) {
    currentUser = user;
    if (user.role === 'student') {
      document.getElementById('studentActions').classList.add('hidden');
      const s = await Store.getItemById('students', user.linkedId);
      renderTable(s ? [s] : []);
    } else {
      await renderTable();
      await populateFilters();
      setupSearch();
      setupForm();
    }
  }

  async function renderTable(data) {
    const students = data || await Store.getItems('students');
    const tbody = document.getElementById('studentsTableBody');
    const isAdmin = currentUser.role === 'admin';

    tbody.innerHTML = students.map(s => `
      <tr>
        <td>${s.studentId}</td>
        <td><a href="#" onclick="StudentsModule.viewProfile('${s.id}');return false">${s.name}</a></td>
        <td>${s.course}</td>
        <td>${s.semester}</td>
        <td>${s.email}</td>
        <td>${s.phone}</td>
        <td>
          <button class="btn-icon btn-sm" onclick="StudentsModule.viewProfile('${s.id}')" title="View">👁</button>
          ${isAdmin ? `
            <button class="btn-icon btn-sm" onclick="StudentsModule.openEditModal('${s.id}')" title="Edit">✏️</button>
            <button class="btn-icon btn-sm" onclick="StudentsModule.confirmDelete('${s.id}')" title="Delete">🗑️</button>
          ` : ''}
        </td>
      </tr>
    `).join('') || '<tr><td colspan="7" class="text-center">No students found</td></tr>';
  }

  async function populateFilters() {
    const students = await Store.getItems('students');
    const courses = [...new Set(students.map(s => s.course))];
    const select = document.getElementById('filterCourse');
    select.innerHTML = '<option value="">All Courses</option>';
    courses.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c; opt.textContent = c;
      select.appendChild(opt);
    });
    select.addEventListener('change', applyFilter);
  }

  async function applyFilter() {
    const course = document.getElementById('filterCourse').value;
    const search = document.getElementById('searchStudents').value.toLowerCase();
    let students = await Store.getItems('students');
    if (course) students = students.filter(s => s.course === course);
    if (search) students = students.filter(s => (s.name + s.studentId + s.email).toLowerCase().includes(search));
    renderTable(students);
  }

  function setupSearch() {
    document.getElementById('searchStudents').addEventListener('input', Utils.debounce(applyFilter));
  }

  function setupForm() {
    // We add a password field to the form dynamically if admin is creating a student
    const formRow = document.createElement('div');
    formRow.className = 'form-row';
    formRow.id = 'adminPasswordRow';
    formRow.innerHTML = `
      <div class="form-group">
        <label>Account Password (for new student)</label>
        <input type="text" name="password" id="adminNewPassword" class="form-control" minlength="6">
      </div>
      <div></div>
    `;
    document.getElementById('studentForm').insertBefore(formRow, document.querySelector('.modal-footer'));

    document.getElementById('studentForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!Utils.validateForm('studentForm')) return;
      const data = Utils.getFormData('studentForm');
      const password = data.password;
      delete data.password;

      try {
        const btn = document.querySelector('#studentForm button[type="submit"]');
        btn.disabled = true;

        if (data.id) {
          // Edit
          await Store.updateItem('students', data.id, data);
          Utils.showToast('Student updated successfully', 'success');
        } else {
          // Add - Admin creating student account
          if (!password) {
            Utils.showToast('Password is required for new students', 'error');
            btn.disabled = false;
            return;
          }
          delete data.id;
          
          // 1. Create student record
          const studentRec = await Store.createItem('students', data);
          
          // 2. Create Auth Account + Profile
          await Auth.adminCreateAccount(data.email, password, {
            name: data.name,
            role: 'student',
            linkedId: studentRec.id
          });
          Utils.showToast('Student created successfully', 'success');
        }
        Utils.closeModal('studentModal');
        Utils.clearForm('studentForm');
        renderTable();
      } catch (err) {
        Utils.showToast(err.message || 'Error saving student', 'error');
      } finally {
        document.querySelector('#studentForm button[type="submit"]').disabled = false;
      }
    });
  }

  function openAddModal() {
    document.getElementById('studentModalTitle').textContent = 'Add Student';
    Utils.clearForm('studentForm');
    document.getElementById('adminPasswordRow').style.display = 'grid';
    document.getElementById('adminNewPassword').required = true;
    Utils.openModal('studentModal');
  }

  async function openEditModal(id) {
    const student = await Store.getItemById('students', id);
    if (!student) return;
    document.getElementById('studentModalTitle').textContent = 'Edit Student';
    Utils.populateForm('studentForm', student);
    document.getElementById('adminPasswordRow').style.display = 'none';
    document.getElementById('adminNewPassword').required = false;
    Utils.openModal('studentModal');
  }

  function confirmDelete(id) {
    deleteId = id;
    Utils.openModal('deleteModal');
    document.getElementById('confirmDeleteBtn').onclick = async () => {
      // Note: We delete the student record. Deleting the Firebase Auth user requires Admin SDK.
      await Store.deleteItem('students', deleteId);
      Utils.closeModal('deleteModal');
      Utils.showToast('Student deleted', 'success');
      renderTable();
    };
  }

  async function viewProfile(id) {
    const student = await Store.getItemById('students', id);
    if (!student) return;

    const [attendance, grades, fees] = await Promise.all([
      Store.queryWhere('attendance', 'studentId', '==', id),
      Store.queryWhere('grades', 'studentId', '==', id),
      Store.queryWhere('fees', 'studentId', '==', id)
    ]);

    const present = attendance.filter(a => a.status === 'present').length;
    const attPct = attendance.length ? Math.round((present / attendance.length) * 100) : 0;
    const latestFee = fees.length ? fees[fees.length - 1] : null;

    const profileContent = document.getElementById('profileContent');
    profileContent.innerHTML = `
      <div class="stats-grid" style="margin-bottom:16px">
        <div class="stat-card">
          <div class="stat-icon blue">📅</div>
          <div class="stat-info"><h4>${attPct}%</h4><p>Attendance</p></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">📝</div>
          <div class="stat-info"><h4>${grades.length}</h4><p>Grades</p></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange">💰</div>
          <div class="stat-info">
            <h4>${latestFee ? `<span class="badge badge-${latestFee.status === 'paid' ? 'success' : latestFee.status === 'partial' ? 'warning' : 'danger'}">${latestFee.status}</span>` : 'N/A'}</h4>
            <p>Fee Status</p>
          </div>
        </div>
      </div>
      <table style="width:100%;font-size:0.85rem;margin-bottom:16px">
        <tr><td style="padding:6px 0;color:var(--text-secondary)">Name</td><td style="padding:6px 0;font-weight:500">${student.name}</td></tr>
        <tr><td style="padding:6px 0;color:var(--text-secondary)">Student ID</td><td style="padding:6px 0">${student.studentId}</td></tr>
        <tr><td style="padding:6px 0;color:var(--text-secondary)">Course</td><td style="padding:6px 0">${student.course}</td></tr>
        <tr><td style="padding:6px 0;color:var(--text-secondary)">Semester</td><td style="padding:6px 0">${student.semester}</td></tr>
        <tr><td style="padding:6px 0;color:var(--text-secondary)">Email</td><td style="padding:6px 0">${student.email}</td></tr>
        <tr><td style="padding:6px 0;color:var(--text-secondary)">Phone</td><td style="padding:6px 0">${student.phone}</td></tr>
      </table>
      ${grades.length ? `
        <h4 style="margin-bottom:8px">Grades</h4>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Subject</th><th>Exam</th><th>Marks</th><th>Grade</th></tr></thead>
            <tbody>${grades.map(g => `<tr><td>${g.subjectCode}</td><td>${g.examType}</td><td>${g.marks}</td><td><span class="badge badge-info">${g.grade}</span></td></tr>`).join('')}</tbody>
          </table>
        </div>
      ` : ''}
    `;
    Utils.openModal('profileModal');
  }

  async function exportCSV() {
    Utils.exportToCSV(await Store.getItems('students'), 'students.csv');
  }

  return { init, openAddModal, openEditModal, confirmDelete, viewProfile, exportCSV };
})();
