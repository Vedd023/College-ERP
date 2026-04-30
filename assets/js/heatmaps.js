/**
 * College ERP — Student Heatmaps Module
 * Dedicated page for Admins/Faculty to view individual student attendance heatmaps.
 */
const HeatmapsModule = (() => {
  let currentUser = null;

  async function init(user) {
    currentUser = user;
    const container = document.getElementById('heatmapsContent');
    if (!container) return;

    await renderView(container);
  }

  async function renderView(container) {
    container.innerHTML = `
      <div class="toolbar mb-2">
        <div class="toolbar-left">
          <input type="text" class="search-input" id="searchStudent" placeholder="Search students...">
          <select class="form-control" id="studentSelect" style="width:auto">
            <option value="">-- Choose a Student --</option>
          </select>
        </div>
      </div>
      <div class="card" id="heatmapContainerCard" style="display: none;">
        <div class="card-header"><h3 id="studentNameTitle">Student Heatmap</h3></div>
        <div id="heatmapViewer"></div>
      </div>
    `;

    const students = await Store.getItems('students');
    const select = document.getElementById('studentSelect');
    const search = document.getElementById('searchStudent');

    function populateSelect(filter = '') {
      select.innerHTML = '<option value="">-- Choose a Student --</option>';
      const filtered = students.filter(s => (s.name + ' ' + s.studentId).toLowerCase().includes(filter.toLowerCase()));
      filtered.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.name} (${s.studentId})`;
        select.appendChild(opt);
      });
    }

    populateSelect();

    search.addEventListener('input', (e) => populateSelect(e.target.value));

    select.addEventListener('change', async (e) => {
      const studentId = e.target.value;
      const card = document.getElementById('heatmapContainerCard');
      const viewer = document.getElementById('heatmapViewer');
      const title = document.getElementById('studentNameTitle');

      if (!studentId) {
        card.style.display = 'none';
        return;
      }

      const student = students.find(s => s.id === studentId);
      title.textContent = `${student.name}'s Attendance Heatmap`;
      card.style.display = 'block';
      viewer.innerHTML = '<div class="text-center" style="padding: 40px;"><p>Loading heatmap...</p></div>';

      // Get user profile to check last login
      const snapshot = await db.collection('users').where('linkedId', '==', studentId).get();
      let userProfile = null;
      if (!snapshot.empty) {
        userProfile = snapshot.docs[0].data();
      }

      // Check if logged in within 7 days
      let lastLoginDate = null;
      let notLoggedInLongTime = false;
      const today = new Date();
      
      if (userProfile && userProfile.lastLogin) {
        lastLoginDate = userProfile.lastLogin.toDate ? userProfile.lastLogin.toDate() : new Date(userProfile.lastLogin);
        const diffTime = Math.abs(today - lastLoginDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 7) {
          notLoggedInLongTime = true;
        }
      } else {
        // Never logged in or no lastLogin recorded
        notLoggedInLongTime = true;
      }

      const attendance = await Store.queryWhere('attendance', 'studentId', '==', studentId);

      if (notLoggedInLongTime) {
        // Render empty heatmap and message
        viewer.innerHTML = `
          <div id="heatmapInner"></div>
          <div class="empty-state" style="margin-top: 16px; padding: 24px;">
            <div class="icon" style="color: var(--danger);">⚠️</div>
            <p style="color: var(--danger); font-weight: 600;">The user has not logged in long time.</p>
            ${lastLoginDate ? `<p style="font-size: 0.8rem; color: var(--text-secondary);">Last seen: ${Utils.formatDate(lastLoginDate.toISOString().split('T')[0])}</p>` : '<p style="font-size: 0.8rem; color: var(--text-secondary);">Never logged in</p>'}
          </div>
        `;
        Heatmap.render('heatmapInner', [], {
          title: 'Attendance Activity (No Recent Login)',
          weeks: 26
        });
      } else {
        viewer.innerHTML = '<div id="heatmapInner"></div>';
        Heatmap.render('heatmapInner', attendance, {
          title: 'Attendance Activity',
          weeks: 26
        });
      }
    });
  }

  return { init };
})();
