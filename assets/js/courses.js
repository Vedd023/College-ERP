/**
 * College ERP — Courses Module (Firestore)
 */
const CoursesModule = (() => {
  let currentUser = null;

  async function init(user) {
    currentUser = user;
    await renderTable();
    await populateFacultySelect();
    setupSearch();
    setupForm();
    if (user.role !== 'admin') document.getElementById('courseActions').classList.add('hidden');
  }

  async function renderTable() {
    const [courses, faculty] = await Promise.all([
      Store.getItems('courses'),
      Store.getItems('faculty')
    ]);
    const tbody = document.getElementById('coursesTableBody');
    const isAdmin = currentUser.role === 'admin';
    tbody.innerHTML = courses.map(c => {
      const fac = faculty.find(f => f.id === c.facultyId);
      return `<tr>
        <td><span class="badge badge-neutral">${c.code}</span></td>
        <td>${c.name}</td><td>${c.credits}</td><td>${c.semester}</td><td>${c.department}</td>
        <td>${fac ? fac.name : '—'}</td>
        <td>${isAdmin ? `
          <button class="btn-icon btn-sm" onclick="CoursesModule.openEditModal('${c.id}')">✏️</button>
          <button class="btn-icon btn-sm" onclick="CoursesModule.deleteCourse('${c.id}')">🗑️</button>
        ` : '—'}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="7" class="text-center">No courses found</td></tr>';
  }

  async function populateFacultySelect() {
    const faculty = await Store.getItems('faculty');
    const select = document.getElementById('courseFacultySelect');
    faculty.forEach(f => { const o = document.createElement('option'); o.value = f.id; o.textContent = f.name; select.appendChild(o); });
  }

  function setupSearch() {
    document.getElementById('searchCourses').addEventListener('input', Utils.debounce(async () => {
      const q = document.getElementById('searchCourses').value.toLowerCase();
      const allCourses = await Store.getItems('courses');
      const courses = allCourses.filter(c => (c.name + c.code + c.department).toLowerCase().includes(q));
      const faculty = await Store.getItems('faculty');
      const tbody = document.getElementById('coursesTableBody');
      const isAdmin = currentUser.role === 'admin';
      tbody.innerHTML = courses.map(c => {
        const fac = faculty.find(f => f.id === c.facultyId);
        return `<tr><td><span class="badge badge-neutral">${c.code}</span></td><td>${c.name}</td><td>${c.credits}</td><td>${c.semester}</td><td>${c.department}</td><td>${fac ? fac.name : '—'}</td>
        <td>${isAdmin ? `<button class="btn-icon btn-sm" onclick="CoursesModule.openEditModal('${c.id}')">✏️</button><button class="btn-icon btn-sm" onclick="CoursesModule.deleteCourse('${c.id}')">🗑️</button>` : '—'}</td></tr>`;
      }).join('') || '<tr><td colspan="7" class="text-center">No courses found</td></tr>';
    }));
  }

  function setupForm() {
    document.getElementById('courseForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!Utils.validateForm('courseForm')) return;
      const data = Utils.getFormData('courseForm');
      data.credits = parseInt(data.credits) || 0;
      
      try {
        const btn = document.querySelector('#courseForm button[type="submit"]');
        btn.disabled = true;
        if (data.id) {
          await Store.updateItem('courses', data.id, data);
          Utils.showToast('Course updated', 'success');
        } else {
          delete data.id;
          await Store.createItem('courses', data);
          Utils.showToast('Course added', 'success');
        }
        Utils.closeModal('courseModal');
        Utils.clearForm('courseForm');
        renderTable();
      } catch (err) {
        Utils.showToast('Error saving course', 'error');
      } finally {
        document.querySelector('#courseForm button[type="submit"]').disabled = false;
      }
    });
  }

  function openAddModal() {
    document.getElementById('courseModalTitle').textContent = 'Add Course';
    Utils.clearForm('courseForm');
    Utils.openModal('courseModal');
  }

  async function openEditModal(id) {
    const course = await Store.getItemById('courses', id);
    if (!course) return;
    document.getElementById('courseModalTitle').textContent = 'Edit Course';
    Utils.populateForm('courseForm', course);
    Utils.openModal('courseModal');
  }

  async function deleteCourse(id) {
    if (confirm('Delete this course?')) {
      await Store.deleteItem('courses', id);
      Utils.showToast('Course deleted', 'success');
      renderTable();
    }
  }

  return { init, openAddModal, openEditModal, deleteCourse };
})();
