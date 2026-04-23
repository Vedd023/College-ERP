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
        <td><a href="#" onclick="FacultyModule.viewProfile('${f.id}');return false">${f.name}</a></td>
        <td>${f.department}</td>
        <td>${f.email}</td>
        <td>${(f.subjects || []).map(s => `<span class="badge badge-info" style="margin:2px">${s}</span>`).join(' ') || '—'}</td>
        <td>
          <button class="btn-icon btn-sm" onclick="FacultyModule.viewProfile('${f.id}')" title="View">👁️</button>
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
    // Dynamically inject password field for new faculty
    const formRow = document.createElement('div');
    formRow.className = 'form-row';
    formRow.id = 'adminFacultyPasswordRow';
    formRow.innerHTML = `
      <div class="form-group">
        <label>Account Password (for new faculty)</label>
        <input type="text" name="password" id="adminFacultyNewPassword" class="form-control" minlength="6">
      </div>
      <div></div>
    `;
    const form = document.getElementById('facultyForm');
    form.insertBefore(formRow, form.querySelector('.modal-footer'));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!Utils.validateForm('facultyForm')) return;
      const data = Utils.getFormData('facultyForm');
      const password = data.password;
      delete data.password;
      
      const subjectSelect = document.getElementById('subjectSelect');
      data.subjects = Array.from(subjectSelect.selectedOptions).map(o => o.value);
      
      try {
        const btn = document.querySelector('#facultyForm button[type="submit"]');
        btn.disabled = true;
        if (data.id) {
          await Store.updateItem('faculty', data.id, data);
          Utils.showToast('Faculty updated', 'success');
        } else {
          if (!password) {
            Utils.showToast('Password is required for new faculty', 'error');
            btn.disabled = false;
            return;
          }
          delete data.id;
          
          // 1. Create faculty record in Firestore
          let facultyRec;
          try {
            facultyRec = await Store.createItem('faculty', data);
            
            // 2. Create Firebase Auth user
            await Auth.adminCreateAccount(data.email, password, {
              name: data.name,
              role: 'faculty',
              linkedId: facultyRec.id
            });
            
            Utils.showToast('Faculty created successfully', 'success');
          } catch (createErr) {
            // Rollback if Auth fails
            if (facultyRec && facultyRec.id) {
              await Store.deleteItem('faculty', facultyRec.id);
            }
            throw createErr;
          }
        }
        Utils.closeModal('facultyModal');
        Utils.clearForm('facultyForm');
        renderTable();
      } catch (err) {
        console.error(err);
        Utils.showToast(err.message || 'Error saving faculty', 'error');
      } finally {
        document.querySelector('#facultyForm button[type="submit"]').disabled = false;
      }
    });
  }

  function openAddModal() {
    document.getElementById('facultyModalTitle').textContent = 'Add Faculty';
    Utils.clearForm('facultyForm');
    document.getElementById('adminFacultyPasswordRow').style.display = 'grid';
    document.getElementById('adminFacultyNewPassword').required = true;
    Utils.openModal('facultyModal');
  }

  async function openEditModal(id) {
    const fac = await Store.getItemById('faculty', id);
    if (!fac) return;
    document.getElementById('facultyModalTitle').textContent = 'Edit Faculty';
    Utils.populateForm('facultyForm', fac);
    const select = document.getElementById('subjectSelect');
    Array.from(select.options).forEach(opt => { opt.selected = (fac.subjects || []).includes(opt.value); });
    document.getElementById('adminFacultyPasswordRow').style.display = 'none';
    document.getElementById('adminFacultyNewPassword').required = false;
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

  async function viewProfile(id) {
    const fac = await Store.getItemById('faculty', id);
    if (!fac) return;

    const content = document.getElementById('facProfileContent');
    content.innerHTML = `
      <div class="stats-grid" style="margin-bottom:16px">
        <div class="stat-card">
          <div class="stat-icon purple">👩‍🏫</div>
          <div class="stat-info"><h4>${fac.facultyId}</h4><p>Faculty ID</p></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue">📚</div>
          <div class="stat-info"><h4>${(fac.subjects || []).length}</h4><p>Subjects</p></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">🏢</div>
          <div class="stat-info"><h4>${fac.department}</h4><p>Dept</p></div>
        </div>
      </div>
      <table style="width:100%;font-size:0.85rem;margin-bottom:16px">
        <tr><td style="padding:6px 0;color:var(--text-secondary)">Name</td><td style="padding:6px 0;font-weight:500">${fac.name}</td></tr>
        <tr><td style="padding:6px 0;color:var(--text-secondary)">Email</td><td style="padding:6px 0">${fac.email}</td></tr>
        <tr><td style="padding:6px 0;color:var(--text-secondary)">Phone</td><td style="padding:6px 0">${fac.phone || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:var(--text-secondary)">Gender</td><td style="padding:6px 0">${fac.gender || '—'}</td></tr>
      </table>
      <h4 style="margin-bottom:8px">Assigned Subjects</h4>
      <div class="tag-container" style="display:flex;flex-wrap:wrap;gap:8px">
        ${(fac.subjects || []).map(s => `<span class="badge badge-info">${s}</span>`).join('') || 'No subjects assigned'}
      </div>
    `;
    Utils.openModal('facProfileModal');
  }

  async function exportCSV() {
    const faculty = await Store.getItems('faculty');
    const data = faculty.map(f => ({ ...f, subjects: (f.subjects || []).join('; ') }));
    Utils.exportToCSV(data, 'faculty.csv');
  }

  return { init, openAddModal, openEditModal, confirmDelete, viewProfile, exportCSV };
})();
