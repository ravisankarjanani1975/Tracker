import { useState } from 'react';
import useSWR from 'swr';
import { API_URL } from '../config';
import './CableCollection.css';

const fetcher = (url) => fetch(url).then(res => res.json());

function CableCollection({ onBack }) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch collection data
  const { data, mutate, isLoading } = useSWR(
    `${API_URL}/collection?month=${selectedMonth}`,
    fetcher,
    { refreshInterval: 10000 }
  );

  const collection = data?.collection || [];
  const summary = data?.summary || {};

  // Split into paid and unpaid
  const paidList = collection.filter(item => item.paid);
  const unpaidList = collection.filter(item => !item.paid);

  // Filter by search
  const filterBySearch = (list) => {
    if (!searchTerm) return list;
    const search = searchTerm.toLowerCase();
    return list.filter(item =>
      item.customer_name?.toLowerCase().includes(search) ||
      item.customer_phone?.includes(search) ||
      item.area?.toLowerCase().includes(search)
    );
  };

  const filteredPaid = filterBySearch(paidList);
  const filteredUnpaid = filterBySearch(unpaidList);

  const formatCurrency = (amount) => {
    return `₹${(amount || 0).toLocaleString('en-IN')}`;
  };

  const getMonthDisplay = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  const handleMarkPaid = async (item, paymentMode = 'cash') => {
    try {
      const response = await fetch(`${API_URL}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: item.customer_id,
          month: selectedMonth,
          amount: item.monthly_amount,
          payment_mode: paymentMode
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed');
      }

      mutate();

      // Ask about WhatsApp
      if (confirm('Payment saved! Send WhatsApp receipt?')) {
        sendWhatsApp(item);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleUndo = async (item) => {
    if (!confirm(`Undo payment for "${item.customer_name}"?`)) return;
    try {
      await fetch(`${API_URL}/payments/${item.payment_id}`, { method: 'DELETE' });
      mutate();
    } catch (error) {
      alert('Error undoing payment');
    }
  };

  const sendWhatsApp = async (item) => {
    const message = encodeURIComponent(
      `🧾 *Cable TV Payment Receipt*\n\n` +
      `Name: ${item.customer_name}\n` +
      `Month: ${getMonthDisplay(selectedMonth)}\n` +
      `Amount: ${formatCurrency(item.paid_amount || item.monthly_amount)}\n` +
      `Date: ${new Date().toLocaleDateString('en-IN')}\n\n` +
      `Thank you! 🙏`
    );
    window.open(`https://wa.me/91${item.customer_phone}?text=${message}`, '_blank');

    // Mark as sent
    if (item.payment_id) {
      try {
        await fetch(`${API_URL}/payments/${item.payment_id}/whatsapp-sent`, { method: 'PUT' });
        mutate();
      } catch (e) {}
    }
  };

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
        <h2>📺 Cable TV Receipt</h2>
        <div class="row"><span>Customer:</span><span>${item.customer_name}</span></div>
        <div class="row"><span>Phone:</span><span>${item.customer_phone}</span></div>
        <div class="row"><span>Month:</span><span>${getMonthDisplay(selectedMonth)}</span></div>
        <div class="row total"><span>Amount:</span><span>${formatCurrency(item.paid_amount || item.monthly_amount)}</span></div>
        <div class="row"><span>Date:</span><span>${new Date().toLocaleDateString('en-IN')}</span></div>
        <div class="footer">Thank you!</div>
        <script>window.onload=function(){window.print()}</script>
      </body></html>
    `);
  };

  const printMonthlyAudit = () => {
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Monthly Audit - ${getMonthDisplay(selectedMonth)}</title>
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
        <h1>Cable TV Collection - ${getMonthDisplay(selectedMonth)}</h1>
        <div class="summary">
          <div><div class="value">${formatCurrency(summary.collected)}</div><div>Collected (${summary.paid})</div></div>
          <div><div class="value">${formatCurrency(summary.pending)}</div><div>Pending (${summary.unpaid})</div></div>
          <div><div class="value">${formatCurrency((summary.collected || 0) + (summary.pending || 0))}</div><div>Total Due</div></div>
        </div>
        <h2>✓ PAID (${paidList.length})</h2>
        <table><tr><th>#</th><th>Name</th><th>Phone</th><th>Amount</th></tr>
        ${paidList.map((p, i) => `<tr class="paid"><td>${i + 1}</td><td>${p.customer_name}</td><td>${p.customer_phone}</td><td>${formatCurrency(p.paid_amount)}</td></tr>`).join('')}
        </table>
        <h2>✗ UNPAID (${unpaidList.length})</h2>
        <table><tr><th>#</th><th>Name</th><th>Phone</th><th>Amount</th></tr>
        ${unpaidList.map((p, i) => `<tr class="unpaid"><td>${i + 1}</td><td>${p.customer_name}</td><td>${p.customer_phone}</td><td>${formatCurrency(p.monthly_amount)}</td></tr>`).join('')}
        </table>
        <script>window.onload=function(){window.print()}</script>
      </body></html>
    `);
  };

  // Month input
  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };

  // Bulk WhatsApp reminders
  const sendBulkReminders = () => {
    if (unpaidList.length === 0) {
      alert('No unpaid customers to remind!');
      return;
    }

    const count = Math.min(unpaidList.length, 10); // Limit to 10 at a time
    if (!confirm(`Send WhatsApp reminders to ${count} unpaid customers?\n\nNote: Opens ${count} WhatsApp tabs. Please allow pop-ups.`)) {
      return;
    }

    let sent = 0;
    unpaidList.slice(0, 10).forEach((item, index) => {
      setTimeout(() => {
        const message = encodeURIComponent(
          `🔔 *Payment Reminder*\n\n` +
          `Dear ${item.customer_name},\n\n` +
          `Your cable TV subscription for *${getMonthDisplay(selectedMonth)}* is pending.\n\n` +
          `Amount Due: *${formatCurrency(item.monthly_amount)}*\n\n` +
          `Please pay at your earliest convenience.\n\n` +
          `Thank you! 🙏`
        );
        window.open(`https://wa.me/91${item.customer_phone}?text=${message}`, '_blank');
        sent++;
        if (sent === count) {
          alert(`Opened ${sent} WhatsApp reminders!`);
        }
      }, index * 1000); // Stagger by 1 second each
    });
  };

  return (
    <div className="cable-collection">
      {/* Header */}
      <header className="collection-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h1>📋 Monthly Collection</h1>
        <input
          type="month"
          value={selectedMonth}
          onChange={handleMonthChange}
          className="month-input"
        />
      </header>

      {/* Summary Bar */}
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
        <button className="print-audit-btn" onClick={printMonthlyAudit}>
          🖨️ Print Audit
        </button>
        <button className="bulk-wa-btn" onClick={sendBulkReminders} disabled={unpaidList.length === 0}>
          📱 Send Bulk Reminders ({Math.min(unpaidList.length, 10)})
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by name, phone, area..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-input"
      />

      {isLoading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="split-view">
          {/* PAID Column */}
          <div className="column paid-column">
            <h2 className="column-title paid">✓ PAID ({filteredPaid.length})</h2>
            <div className="column-list">
              {filteredPaid.length === 0 ? (
                <div className="empty-msg">No payments yet</div>
              ) : (
                filteredPaid.map(item => (
                  <div key={item.customer_id} className="list-item paid">
                    <div className="item-info">
                      <div className="item-name">{item.customer_name}</div>
                      <div className="item-amount">{formatCurrency(item.paid_amount)}</div>
                      {item.area && <div className="item-area">{item.area}</div>}
                    </div>
                    <div className="item-actions">
                      <span className="date-badge">
                        {new Date(item.paid_date).getDate()}
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

          {/* UNPAID Column */}
          <div className="column unpaid-column">
            <h2 className="column-title unpaid">✗ UNPAID ({filteredUnpaid.length})</h2>
            <div className="column-list">
              {filteredUnpaid.length === 0 ? (
                <div className="empty-msg">All paid! 🎉</div>
              ) : (
                filteredUnpaid.map(item => (
                  <div key={item.customer_id} className="list-item unpaid">
                    <div className="item-info">
                      <div className="item-name">{item.customer_name}</div>
                      <div className="item-amount">{formatCurrency(item.monthly_amount)}</div>
                      {item.area && <div className="item-area">{item.area}</div>}
                    </div>
                    <div className="item-actions">
                      <button
                        className="pay-btn"
                        onClick={() => handleMarkPaid(item, 'cash')}
                      >
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
    </div>
  );
}

export default CableCollection;
