/**
 * College ERP — Sidebar Module
 */
const Sidebar = (() => {
  const navConfig = {
    admin: [
      { section: 'Overview' },
      { label: 'Dashboard', icon: '📊', href: 'dashboard.html' },
      { section: 'Management' },
      { label: 'Students', icon: '🎓', href: 'students.html' },
      { label: 'Faculty', icon: '👩‍🏫', href: 'faculty.html' },
      { label: 'Courses', icon: '📚', href: 'courses.html' },
      { section: 'Academics' },
      { label: 'Attendance', icon: '📅', href: 'attendance.html' },
      { label: 'Grades', icon: '📝', href: 'grades.html' },
      { label: 'Timetable', icon: '🕐', href: 'timetable.html' },
      { label: 'Exams', icon: '📋', href: 'exams.html' },
      { section: 'Finance' },
      { label: 'Fees', icon: '💰', href: 'fees.html' },
    ],
    faculty: [
      { section: 'Overview' },
      { label: 'Dashboard', icon: '📊', href: 'dashboard.html' },
      { section: 'Academics' },
      { label: 'Attendance', icon: '📅', href: 'attendance.html' },
      { label: 'Grades', icon: '📝', href: 'grades.html' },
      { label: 'Courses', icon: '📚', href: 'courses.html' },
      { label: 'Timetable', icon: '🕐', href: 'timetable.html' },
      { label: 'Exams', icon: '📋', href: 'exams.html' },
      { section: 'View' },
      { label: 'Students', icon: '🎓', href: 'students.html' },
    ],
    student: [
      { section: 'Overview' },
      { label: 'Dashboard', icon: '📊', href: 'dashboard.html' },
      { section: 'Academics' },
      { label: 'Attendance', icon: '📅', href: 'attendance.html' },
      { label: 'Grades', icon: '📝', href: 'grades.html' },
      { label: 'Courses', icon: '📚', href: 'courses.html' },
      { label: 'Timetable', icon: '🕐', href: 'timetable.html' },
      { label: 'Exams', icon: '📋', href: 'exams.html' },
      { section: 'Finance' },
      { label: 'Fees', icon: '💰', href: 'fees.html' },
    ]
  };

  function init() {
    const user = Auth.currentUser();
    if (!user) return;

    const sidebarEl = document.getElementById('sidebar');
    if (!sidebarEl) return;

    const currentPage = window.location.pathname.split('/').pop();
    const items = navConfig[user.role] || [];

    let navHTML = '';
    items.forEach(item => {
      if (item.section) {
        navHTML += `<div class="nav-section">${item.section}</div>`;
      } else {
        const isActive = currentPage === item.href ? 'active' : '';
        navHTML += `<a class="nav-link ${isActive}" href="${item.href}">
          <span class="nav-icon">${item.icon}</span> ${item.label}
        </a>`;
      }
    });

    const initials = user.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'U';

    sidebarEl.innerHTML = `
      <div class="sidebar-brand">
        <div class="brand-icon">🎓</div>
        <h2>College ERP</h2>
      </div>
      <nav class="sidebar-nav">${navHTML}</nav>
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="avatar">${initials}</div>
          <div class="user-info">
            <div class="user-name">${user.name}</div>
            <div class="user-role">${user.role}</div>
          </div>
        </div>
        <button class="btn-icon" onclick="Auth.logout()" title="Logout" style="color:var(--text-sidebar);border-color:rgba(255,255,255,0.15)">⏻</button>
      </div>
    `;

    const topbarRight = document.querySelector('.topbar-right');
    if (topbarRight) {
      topbarRight.innerHTML = `
        <button class="btn-icon" onclick="Utils.toggleDarkMode()" title="Toggle dark mode">🌙</button>
      `;
    }

    const hamburger = document.querySelector('.hamburger');
    if (hamburger) {
      hamburger.addEventListener('click', () => sidebarEl.classList.toggle('open'));
    }

    sidebarEl.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => sidebarEl.classList.remove('open'));
    });
  }

  return { init };
})();
