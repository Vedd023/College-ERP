/**
 * College ERP — Fees Module (Firestore)
 */
const FeesModule = (() => {
  let currentUser = null;

  async function init(user) {
    currentUser = user;
    const container = document.getElementById('feesContent');
    if (user.role === 'admin') {
      document.getElementById('feeActions').classList.remove('hidden');
      await renderAdminView();
      await populateStudentSelect();
      setupSearch();
      setupForm();
    } else if (user.role === 'student') {
      await renderStudentView(user);
    }
  }

  // ---- ADMIN ----
  async function renderAdminView() {
    const fees = await Store.getItems('fees');
    const students = await Store.getItems('students');

    const totalExpected = fees.reduce((sum, f) => sum + parseInt(f.totalAmount), 0);
    const totalCollected = fees.reduce((sum, f) => sum + parseInt(f.paidAmount), 0);
    const unpaidCount = fees.filter(f => f.status === 'unpaid').length;

    document.getElementById('feeStats').innerHTML = `
      <div class="stats-grid mb-2">
        <div class="stat-card"><div class="stat-icon blue">💰</div><div class="stat-info"><h4>₹${totalExpected.toLocaleString()}</h4><p>Total Expected</p></div></div>
        <div class="stat-card"><div class="stat-icon green">✓</div><div class="stat-info"><h4>₹${totalCollected.toLocaleString()}</h4><p>Total Collected</p></div></div>
        <div class="stat-card"><div class="stat-icon red">✕</div><div class="stat-info"><h4>${unpaidCount}</h4><p>Unpaid Invoices</p></div></div>
      </div>
    `;

    const tbody = document.getElementById('feesTableBody');
    tbody.innerHTML = fees.map(f => {
      const s = students.find(st => st.id === f.studentId);
      const balance = f.totalAmount - f.paidAmount;
      return `<tr>
        <td>${s ? s.name : 'Unknown'}</td><td>${s ? s.studentId : '—'}</td><td>${f.semester}</td>
        <td>₹${f.totalAmount}</td><td>₹${f.paidAmount}</td><td style="color:var(--danger)">₹${balance}</td>
        <td><span class="badge badge-${f.status === 'paid' ? 'success' : f.status === 'partial' ? 'warning' : 'danger'}">${f.status}</span></td>
        <td><button class="btn-icon btn-sm" onclick="FeesModule.openEditModal('${f.id}')">✏️</button><button class="btn-icon btn-sm" onclick="FeesModule.deleteFee('${f.id}')">🗑️</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="8" class="text-center">No fee records found</td></tr>';
  }

  async function populateStudentSelect() {
    const students = await Store.getItems('students');
    const select = document.getElementById('feeStudentSelect');
    if (!select) return;
    students.forEach(s => { const o = document.createElement('option'); o.value = s.id; o.textContent = `${s.studentId} — ${s.name}`; select.appendChild(o); });
  }

  function setupSearch() {
    const sInput = document.getElementById('searchFees');
    if (!sInput) return;
    sInput.addEventListener('input', Utils.debounce(async () => {
      const q = sInput.value.toLowerCase();
      const fees = await Store.getItems('fees');
      const students = await Store.getItems('students');
      
      const tbody = document.getElementById('feesTableBody');
      const filtered = fees.filter(f => {
        const s = students.find(st => st.id === f.studentId);
        return s && (s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q));
      });

      tbody.innerHTML = filtered.map(f => {
        const s = students.find(st => st.id === f.studentId);
        const balance = f.totalAmount - f.paidAmount;
        return `<tr><td>${s.name}</td><td>${s.studentId}</td><td>${f.semester}</td><td>₹${f.totalAmount}</td><td>₹${f.paidAmount}</td><td style="color:var(--danger)">₹${balance}</td>
          <td><span class="badge badge-${f.status === 'paid' ? 'success' : f.status === 'partial' ? 'warning' : 'danger'}">${f.status}</span></td>
          <td><button class="btn-icon btn-sm" onclick="FeesModule.openEditModal('${f.id}')">✏️</button><button class="btn-icon btn-sm" onclick="FeesModule.deleteFee('${f.id}')">🗑️</button></td></tr>`;
      }).join('') || '<tr><td colspan="8" class="text-center">No fee records found</td></tr>';
    }));
  }

  function setupForm() {
    const form = document.getElementById('feeForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!Utils.validateForm('feeForm')) return;
      const data = Utils.getFormData('feeForm');
      data.totalAmount = parseInt(data.totalAmount) || 0;
      data.paidAmount = parseInt(data.paidAmount) || 0;
      
      data.status = 'unpaid';
      if (data.paidAmount >= data.totalAmount) data.status = 'paid';
      else if (data.paidAmount > 0) data.status = 'partial';

      try {
        const btn = document.querySelector('#feeForm button[type="submit"]');
        btn.disabled = true;
        if (data.id) {
          await Store.updateItem('fees', data.id, data);
          Utils.showToast('Fee record updated', 'success');
        } else {
          delete data.id;
          await Store.createItem('fees', data);
          Utils.showToast('Fee record added', 'success');
        }
        Utils.closeModal('feeModal');
        Utils.clearForm('feeForm');
        renderAdminView();
      } catch (err) {
        Utils.showToast('Error saving fee', 'error');
      } finally {
        document.querySelector('#feeForm button[type="submit"]').disabled = false;
      }
    });
  }

  function openAddModal() {
    document.getElementById('feeModalTitle').textContent = 'Add Fee Record';
    Utils.clearForm('feeForm');
    Utils.openModal('feeModal');
  }

  async function openEditModal(id) {
    const fee = await Store.getItemById('fees', id);
    if (!fee) return;
    document.getElementById('feeModalTitle').textContent = 'Edit Fee Record';
    Utils.populateForm('feeForm', fee);
    Utils.openModal('feeModal');
  }

  async function deleteFee(id) {
    if (confirm('Delete this fee record?')) {
      await Store.deleteItem('fees', id);
      Utils.showToast('Fee record deleted', 'success');
      renderAdminView();
    }
  }

  // ---- STUDENT ----
  async function renderStudentView(user) {
    const fees = await Store.queryWhere('fees', 'studentId', '==', user.linkedId);
    document.getElementById('feeStats').innerHTML = '';
    const tbody = document.getElementById('feesTableBody');
    tbody.innerHTML = fees.map(f => {
      const balance = f.totalAmount - f.paidAmount;
      return `<tr>
        <td>${user.name}</td><td>${f.semester}</td><td>₹${f.totalAmount}</td><td>₹${f.paidAmount}</td><td style="color:var(--danger)">₹${balance}</td>
        <td><span class="badge badge-${f.status === 'paid' ? 'success' : f.status === 'partial' ? 'warning' : 'danger'}">${f.status}</span></td>
        <td>—</td>
      </tr>`;
    }).join('') || '<tr><td colspan="7" class="text-center">No fee records found</td></tr>';
  }

  async function exportCSV() {
    const fees = await Store.getItems('fees');
    Utils.exportToCSV(fees, 'fees.csv');
  }

  return { init, openAddModal, openEditModal, deleteFee, exportCSV };
})();
