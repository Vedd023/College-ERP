/**
 * College ERP — Exams Module (Firestore)
 * Admin: schedule/edit/delete exams. Faculty/Student: view exams.
 */
const ExamsModule = (() => {
  let currentUser = null;

  async function init(user) {
    currentUser = user;
    await populateSubjectSelect();
    await renderTable();
    setupSearch();
    setupForm();
    if (user.role !== 'admin') {
      document.getElementById('examActions').classList.add('hidden');
    }
  }

  async function populateSubjectSelect() {
    const courses = await Store.getItems('courses');
    const select = document.getElementById('examSubjectSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Select</option>' + courses.map(c => `<option value="${c.code}">${c.code} — ${c.name}</option>`).join('');
  }

  async function renderTable() {
    let exams = await Store.getItems('exams');
    const isAdmin = currentUser.role === 'admin';

    // Sort by date
    exams.sort((a, b) => new Date(a.date) - new Date(b.date));

    const tbody = document.getElementById('examsTableBody');
    tbody.innerHTML = exams.map(e => {
      const isPast = new Date(e.date) < new Date();
      return `<tr style="${isPast ? 'opacity:0.5' : ''}">
        <td><span class="badge badge-neutral">${e.subjectCode}</span></td>
        <td>${e.examType}</td>
        <td>${Utils.formatDate(e.date)}</td>
        <td>${e.time}</td>
        <td>${e.room || '—'}</td>
        <td>${e.semester}</td>
        <td>${isAdmin ? `
          <button class="btn-icon btn-sm" onclick="ExamsModule.openEditModal('${e.id}')" title="Edit">✏️</button>
          <button class="btn-icon btn-sm" onclick="ExamsModule.deleteExam('${e.id}')" title="Delete">🗑️</button>
        ` : '—'}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="7" class="text-center">No exams scheduled</td></tr>';
  }

  function setupSearch() {
    document.getElementById('searchExams').addEventListener('input', Utils.debounce(async () => {
      const q = document.getElementById('searchExams').value.toLowerCase();
      const allExams = await Store.getItems('exams');
      const exams = allExams.filter(e => (e.subjectCode + e.examType + e.room).toLowerCase().includes(q));
      exams.sort((a, b) => new Date(a.date) - new Date(b.date));
      const tbody = document.getElementById('examsTableBody');
      const isAdmin = currentUser.role === 'admin';
      tbody.innerHTML = exams.map(e => {
        const isPast = new Date(e.date) < new Date();
        return `<tr style="${isPast ? 'opacity:0.5' : ''}"><td><span class="badge badge-neutral">${e.subjectCode}</span></td><td>${e.examType}</td><td>${Utils.formatDate(e.date)}</td><td>${e.time}</td><td>${e.room || '—'}</td><td>${e.semester}</td>
        <td>${isAdmin ? `<button class="btn-icon btn-sm" onclick="ExamsModule.openEditModal('${e.id}')">✏️</button><button class="btn-icon btn-sm" onclick="ExamsModule.deleteExam('${e.id}')">🗑️</button>` : '—'}</td></tr>`;
      }).join('') || '<tr><td colspan="7" class="text-center">No exams found</td></tr>';
    }));
  }

  function setupForm() {
    const form = document.getElementById('examForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!Utils.validateForm('examForm')) return;
      const data = Utils.getFormData('examForm');
      
      try {
        const btn = document.querySelector('#examForm button[type="submit"]');
        btn.disabled = true;
        if (data.id) {
          await Store.updateItem('exams', data.id, data);
          Utils.showToast('Exam updated', 'success');
        } else {
          delete data.id;
          await Store.createItem('exams', data);
          Utils.showToast('Exam scheduled', 'success');
        }
        Utils.closeModal('examModal');
        Utils.clearForm('examForm');
        renderTable();
      } catch (err) {
        Utils.showToast('Error saving exam', 'error');
      } finally {
        document.querySelector('#examForm button[type="submit"]').disabled = false;
      }
    });
  }

  function openAddModal() {
    document.getElementById('examModalTitle').textContent = 'Schedule Exam';
    Utils.clearForm('examForm');
    Utils.openModal('examModal');
  }

  async function openEditModal(id) {
    const exam = await Store.getItemById('exams', id);
    if (!exam) return;
    document.getElementById('examModalTitle').textContent = 'Edit Exam';
    Utils.populateForm('examForm', exam);
    Utils.openModal('examModal');
  }

  async function deleteExam(id) {
    if (confirm('Delete this exam?')) {
      await Store.deleteItem('exams', id);
      Utils.showToast('Exam deleted', 'success');
      renderTable();
    }
  }

  return { init, openAddModal, openEditModal, deleteExam };
})();
