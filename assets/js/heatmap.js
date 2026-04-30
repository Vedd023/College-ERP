/**
 * College ERP — Attendance Heatmap Module
 * GitHub-style contribution heatmap for attendance visualization
 */
const Heatmap = (() => {

  /**
   * Render a GitHub-style attendance heatmap into a container
   * @param {HTMLElement|string} container - DOM element or ID
   * @param {Array} attendanceRecords - Array of { date, status } records
   * @param {Object} options - { weeks, cellSize, title }
   */
  function render(container, attendanceRecords, options = {}) {
    const el = typeof container === 'string' ? document.getElementById(container) : container;
    if (!el) return;

    const weeks = options.weeks || 26; // ~6 months
    const cellSize = options.cellSize || 14;
    const cellGap = 3;
    const title = options.title || 'Attendance Activity';
    const compact = options.compact || false;

    // Build a date -> status map
    const dateMap = {};
    attendanceRecords.forEach(r => {
      if (!dateMap[r.date]) dateMap[r.date] = { present: 0, absent: 0, total: 0 };
      dateMap[r.date].total++;
      if (r.status === 'present') dateMap[r.date].present++;
      else dateMap[r.date].absent++;
    });

    // Calculate date range (ending today, going back `weeks` weeks)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (weeks * 7) + 1);
    // Adjust to start on a Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());

    // Build cells
    const cells = [];
    const current = new Date(startDate);
    while (current <= today) {
      const dateStr = formatDate(current);
      const dayOfWeek = current.getDay();
      cells.push({
        date: dateStr,
        dayOfWeek,
        data: dateMap[dateStr] || null,
        isFuture: current > today
      });
      current.setDate(current.getDate() + 1);
    }

    // Group into weeks
    const weekGroups = [];
    let currentWeek = [];
    cells.forEach(cell => {
      if (cell.dayOfWeek === 0 && currentWeek.length > 0) {
        weekGroups.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(cell);
    });
    if (currentWeek.length) weekGroups.push(currentWeek);

    // Stats
    const totalDays = Object.keys(dateMap).length;
    const totalPresent = Object.values(dateMap).reduce((sum, d) => sum + d.present, 0);
    const totalAbsent = Object.values(dateMap).reduce((sum, d) => sum + d.absent, 0);
    const totalRecords = totalPresent + totalAbsent;
    const streak = calculateStreak(dateMap, today);

    // Month labels
    const monthLabels = buildMonthLabels(startDate, weekGroups);

    // SVG dimensions
    const svgWidth = weekGroups.length * (cellSize + cellGap) + 40;
    const svgHeight = 7 * (cellSize + cellGap) + 30;
    const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

    const html = `
      <div class="heatmap-container${compact ? ' heatmap-compact' : ''}">
        <div class="heatmap-header">
          <h4 class="heatmap-title">${title}</h4>
          <div class="heatmap-stats">
            <span class="heatmap-stat">
              <span class="heatmap-stat-dot present"></span>
              ${totalPresent} present
            </span>
            <span class="heatmap-stat">
              <span class="heatmap-stat-dot absent"></span>
              ${totalAbsent} absent
            </span>
            ${streak > 0 ? `<span class="heatmap-stat heatmap-streak">🔥 ${streak} day streak</span>` : ''}
          </div>
        </div>
        <div class="heatmap-scroll">
          <svg width="${svgWidth}" height="${svgHeight}" class="heatmap-svg">
            <!-- Month labels -->
            ${monthLabels.map(m => `
              <text x="${m.x}" y="10" class="heatmap-month-label">${m.label}</text>
            `).join('')}
            <!-- Day labels -->
            ${dayLabels.map((label, i) => label ? `
              <text x="0" y="${20 + i * (cellSize + cellGap) + cellSize / 2 + 4}" class="heatmap-day-label">${label}</text>
            ` : '').join('')}
            <!-- Cells -->
            ${weekGroups.map((week, wi) => week.map(cell => {
              const x = 32 + wi * (cellSize + cellGap);
              const y = 18 + cell.dayOfWeek * (cellSize + cellGap);
              const level = getLevel(cell.data);
              const tooltip = getTooltip(cell);
              return `
                <rect 
                  x="${x}" y="${y}" 
                  width="${cellSize}" height="${cellSize}" 
                  rx="3" ry="3"
                  class="heatmap-cell heatmap-level-${level}"
                  data-date="${cell.date}"
                  data-tooltip="${tooltip}"
                  onmouseenter="Heatmap.showTooltip(event)"
                  onmouseleave="Heatmap.hideTooltip()"
                />
              `;
            }).join('')).join('')}
          </svg>
        </div>
        <div class="heatmap-legend">
          <span class="heatmap-legend-label">Less</span>
          <span class="heatmap-legend-cell heatmap-level-0"></span>
          <span class="heatmap-legend-cell heatmap-level-1"></span>
          <span class="heatmap-legend-cell heatmap-level-2"></span>
          <span class="heatmap-legend-cell heatmap-level-3"></span>
          <span class="heatmap-legend-cell heatmap-level-4"></span>
          <span class="heatmap-legend-label">More</span>
        </div>
      </div>
    `;

    el.innerHTML = html;
  }

  function getLevel(data) {
    if (!data) return 0;
    if (data.total === 0) return 0;
    const ratio = data.present / data.total;
    if (ratio === 0) return -1; // absent (red)
    if (ratio < 0.5) return 1;
    if (ratio < 0.75) return 2;
    if (ratio < 1) return 3;
    return 4; // 100% present
  }

  function getTooltip(cell) {
    if (!cell.data) return `${formatDisplayDate(cell.date)}: No classes`;
    const { present, absent, total } = cell.data;
    return `${formatDisplayDate(cell.date)}: ${present}/${total} present${absent > 0 ? ', ' + absent + ' absent' : ''}`;
  }

  function calculateStreak(dateMap, today) {
    let streak = 0;
    const d = new Date(today);
    while (true) {
      const dateStr = formatDate(d);
      if (dateMap[dateStr] && dateMap[dateStr].present > 0 && dateMap[dateStr].absent === 0) {
        streak++;
      } else if (dateMap[dateStr] && dateMap[dateStr].absent > 0) {
        break;
      } else {
        // No records for this day — skip weekends/holidays, only break on actual absences
        // But stop if we've gone more than 3 days without records
        const nextD = new Date(d);
        nextD.setDate(nextD.getDate() - 1);
        const nextStr = formatDate(nextD);
        if (!dateMap[nextStr]) {
          // Check another day back
          nextD.setDate(nextD.getDate() - 1);
          const next2 = formatDate(nextD);
          if (!dateMap[next2] && streak > 0) break;
        }
      }
      d.setDate(d.getDate() - 1);
      // Safety: don't go more than 365 days back
      if (streak > 365 || (today - d) / (1000 * 60 * 60 * 24) > 365) break;
    }
    return streak;
  }

  function buildMonthLabels(startDate, weekGroups) {
    const labels = [];
    let lastMonth = -1;
    const cellSize = 14;
    const cellGap = 3;

    weekGroups.forEach((week, wi) => {
      // Use the first day of the week
      const firstCell = week[0];
      const d = new Date(firstCell.date + 'T00:00:00');
      const month = d.getMonth();
      if (month !== lastMonth) {
        labels.push({
          x: 32 + wi * (cellSize + cellGap),
          label: d.toLocaleDateString('en-US', { month: 'short' })
        });
        lastMonth = month;
      }
    });
    return labels;
  }

  function formatDate(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatDisplayDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Tooltip functions
  let tooltipEl = null;

  function showTooltip(event) {
    const rect = event.target;
    const text = rect.getAttribute('data-tooltip');
    if (!text) return;

    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.className = 'heatmap-tooltip';
      document.body.appendChild(tooltipEl);
    }

    tooltipEl.textContent = text;
    tooltipEl.classList.add('active');

    const bounds = rect.getBoundingClientRect();
    tooltipEl.style.left = bounds.left + bounds.width / 2 + 'px';
    tooltipEl.style.top = bounds.top - 8 + 'px';
  }

  function hideTooltip() {
    if (tooltipEl) tooltipEl.classList.remove('active');
  }

  return { render, showTooltip, hideTooltip };
})();
