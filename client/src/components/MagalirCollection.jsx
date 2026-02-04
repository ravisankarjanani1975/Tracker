import { useState } from 'react';
import useSWR from 'swr';
import { API_URL } from '../config';
import './MagalirCollection.css';

const fetcher = (url) => fetch(url).then(res => res.json());

function MagalirCollection({ group, onBack }) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [viewHistory, setViewHistory] = useState(null);

  // Fetch collection data
  const { data, mutate, isLoading } = useSWR(
    `${API_URL}/magalir/groups/${group.id}/collection?month=${selectedMonth}`,
    fetcher,
    { refreshInterval: 10000 }
  );

  // Fetch payment history for a member
  const { data: paymentHistory = [] } = useSWR(
    viewHistory ? `${API_URL}/magalir/members/${viewHistory.member_id}/payments` : null,
    fetcher
  );

  const collection = data?.collection || [];
  const summary = data?.summary || {};

  const paidList = collection.filter(item => item.paid);
  const unpaidList = collection.filter(item => !item.paid);

  const filterBySearch = (list) => {
    if (!searchTerm) return list;
    const search = searchTerm.toLowerCase();
    return list.filter(item =>
      item.member_name?.toLowerCase().includes(search) ||
      item.member_phone?.includes(search)
    );
  };

  const filteredPaid = filterBySearch(paidList);
  const filteredUnpaid = filterBySearch(unpaidList);

  const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString('en-IN')}`;

  const getMonthDisplay = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  // Mark as paid
  const handleMarkPaid = async (item) => {
    try {
      const response = await fetch(`${API_URL}/magalir/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: group.id,
          member_id: item.member_id,
          month: selectedMonth,
          amount: item.expected_amount || group.monthly_amount
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed');
      }

      mutate();

      if (confirm('Payment saved! Send WhatsApp receipt?')) {
        sendWhatsApp(item);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  // Undo payment
  const handleUndo = async (item) => {
    if (!confirm(`Undo payment for "${item.member_name}"?`)) return;
    try {
      await fetch(`${API_URL}/magalir/payments/${item.payment_id}`, { method: 'DELETE' });
      mutate();
    } catch (error) {
      alert('Error undoing payment');
    }
  };

  // Send WhatsApp
  const sendWhatsApp = (item) => {
    const message = encodeURIComponent(
      `🧾 *Payment Receipt*\n\n` +
      `Group: ${group.name}\n` +
      `Name: ${item.member_name}\n` +
      `Month: ${getMonthDisplay(selectedMonth)}\n` +
      `Amount: ${formatCurrency(item.paid_amount || item.expected_amount)}\n` +
      `Date: ${new Date().toLocaleDateString('en-IN')}\n\n` +
      `Thank you! 🙏`
    );
    window.open(`https://wa.me/91${item.member_phone}?text=${message}`, '_blank');
  };

  // Print receipt
  const printReceipt = (item) => {
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Receipt</title>
      <style>
        body{font-family:Arial;padding:20px;max-width:280px;margin:0 auto}
        h2{text-align:center;border-bottom:2px solid #000;padding-bottom:10px}
        .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #ccc}
        .total{font-size:1.2em;margin-top:10px;font-weight:bold}
        .footer{text-align:center;margin-top:20px;color:#666}
      </style></head><body>
        <h2>💰 ${group.name} Receipt</h2>
        <div class="row"><span>Member:</span><span>${item.member_name}</span></div>
        <div class="row"><span>Phone:</span><span>${item.member_phone || '-'}</span></div>
        <div class="row"><span>Month:</span><span>${getMonthDisplay(selectedMonth)}</span></div>
        <div class="row total"><span>Amount:</span><span>${formatCurrency(item.paid_amount || item.expected_amount)}</span></div>
        <div class="row"><span>Date:</span><span>${new Date().toLocaleDateString('en-IN')}</span></div>
        <div class="footer">Thank you!</div>
        <script>window.onload=function(){window.print()}</script>
      </body></html>
    `);
  };

  // Add member
  const handleAddMember = async (formData) => {
    try {
      const response = await fetch(`${API_URL}/magalir/groups/${group.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed');
      }
      mutate();
      setShowAddMember(false);
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  // Delete member
  const handleDeleteMember = async (item) => {
    if (!confirm(`Remove "${item.member_name}" from this group?`)) return;
    try {
      await fetch(`${API_URL}/magalir/members/${item.member_id}`, { method: 'DELETE' });
      mutate();
    } catch (error) {
      alert('Error removing member');
    }
  };

  // Bulk WhatsApp reminders
  const sendBulkReminders = () => {
    if (unpaidList.length === 0) {
      alert('No unpaid members to remind!');
      return;
    }
    const count = Math.min(unpaidList.length, 10);
    if (!confirm(`Send WhatsApp reminders to ${count} unpaid members?`)) return;

    unpaidList.slice(0, 10).forEach((item, index) => {
      setTimeout(() => {
        const message = encodeURIComponent(
          `🔔 *Payment Reminder*\n\n` +
          `Dear ${item.member_name},\n\n` +
          `Your ${group.name} payment for *${getMonthDisplay(selectedMonth)}* is pending.\n\n` +
          `Amount Due: *${formatCurrency(item.expected_amount)}*\n\n` +
          `Please pay at your earliest.\n\nThank you! 🙏`
        );
        window.open(`https://wa.me/91${item.member_phone}?text=${message}`, '_blank');
      }, index * 1000);
    });
  };

  // Print audit
  const printAudit = () => {
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>${group.name} - ${getMonthDisplay(selectedMonth)}</title>
      <style>
        body{font-family:Arial;padding:20px;font-size:12px}
        h1{text-align:center;font-size:16px}
        .summary{display:flex;justify-content:space-around;margin:15px 0;padding:10px;background:#f5f5f5}
        .summary div{text-align:center}
        .summary .value{font-size:18px;font-weight:bold}
        table{width:100%;border-collapse:collapse;margin-top:10px}
        th,td{border:1px solid #ddd;padding:6px;text-align:left}
        th{background:#333;color:#fff}
        .paid{background:#e8f5e9}
        .unpaid{background:#ffebee}
        h2{margin-top:20px;font-size:14px}
      </style></head><body>
        <h1>${group.name} - ${getMonthDisplay(selectedMonth)}</h1>
        <div class="summary">
          <div><div class="value">${formatCurrency(summary.collected)}</div><div>Collected (${summary.paid})</div></div>
          <div><div class="value">${formatCurrency(summary.pending)}</div><div>Pending (${summary.unpaid})</div></div>
        </div>
        <h2>✓ PAID (${paidList.length})</h2>
        <table><tr><th>#</th><th>Name</th><th>Phone</th><th>Amount</th></tr>
        ${paidList.map((p, i) => `<tr class="paid"><td>${i + 1}</td><td>${p.member_name}</td><td>${p.member_phone || '-'}</td><td>${formatCurrency(p.paid_amount)}</td></tr>`).join('')}
        </table>
        <h2>✗ UNPAID (${unpaidList.length})</h2>
        <table><tr><th>#</th><th>Name</th><th>Phone</th><th>Amount</th></tr>
        ${unpaidList.map((p, i) => `<tr class="unpaid"><td>${i + 1}</td><td>${p.member_name}</td><td>${p.member_phone || '-'}</td><td>${formatCurrency(p.expected_amount)}</td></tr>`).join('')}
        </table>
        <script>window.onload=function(){window.print()}</script>
      </body></html>
    `);
  };

  return (
    <div className="magalir-collection">
      {/* Header */}
      <header className="collection-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="header-title">
          <h1>{group.name}</h1>
          <span className="member-count">{summary.total || 0} members</span>
        </div>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="month-input"
        />
      </header>

      {/* Summary */}
      <div className="summary-bar">
        <div className="summary-item collected">
          <span className="value">{formatCurrency(summary.collected)}</span>
          <span className="label">Collected ({summary.paid || 0})</span>
        </div>
        <div className="summary-item pending">
          <span className="value">{formatCurrency(summary.pending)}</span>
          <span className="label">Pending ({summary.unpaid || 0})</span>
        </div>
        <div className="summary-item total">
          <span className="value">{formatCurrency((summary.collected || 0) + (summary.pending || 0))}</span>
          <span className="label">Total Due</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-bar">
        <button className="action-btn add" onClick={() => setShowAddMember(true)}>
          + Add Member
        </button>
        <button className="action-btn print" onClick={printAudit}>
          🖨️ Print
        </button>
        <button className="action-btn wa" onClick={sendBulkReminders} disabled={unpaidList.length === 0}>
          📱 Remind ({Math.min(unpaidList.length, 10)})
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by name or phone..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-input"
      />

      {isLoading ? (
        <div className="loading">Loading...</div>
      ) : collection.length === 0 ? (
        <div className="empty-state">
          <p>No members in this group yet.</p>
          <button className="add-first-btn" onClick={() => setShowAddMember(true)}>
            + Add First Member
          </button>
        </div>
      ) : (
        <div className="split-view">
          {/* PAID */}
          <div className="column paid-column">
            <h2 className="column-title paid">✓ PAID ({filteredPaid.length})</h2>
            <div className="column-list">
              {filteredPaid.length === 0 ? (
                <div className="empty-msg">No payments yet</div>
              ) : (
                filteredPaid.map(item => (
                  <div key={item.member_id} className="list-item paid">
                    <div className="item-info">
                      <div className="item-name">{item.member_name}</div>
                      <div className="item-amount">{formatCurrency(item.paid_amount)}</div>
                    </div>
                    <div className="item-actions">
                      <span className="date-badge">
                        {item.paid_date ? new Date(item.paid_date).getDate() : '-'}
                      </span>
                      <button className="action-btn wa" onClick={() => sendWhatsApp(item)} title="WhatsApp">
                        WA
                      </button>
                      <button className="action-btn print" onClick={() => printReceipt(item)} title="Print">
                        🖨️
                      </button>
                      <button className="action-btn undo" onClick={() => handleUndo(item)} title="Undo">
                        ↩️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* UNPAID */}
          <div className="column unpaid-column">
            <h2 className="column-title unpaid">✗ UNPAID ({filteredUnpaid.length})</h2>
            <div className="column-list">
              {filteredUnpaid.length === 0 ? (
                <div className="empty-msg">All paid! 🎉</div>
              ) : (
                filteredUnpaid.map(item => (
                  <div key={item.member_id} className="list-item unpaid">
                    <div className="item-info">
                      <div className="item-name">{item.member_name}</div>
                      <div className="item-amount">{formatCurrency(item.expected_amount)}</div>
                    </div>
                    <div className="item-actions">
                      <button className="action-btn history" onClick={() => setViewHistory(item)} title="History">
                        📋
                      </button>
                      <button className="pay-btn" onClick={() => handleMarkPaid(item)}>
                        ✓ Paid
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <AddMemberModal
          onSave={handleAddMember}
          onClose={() => setShowAddMember(false)}
        />
      )}

      {/* Payment History Modal */}
      {viewHistory && (
        <div className="modal-overlay" onClick={() => setViewHistory(null)}>
          <div className="modal history-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Payment History</h2>
              <button className="close-btn" onClick={() => setViewHistory(null)}>x</button>
            </div>
            <div className="modal-body">
              <div className="history-member-info">
                <div className="history-name">{viewHistory.member_name}</div>
                <div className="history-phone">📱 {viewHistory.member_phone || 'No phone'}</div>
              </div>
              <div className="history-summary">
                <div className="summary-stat">
                  <span className="stat-number">{paymentHistory.length}</span>
                  <span className="stat-label">Total Payments</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-number">{formatCurrency(paymentHistory.reduce((sum, p) => sum + (p.amount || 0), 0))}</span>
                  <span className="stat-label">Total Paid</span>
                </div>
              </div>
              {paymentHistory.length === 0 ? (
                <p className="no-payments">No payments recorded yet</p>
              ) : (
                <div className="history-list">
                  {paymentHistory.map(p => (
                    <div key={p.id} className="history-item">
                      <div className="history-month">
                        <span className="month-name">{getMonthDisplay(p.month)}</span>
                      </div>
                      <div className="history-details">
                        <span className="history-amount">{formatCurrency(p.amount)}</span>
                        <span className="history-date">{new Date(p.paid_date).toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button className="delete-member-btn" onClick={() => { handleDeleteMember(viewHistory); setViewHistory(null); }}>
                🗑️ Remove Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add Member Modal
function AddMemberModal({ onSave, onClose }) {
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Name is required');
      return;
    }
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Member</h2>
          <button className="close-btn" onClick={onClose}>x</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Member name"
              required
            />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Phone number"
            />
          </div>
          <div className="form-group">
            <label>Address</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Address (optional)"
              rows={2}
            />
          </div>
          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-cancel">Cancel</button>
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MagalirCollection;
