/**
 * College ERP — Assignments Module
 */
const AssignmentsModule = (() => {
  let currentUser = null;
  const defaultAssignments = [
    { id: 'asm1', title: 'Data Structures Mini-Project', course: 'B.Tech CSE', due: '2026-05-10', desc: 'Implement a binary search tree in C++' },
    { id: 'asm2', title: 'Database Design Schema', course: 'B.Tech CSE', due: '2026-05-15', desc: 'Create an ER diagram for a library system' },
    { id: 'asm3', title: 'Marketing Case Study', course: 'MBA', due: '2026-05-12', desc: 'Analyze the digital marketing strategy of Nike' },
  ];

  function getAssignments() {
    const stored = JSON.parse(localStorage.getItem('erp_assignments') || '[]');
    return [...defaultAssignments, ...stored];
  }

  function init(user) {
    currentUser = user;
    renderHeader();
    renderAssignments();
    loadSubmissions();
    setupForm();
  }

  function renderHeader() {
    const actions = document.getElementById('assignmentActions');
    if (currentUser.role === 'student') {
      actions.innerHTML = `<button class="btn btn-primary btn-sm" onclick="Utils.openModal('submitModal')">+ New Submission</button>`;
      document.getElementById('roleTitle').textContent = 'My Assignments';
    } else {
      actions.innerHTML = `<button class="btn btn-primary btn-sm" onclick="AssignmentsModule.openCreateModal()">+ Create Assignment</button>`;
      document.getElementById('roleTitle').textContent = 'All Student Submissions';
    }
  }

  function renderAssignments() {
    const container = document.getElementById('assignmentsContainer');
    const all = getAssignments();
    const filtered = all.filter(a => currentUser.role !== 'student' || a.course === currentUser.course || !currentUser.course);

    if (filtered.length === 0) {
      container.innerHTML = '<div class="card stat-card" style="grid-column: 1/-1">No assignments available.</div>';
    } else {
      container.innerHTML = filtered.map(a => {
        const isStudent = currentUser.role === 'student';
        const submission = isStudent ? getStudentSubmission(a.id) : null;
        
        return `
          <div class="card stat-card" ${!isStudent ? `style="cursor:pointer" onclick="AssignmentsModule.openEditModal('${a.id}')"` : ''}>
            <div class="stat-icon purple">📂</div>
            <div class="stat-info" style="flex:1">
              <h4>${a.title}</h4>
              <p>${a.course} • Due: ${a.due}</p>
              ${a.link ? `
                <div style="margin-top:4px">
                  <a href="${a.link}" target="_blank" style="font-size:0.8rem;color:var(--primary);text-decoration:underline">📄 View Assignment Brief</a>
                </div>
              ` : ''}
              ${submission ? `
                <div style="margin-top:8px; font-size:0.8rem">
                  <span class="badge badge-success">✓ Submitted</span>
                  <a href="${submission.driveLink}" target="_blank" style="margin-left:8px;color:var(--info)">View Link</a>
                </div>
              ` : ''}
            </div>
            ${isStudent && !submission ? `
              <button class="btn btn-primary btn-sm" onclick="AssignmentsModule.openSubmitModal('${a.id}')">Submit</button>
            ` : ''}
          </div>
        `;
      }).join('');
    }

    // Populate select for submission modal
    const select = document.getElementById('as_assignment');
    if (select) {
      select.innerHTML = '<option value="">Select Assignment</option>' + 
        filtered.map(a => `<option value="${a.id}">${a.title}</option>`).join('');
    }
  }

  async function loadSubmissions() {
    const tbody = document.getElementById('submissionsTableBody');
    // In real app, fetch from Firestore. Here we use localStorage for persistence in session
    const submissions = JSON.parse(localStorage.getItem('erp_submissions') || '[]');
    
    let filtered = submissions;
    if (currentUser.role === 'student') {
      filtered = submissions.filter(s => s.studentId === currentUser.uid);
    }

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No submissions found</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(s => `
      <tr>
        <td>${getAssignmentTitle(s.assignmentId)}</td>
        <td>${s.studentName}</td>
        <td><a href="${s.driveLink}" target="_blank" class="badge badge-info">View Drive Link</a></td>
        <td><span class="submission-status" style="background:#dcfce7;color:#15803d">Submitted</span></td>
        <td>${new Date(s.timestamp).toLocaleDateString()}</td>
        <td>
          ${currentUser.role !== 'student' ? '<button class="btn btn-sm btn-secondary">Review</button>' : ''}
        </td>
      </tr>
    `).join('');
  }

  function getAssignmentTitle(id) {
    const all = getAssignments();
    const a = all.find(x => x.id === id);
    return a ? a.title : 'Unknown Assignment';
  }

  function getStudentSubmission(assignmentId) {
    const submissions = JSON.parse(localStorage.getItem('erp_submissions') || '[]');
    return submissions.find(s => s.assignmentId === assignmentId && s.studentId === currentUser.uid);
  }

  function openSubmitModal(assignmentId) {
    const select = document.getElementById('as_assignment');
    if (select && assignmentId) {
      select.value = assignmentId;
    }
    Utils.openModal('submitModal');
  }

  function openCreateModal() {
    const modal = document.getElementById('createModal');
    modal.querySelector('h3').textContent = 'Create New Assignment';
    modal.querySelector('.btn-primary').textContent = 'Create Assignment';
    const form = document.getElementById('createAssignmentForm');
    form.reset();
    delete form.dataset.editId;
    Utils.openModal('createModal');
  }

  function openEditModal(id) {
    if (currentUser.role === 'student') return;
    
    const all = getAssignments();
    const a = all.find(x => x.id === id);
    if (!a) return;

    // We can't edit default assignments in this mock setup easily without saving them all to localStorage
    // But for the sake of the demo, we'll allow it by saving the edit to localStorage
    
    const modal = document.getElementById('createModal');
    modal.querySelector('h3').textContent = 'Edit Assignment';
    modal.querySelector('.btn-primary').textContent = 'Update Assignment';
    
    const form = document.getElementById('createAssignmentForm');
    form.dataset.editId = id;
    form.title.value = a.title;
    form.course.value = a.course;
    form.due.value = a.due;
    form.link.value = a.link || '';
    form.desc.value = a.desc || '';

    Utils.openModal('createModal');
  }

  function setupForm() {
    const form = document.getElementById('submissionForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = {
        assignmentId: formData.get('assignmentId'),
        driveLink: formData.get('driveLink'),
        studentId: currentUser.uid,
        studentName: currentUser.name,
        timestamp: new Date().toISOString()
      };

      // Save to localStorage
      const submissions = JSON.parse(localStorage.getItem('erp_submissions') || '[]');
      submissions.push(data);
      localStorage.setItem('erp_submissions', JSON.stringify(submissions));

      Utils.showToast('Assignment submitted successfully!', 'success');
      Utils.closeModal('submitModal');
      form.reset();
      loadSubmissions();
    });

    // Create Assignment Form
    const cForm = document.getElementById('createAssignmentForm');
    if (cForm) {
      cForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(cForm);
        const editId = cForm.dataset.editId;
        
        const data = {
          title: formData.get('title'),
          course: formData.get('course'),
          due: formData.get('due'),
          link: formData.get('link'),
          desc: formData.get('desc')
        };

        const stored = JSON.parse(localStorage.getItem('erp_assignments') || '[]');
        
        if (editId) {
          // Editing existing (could be default or stored)
          const index = stored.findIndex(x => x.id === editId);
          if (index !== -1) {
            stored[index] = { ...stored[index], ...data };
          } else {
            // If it was a default assignment, add it to stored as an override
            stored.push({ id: editId, ...data });
          }
          Utils.showToast('Assignment updated successfully!', 'success');
        } else {
          // Creating new
          stored.push({ id: 'asm_' + Date.now(), ...data });
          Utils.showToast('Assignment created successfully!', 'success');
        }

        localStorage.setItem('erp_assignments', JSON.stringify(stored));
        Utils.closeModal('createModal');
        cForm.reset();
        delete cForm.dataset.editId;
        renderAssignments();
      });
    }
  }

  return { init, openEditModal, openCreateModal, openSubmitModal };
})();
