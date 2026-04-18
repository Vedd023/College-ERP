/**
 * College ERP — Utility Functions
 * Shared helpers: toast, modal, CSV, dark mode, search, debounce
 */
const Utils = (() => {
  /** Debounce function */
  function debounce(fn, ms = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  /** Format date for display */
  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  /** Get today's date as YYYY-MM-DD */
  function today() {
    return new Date().toISOString().split('T')[0];
  }

  // ---- Toast Notifications ----
  function _ensureToastContainer() {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function showToast(message, type = 'info') {
    const container = _ensureToastContainer();
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3500);
  }

  // ---- Modal ----
  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  }

  // ---- CSV Export ----
  function exportToCSV(data, filename = 'export.csv') {
    if (!data.length) return showToast('No data to export', 'error');
    const keys = Object.keys(data[0]);
    const rows = [keys.join(',')];
    data.forEach(item => {
      rows.push(keys.map(k => {
        let val = item[k] ?? '';
        if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Exported successfully', 'success');
  }

  // ---- Dark Mode ----
  function initTheme() {
    const saved = localStorage.getItem('erp_theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
  }

  function toggleDarkMode() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('erp_theme', next);
  }

  // ---- Table Search ----
  function searchTable(inputId, tableId) {
    const input = document.getElementById(inputId);
    const table = document.getElementById(tableId);
    if (!input || !table) return;
    input.addEventListener('input', debounce(() => {
      const q = input.value.toLowerCase();
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(q) ? '' : 'none';
      });
    }));
  }

  // ---- Form Validation ----
  function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;
    let valid = true;
    form.querySelectorAll('[required]').forEach(input => {
      const errEl = input.parentElement.querySelector('.form-error');
      if (!input.value.trim()) {
        input.style.borderColor = 'var(--danger)';
        if (errEl) errEl.textContent = 'This field is required';
        valid = false;
      } else {
        input.style.borderColor = '';
        if (errEl) errEl.textContent = '';
      }
    });
    return valid;
  }

  /** Get form data as object */
  function getFormData(formId) {
    const form = document.getElementById(formId);
    if (!form) return {};
    const data = {};
    form.querySelectorAll('input, select, textarea').forEach(el => {
      if (el.name) data[el.name] = el.value.trim();
    });
    return data;
  }

  /** Populate form fields from an object */
  function populateForm(formId, data) {
    const form = document.getElementById(formId);
    if (!form) return;
    Object.entries(data).forEach(([key, val]) => {
      const el = form.querySelector(`[name="${key}"]`);
      if (el) el.value = val;
    });
  }

  /** Clear form */
  function clearForm(formId) {
    const form = document.getElementById(formId);
    if (form) form.reset();
  }

  return {
    debounce, formatDate, today, showToast, openModal, closeModal, closeAllModals,
    exportToCSV, initTheme, toggleDarkMode, searchTable, validateForm, getFormData,
    populateForm, clearForm
  };
})();

// Init theme on load
Utils.initTheme();
