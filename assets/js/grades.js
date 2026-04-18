/**
 * College ERP — Grades Module (Firestore)
 */
const GradesModule = (() => {
  let currentUser = null;
  let currentSubject = '';
  let currentExam = '';

  async function init(user) {
    currentUser = user;
    const container = document.getElementById('gradesContent');

    if (user.role === 'student') await renderStudentGrades(container, user);
    else await renderFacultyAdminView(container, user);
  }

  // ---- FACULTY & ADMIN ----
  async function renderFacultyAdminView(container, user) {
    const isFaculty = user.role === 'faculty';
    let subjectsHtml = '';

    if (isFaculty) {
      const fac = await Store.getItemById('faculty', user.linkedId);
      const mySubjects = fac ? fac.subjects : [];
      const courses = await Store.getItems('courses');
      const validCourses = courses.filter(c => mySubjects.includes(c.code));
      subjectsHtml = validCourses.map(c => `<option value="${c.code}">${c.code} — ${c.name}</option>`).join('');
    } else {
      const courses = await Store.getItems('courses');
      subjectsHtml = courses.map(c => `<option value="${c.code}">${c.code} — ${c.name}</option>`).join('');
    }

    container.innerHTML = `
      <div class="card mb-2">
        <div class="card-header"><h3>Grade Entry</h3></div>
        <div class="form-row mb-2">
          <div class="form-group">
            <label>Subject</label>
            <select id="gradeSubject" class="form-control">
              <option value="">Select Subject</option>
              ${subjectsHtml}
            </select>
          </div>
          <div class="form-group">
            <label>Exam Type</label>
            <select id="gradeExam" class="form-control">
              <option value="">Select</option>
              <option value="Mid-Term">Mid-Term</option>
              <option value="End-Term">End-Term</option>
              <option value="Quiz">Quiz</option>
              <option value="Assignment">Assignment</option>
            </select>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="toolbar">
          <div class="toolbar-left"><h3 style="margin:0">Student List</h3></div>
          <div class="toolbar-right">
            ${user.role === 'admin' ? `<button class="btn btn-secondary btn-sm" onclick="GradesModule.exportCSV()">Export CSV</button>` : ''}
            <button class="btn btn-primary btn-sm" id="saveGradesBtn" style="display:none" onclick="GradesModule.saveGrades()">Save Grades</button>
          </div>
        </div>
        <div class="table-wrapper">
          <table id="gradesTable">
            <thead><tr><th>ID</th><th>Name</th><th>Marks (0-100)</th><th>Grade</th></tr></thead>
            <tbody id="gradesTableBody"><tr><td colspan="4" class="text-center">Select subject and exam type to load students</td></tr></tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('gradeSubject').addEventListener('change', loadStudents);
    document.getElementById('gradeExam').addEventListener('change', loadStudents);
  }

  async function loadStudents() {
    currentSubject = document.getElementById('gradeSubject').value;
    currentExam = document.getElementById('gradeExam').value;
    const tbody = document.getElementById('gradesTableBody');
    const saveBtn = document.getElementById('saveGradesBtn');

    if (!currentSubject || !currentExam) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center">Select subject and exam type to load students</td></tr>';
      saveBtn.style.display = 'none';
      return;
    }

    const [allStudents, allGrades] = await Promise.all([
      Store.getItems('students'),
      Store.queryWhere('grades', 'subjectCode', '==', currentSubject)
    ]);
    
    const existingGrades = allGrades.filter(g => g.examType === currentExam);

    tbody.innerHTML = allStudents.map(s => {
      const g = existingGrades.find(r => r.studentId === s.id);
      const marks = g ? g.marks : '';
      const letter = g ? g.grade : '—';
      return `
        <tr data-student-id="${s.id}">
          <td>${s.studentId}</td>
          <td>${s.name}</td>
          <td style="width:150px">
            <input type="number" class="form-control" min="0" max="100" value="${marks}" placeholder="Marks" oninput="GradesModule.calcGrade(this)">
          </td>
          <td><span class="badge badge-info letter-grade">${letter}</span></td>
        </tr>
      `;
    }).join('');
    
    saveBtn.style.display = 'block';
  }

  function calcGrade(input) {
    const tr = input.closest('tr');
    const badge = tr.querySelector('.letter-grade');
    const marks = parseInt(input.value);
    if (isNaN(marks)) { badge.textContent = '—'; return; }
    
    let grade = 'F';
    if (marks >= 90) grade = 'A+';
    else if (marks >= 80) grade = 'A';
    else if (marks >= 70) grade = 'B';
    else if (marks >= 60) grade = 'C';
    else if (marks >= 50) grade = 'D';

    badge.textContent = grade;
  }

  async function saveGrades() {
    const btn = document.getElementById('saveGradesBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      const allGrades = await Store.queryWhere('grades', 'subjectCode', '==', currentSubject);
      const existing = allGrades.filter(g => g.examType === currentExam);
      
      // Delete existing
      for (const r of existing) await Store.deleteItem('grades', r.id);

      const rows = document.querySelectorAll('#gradesTableBody tr');
      let count = 0;
      for (const row of rows) {
        const studentId = row.dataset.studentId;
        const marks = parseInt(row.querySelector('input').value);
        const grade = row.querySelector('.letter-grade').textContent;
        if (!isNaN(marks)) {
          await Store.createItem('grades', { studentId, subjectCode: currentSubject, examType: currentExam, marks, grade });
          count++;
        }
      }

      Utils.showToast(`Saved ${count} grades successfully`, 'success');
    } catch (err) {
      Utils.showToast('Error saving grades', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Grades';
    }
  }

  // ---- STUDENT ----
  async function renderStudentGrades(container, user) {
    const grades = await Store.queryWhere('grades', 'studentId', '==', user.linkedId);
    
    container.innerHTML = `
      <div class="card">
        <div class="card-header"><h3>My Transcript</h3></div>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Subject</th><th>Exam</th><th>Marks</th><th>Grade</th></tr></thead>
            <tbody>${grades.map(g => `
              <tr><td>${g.subjectCode}</td><td>${g.examType}</td><td>${g.marks}</td><td><span class="badge badge-info">${g.grade}</span></td></tr>
            `).join('') || '<tr><td colspan="4" class="text-center">No grades published yet</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  async function exportCSV() {
    if (!currentSubject || !currentExam) {
      Utils.showToast('Select a subject and exam type first', 'error');
      return;
    }
    const grades = await Store.queryWhere('grades', 'subjectCode', '==', currentSubject);
    const specificGrades = grades.filter(g => g.examType === currentExam);
    Utils.exportToCSV(specificGrades, `grades_${currentSubject}_${currentExam}.csv`);
  }

  return { init, loadStudents, calcGrade, saveGrades, exportCSV };
})();
