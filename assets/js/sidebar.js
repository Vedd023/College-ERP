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
      { label: 'Heatmaps', icon: '🔥', href: 'heatmaps.html' },
      { label: 'Grades', icon: '📝', href: 'grades.html' },
      { label: 'Timetable', icon: '🕐', href: 'timetable.html' },
      { label: 'Exams', icon: '📋', href: 'exams.html' },
      { label: 'Assignments', icon: '📤', href: 'assignments.html' },
      { section: 'Finance' },
      { label: 'Fees', icon: '💰', href: 'fees.html' },
    ],
    faculty: [
      { section: 'Overview' },
      { label: 'Dashboard', icon: '📊', href: 'dashboard.html' },
      { section: 'Academics' },
      { label: 'Attendance', icon: '📅', href: 'attendance.html' },
      { label: 'Heatmaps', icon: '🔥', href: 'heatmaps.html' },
      { label: 'Grades', icon: '📝', href: 'grades.html' },
      { label: 'Courses', icon: '📚', href: 'courses.html' },
      { label: 'Timetable', icon: '🕐', href: 'timetable.html' },
      { label: 'Exams', icon: '📋', href: 'exams.html' },
      { label: 'Assignments', icon: '📤', href: 'assignments.html' },
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
      { label: 'Assignments', icon: '📤', href: 'assignments.html' },
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
      <div class="sidebar-brand" id="sidebarBrand">
        <div class="brand-logo" style="width:38px;height:38px;background:#f59e0b;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3L1 9L5 11.18V17.18L12 21L19 17.18V11.18L21 10.09V17H23V9L12 3Z" fill="white"/>
            <path d="M7 12.27V16.18L12 19L17 16.18V12.27L12 15L7 12.27Z" fill="rgba(255,255,255,0.85)"/>
          </svg>
        </div>
        <h2>EduNexus</h2>
        <button class="collapser" id="sidebarCollapse" title="Collapse Menu">←</button>
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
      const theme = document.documentElement.getAttribute('data-theme') || 'light';
      topbarRight.innerHTML = `
        <a href="privacy.html" class="btn-icon" title="Privacy Policy & Terms" style="text-decoration:none; font-size: 1.1rem; display: flex; align-items: center; justify-content: center;">
          🛡️
        </a>
        <button class="btn-icon" id="themeToggle" onclick="Utils.toggleDarkMode()" title="Toggle dark mode">
          ${theme === 'dark' ? '🌙' : '☀️'}
        </button>
      `;
    }

    const hamburger = document.querySelector('.hamburger');
    if (hamburger) {
      hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebarEl.classList.toggle('open');
      });
    }

    const collapser = document.getElementById('sidebarCollapse');
    if (collapser) {
      collapser.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebarEl.classList.remove('open');
      });
    }

    const brand = document.getElementById('sidebarBrand');
    if (brand) {
      brand.addEventListener('click', (e) => {
        // If they clicked the collapser, don't refresh
        if (e.target.closest('.collapser')) return;
        window.location.reload();
      });
    }

    sidebarEl.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => sidebarEl.classList.remove('open'));
    });

    // Close sidebar when clicking outside
    document.addEventListener('click', (e) => {
      const isHamburger = e.target.closest('.hamburger');
      const isSidebar = e.target.closest('.sidebar');
      if (!isHamburger && !isSidebar && sidebarEl.classList.contains('open')) {
        sidebarEl.classList.remove('open');
      }
    });
  }

  return { init };
})();
