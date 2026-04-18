/**
 * College ERP — Timetable Module (Firestore)
 * Admin and Faculty can add/edit/remove slots.
 */
const TimetableModule = (() => {
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const SLOTS = ['09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-01:00', '02:00-03:00', '03:00-04:00', '04:00-05:00', '05:00-06:00'];
  let currentUser = null;

  async function init(user) {
    currentUser = user;
    await populateSelects();
    await renderGrid();
    setupForm();
  }

  async function populateSelects() {
    const [courses, faculty] = await Promise.all([
      Store.getItems('courses'),
      Store.getItems('faculty')
    ]);
    const subjectSelect = document.getElementById('slotSubjectSelect');
    const facultySelect = document.getElementById('slotFacultySelect');
    if (subjectSelect) {
      subjectSelect.innerHTML = '<option value="">Select Subject</option>' + courses.map(c => `<option value="${c.code}">${c.code} — ${c.name}</option>`).join('');
    }
    if (facultySelect) {
      facultySelect.innerHTML = '<option value="">Select</option>' + faculty.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
    }
  }

  async function renderGrid() {
    const container = document.getElementById('timetableContent');
    let [timetable, courses, faculty] = await Promise.all([
      Store.getItems('timetable'),
      Store.getItems('courses'),
      Store.getItems('faculty')
    ]);
    
    // Both Admin and Faculty can edit
    const canEdit = currentUser.role === 'admin' || currentUser.role === 'faculty';

    // If Faculty, auto-assign their faculty ID when creating slots
    // If Student, only show their courses? (For now we show full timetable, could filter)

    const addBtn = canEdit ? `<button class="btn btn-primary btn-sm" onclick="TimetableModule.openAddModal()">+ Add Slot</button>` : '';

    container.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-left"><h3 style="margin:0">Weekly Schedule</h3></div>
        <div class="toolbar-right">${addBtn}</div>
      </div>
      <div class="card" style="overflow-x:auto">
        <div class="timetable-grid">
          <div class="timetable-cell header">Time</div>
          ${DAYS.map(d => `<div class="timetable-cell header">${d}</div>`).join('')}
          ${SLOTS.map(slot => {
            let html = `<div class="timetable-cell time">${slot}</div>`;
            DAYS.forEach(day => {
              const entry = timetable.find(t => t.day === day && t.slot === slot);
              if (entry) {
                const fac = faculty.find(f => f.id === entry.facultyId);
                html += `<div class="timetable-cell">
                  <div class="slot" ${canEdit ? `onclick="TimetableModule.openEditModal('${entry.id}')"` : ''}>
                    <strong>${entry.subjectCode}</strong><br>
                    <span style="font-size:0.65rem;color:var(--text-secondary)">${fac ? fac.name.split(' ').pop() : ''}</span><br>
                    <span style="font-size:0.65rem">${entry.room || ''}</span>
                  </div>
                </div>`;
              } else {
                html += `<div class="timetable-cell">${canEdit ? `<button class="btn btn-sm btn-secondary" style="font-size:0.65rem" onclick="TimetableModule.openAddModalWith('${day}','${slot}')">+</button>` : ''}</div>`;
              }
            });
            return html;
          }).join('')}
        </div>
      </div>
    `;
  }

  function setupForm() {
    const form = document.getElementById('slotForm');
    if (!form) return;
    
    // Add delete button to form dynamically
    const footer = document.querySelector('.modal-footer');
    if (!document.getElementById('deleteSlotBtn')) {
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn btn-secondary';
      delBtn.id = 'deleteSlotBtn';
      delBtn.style.display = 'none';
      delBtn.style.color = 'var(--danger)';
      delBtn.textContent = 'Delete Slot';
      delBtn.onclick = () => {
        const id = document.querySelector('#slotForm [name="id"]').value;
        if (id) deleteSlot(id);
      };
      footer.insertBefore(delBtn, footer.firstChild);
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!Utils.validateForm('slotForm')) return;
      const data = Utils.getFormData('slotForm');
      
      // Auto assign faculty ID if faculty is editing and field is blank
      if (currentUser.role === 'faculty' && !data.facultyId) {
        data.facultyId = currentUser.linkedId;
      }

      try {
        const btn = document.querySelector('#slotForm button[type="submit"]');
        btn.disabled = true;
        if (data.id) {
          await Store.updateItem('timetable', data.id, data);
          Utils.showToast('Slot updated', 'success');
        } else {
          delete data.id;
          await Store.createItem('timetable', data);
          Utils.showToast('Slot added', 'success');
        }
        Utils.closeModal('slotModal');
        Utils.clearForm('slotForm');
        renderGrid();
      } catch (err) {
        Utils.showToast('Error saving slot', 'error');
      } finally {
        document.querySelector('#slotForm button[type="submit"]').disabled = false;
      }
    });
  }

  function openAddModal() {
    document.getElementById('slotModalTitle').textContent = 'Add Slot';
    Utils.clearForm('slotForm');
    document.getElementById('deleteSlotBtn').style.display = 'none';
    
    // Auto-select faculty if user is faculty
    if (currentUser.role === 'faculty') {
      const select = document.querySelector('#slotForm [name="facultyId"]');
      if (select) select.value = currentUser.linkedId;
    }
    
    Utils.openModal('slotModal');
  }

  function openAddModalWith(day, slot) {
    openAddModal();
    const form = document.getElementById('slotForm');
    form.querySelector('[name="day"]').value = day;
    form.querySelector('[name="slot"]').value = slot;
  }

  async function openEditModal(id) {
    const entry = await Store.getItemById('timetable', id);
    if (!entry) return;
    document.getElementById('slotModalTitle').textContent = 'Edit Slot';
    Utils.populateForm('slotForm', entry);
    document.getElementById('deleteSlotBtn').style.display = 'block';
    Utils.openModal('slotModal');
  }

  async function deleteSlot(id) {
    if (confirm('Delete this timetable slot?')) {
      await Store.deleteItem('timetable', id);
      Utils.showToast('Slot removed', 'success');
      Utils.closeModal('slotModal');
      renderGrid();
    }
  }

  return { init, openAddModal, openAddModalWith, openEditModal, deleteSlot };
})();
