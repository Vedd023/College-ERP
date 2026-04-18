/**
 * College ERP — Faculty Module (Firestore)
 */
const FacultyModule = (() => {
  let deleteId = null;

  async function init(user) {
    await renderTable();
    await populateSubjectSelect();
    setupSearch();
    setupForm();
  }

  async function renderTable() {
    const faculty = await Store.getItems('faculty');
    const tbody = document.getElementById('facultyTableBody');
    tbody.innerHTML = faculty.map(f => `
      <tr>
        <td>${f.facultyId}</td>
        <td>${f.name}</td>
        <td>${f.department}</td>
        <td>${f.email}</td>
        <td>${(f.subjects || []).map(s => `<span class="badge badge-info" style="margin:2px">${s}</span>`).join(' ') || '—'}</td>
        <td>
          <button class="btn-icon btn-sm" onclick="FacultyModule.openEditModal('${f.id}')" title="Edit">✏️</button>
          <button class="btn-icon btn-sm" onclick="FacultyModule.confirmDelete('${f.id}')" title="Delete">🗑️</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="6" class="text-center">No faculty found</td></tr>';
  }

  async function populateSubjectSelect() {
    const courses = await Store.getItems('courses');
    const select = document.getElementById('subjectSelect');
    select.innerHTML = courses.map(c => `<option value="${c.code}">${c.code} — ${c.name}</option>`).join('');
  }

  function setupSearch() {
    document.getElementById('searchFaculty').addEventListener('input', Utils.debounce(async () => {
      const q = document.getElementById('searchFaculty').value.toLowerCase();
      const allFac = await Store.getItems('faculty');
      const faculty = allFac.filter(f => (f.name + f.facultyId + f.department).toLowerCase().includes(q));
      const tbody = document.getElementById('facultyTableBody');
      tbody.innerHTML = faculty.map(f => `
        <tr>
          <td>${f.facultyId}</td><td>${f.name}</td><td>${f.department}</td><td>${f.email}</td>
          <td>${(f.subjects || []).map(s => `<span class="badge badge-info" style="margin:2px">${s}</span>`).join(' ') || '—'}</td>
          <td>
            <button class="btn-icon btn-sm" onclick="FacultyModule.openEditModal('${f.id}')">✏️</button>
            <button class="btn-icon btn-sm" onclick="FacultyModule.confirmDelete('${f.id}')">🗑️</button>
          </td>
        </tr>
      `).join('') || '<tr><td colspan="6" class="text-center">No faculty found</td></tr>';
    }));
  }

  function setupForm() {
    document.getElementById('facultyForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!Utils.validateForm('facultyForm')) return;
      const data = Utils.getFormData('facultyForm');
      const subjectSelect = document.getElementById('subjectSelect');
      data.subjects = Array.from(subjectSelect.selectedOptions).map(o => o.value);
      
      try {
        const btn = document.querySelector('#facultyForm button[type="submit"]');
        btn.disabled = true;
        if (data.id) {
          await Store.updateItem('faculty', data.id, data);
          Utils.showToast('Faculty updated', 'success');
        } else {
          delete data.id;
          await Store.createItem('faculty', data);
          Utils.showToast('Faculty added', 'success');
        }
        Utils.closeModal('facultyModal');
        Utils.clearForm('facultyForm');
        renderTable();
      } catch (err) {
        Utils.showToast('Error saving faculty', 'error');
      } finally {
        document.querySelector('#facultyForm button[type="submit"]').disabled = false;
      }
    });
  }

  function openAddModal() {
    document.getElementById('facultyModalTitle').textContent = 'Add Faculty';
    Utils.clearForm('facultyForm');
    Utils.openModal('facultyModal');
  }

  async function openEditModal(id) {
    const fac = await Store.getItemById('faculty', id);
    if (!fac) return;
    document.getElementById('facultyModalTitle').textContent = 'Edit Faculty';
    Utils.populateForm('facultyForm', fac);
    const select = document.getElementById('subjectSelect');
    Array.from(select.options).forEach(opt => { opt.selected = (fac.subjects || []).includes(opt.value); });
    Utils.openModal('facultyModal');
  }

  function confirmDelete(id) {
    deleteId = id;
    Utils.openModal('deleteFacultyModal');
    document.getElementById('confirmDeleteFacultyBtn').onclick = async () => {
      await Store.deleteItem('faculty', deleteId);
      Utils.closeModal('deleteFacultyModal');
      Utils.showToast('Faculty deleted', 'success');
      renderTable();
    };
  }

  async function exportCSV() {
    const faculty = await Store.getItems('faculty');
    const data = faculty.map(f => ({ ...f, subjects: (f.subjects || []).join('; ') }));
    Utils.exportToCSV(data, 'faculty.csv');
  }

  return { init, openAddModal, openEditModal, confirmDelete, exportCSV };
})();
