import { useState } from 'react';
import useSWR from 'swr';
import { API_URL } from '../config';
import './CableCustomers.css';

const fetcher = (url) => fetch(url).then(res => res.json());

function CableCustomers({ onBack }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewPayments, setViewPayments] = useState(null);

  // Fetch customers
  const { data: customers = [], mutate, isLoading } = useSWR(
    `${API_URL}/customers`,
    fetcher,
    { refreshInterval: 30000 }
  );

  // Fetch payment history for a customer
  const { data: paymentHistory = [] } = useSWR(
    viewPayments ? `${API_URL}/customers/${viewPayments.id}/payments` : null,
    fetcher
  );

  const filteredCustomers = customers.filter(c => {
    // Status filter
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        c.name?.toLowerCase().includes(search) ||
        c.phone?.includes(search) ||
        c.stb_number?.toLowerCase().includes(search) ||
        c.area?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const handleSave = async (formData) => {
    try {
      const url = editCustomer
        ? `${API_URL}/customers/${editCustomer.id}`
        : `${API_URL}/customers`;

      const response = await fetch(url, {
        method: editCustomer ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save');
      }

      mutate();
      setShowAddModal(false);
      setEditCustomer(null);
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleArchive = async (customer) => {
    if (!confirm(`Archive "${customer.name}"? They will be marked as inactive.`)) return;

    try {
      await fetch(`${API_URL}/customers/${customer.id}/archive`, { method: 'PUT' });
      mutate();
    } catch (error) {
      alert('Error archiving customer');
    }
  };

  const handleReactivate = async (customer) => {
    try {
      await fetch(`${API_URL}/customers/${customer.id}/reactivate`, { method: 'PUT' });
      mutate();
    } catch (error) {
      alert('Error reactivating customer');
    }
  };

  const handleDelete = async (customer) => {
    if (!confirm(`DELETE "${customer.name}"? This will remove all their payment history. This cannot be undone!`)) return;

    try {
      await fetch(`${API_URL}/customers/${customer.id}`, { method: 'DELETE' });
      mutate();
    } catch (error) {
      alert('Error deleting customer');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <div className="cable-customers">
      {/* Header */}
      <header className="page-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h1>Customers</h1>
        <button className="add-btn" onClick={() => setShowAddModal(true)}>+ Add Customer</button>
      </header>

      {/* Filters */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search name, phone, STB, area..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="status-filter">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Stats Bar */}
      <div className="stats-bar">
        <span>Total: {filteredCustomers.length}</span>
        <span>Active: {filteredCustomers.filter(c => c.status === 'active').length}</span>
        <span>Inactive: {filteredCustomers.filter(c => c.status === 'inactive').length}</span>
      </div>

      {/* Customer List */}
      <div className="customer-list">
        {isLoading ? (
          <div className="loading">Loading...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="empty">No customers found</div>
        ) : (
          filteredCustomers.map(customer => (
            <div key={customer.id} className={`customer-card ${customer.status}`}>
              <div className="customer-info">
                <div className="customer-main">
                  <h3>{customer.name}</h3>
                  <span className={`status-badge ${customer.status}`}>
                    {customer.status === 'active' ? '🟢 Active' : '🔴 Inactive'}
                  </span>
                </div>
                <div className="customer-details">
                  <span>📱 {customer.phone}</span>
                  {customer.stb_number && <span>📺 {customer.stb_number}</span>}
                  {customer.area && <span>📍 {customer.area}</span>}
                  <span className="amount">💰 {formatCurrency(customer.monthly_amount)}/month</span>
                </div>
                {customer.address && <div className="address">📮 {customer.address}</div>}
              </div>
              <div className="customer-actions">
                <button className="btn-history" onClick={() => setViewPayments(customer)}>History</button>
                <button className="btn-edit" onClick={() => { setEditCustomer(customer); setShowAddModal(true); }}>Edit</button>
                {customer.status === 'active' ? (
                  <button className="btn-archive" onClick={() => handleArchive(customer)}>Archive</button>
                ) : (
                  <button className="btn-reactivate" onClick={() => handleReactivate(customer)}>Reactivate</button>
                )}
                <button className="btn-delete" onClick={() => handleDelete(customer)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <CustomerModal
          customer={editCustomer}
          onSave={handleSave}
          onClose={() => { setShowAddModal(false); setEditCustomer(null); }}
        />
      )}

      {/* Payment History Modal */}
      {viewPayments && (
        <div className="modal-overlay" onClick={() => setViewPayments(null)}>
          <div className="modal payment-history-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 Payment History</h2>
              <button className="close-btn" onClick={() => setViewPayments(null)}>×</button>
            </div>
            <div className="modal-body">
              {/* Customer Info */}
              <div className="history-customer-info">
                <div className="history-customer-name">{viewPayments.name}</div>
                <div className="history-customer-phone">📱 {viewPayments.phone}</div>
              </div>

              {/* Summary */}
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
                  {paymentHistory.map(p => {
                    const paidDate = new Date(p.paid_date);
                    const monthDate = p.month ? new Date(p.month + '-01') : paidDate;
                    const monthName = monthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                    const dayName = paidDate.toLocaleDateString('en-IN', { weekday: 'short' });
                    const fullDate = paidDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

                    return (
                      <div key={p.id} className="history-item">
                        <div className="history-month">
                          <span className="month-name">{monthName}</span>
                          <span className="payment-mode">{p.payment_mode || 'cash'}</span>
                        </div>
                        <div className="history-details">
                          <span className="history-amount">{formatCurrency(p.amount)}</span>
                          <span className="history-date">{dayName}, {fullDate}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Customer Add/Edit Modal
function CustomerModal({ customer, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    address: customer?.address || '',
    stb_number: customer?.stb_number || '',
    monthly_amount: customer?.monthly_amount || '',
    area: customer?.area || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert('Name and Phone are required');
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
          <h2>{customer ? 'Edit Customer' : 'Add Customer'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Customer name"
              required
            />
          </div>
          <div className="form-group">
            <label>Phone *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="10-digit phone number"
              required
            />
          </div>
          <div className="form-group">
            <label>STB Number</label>
            <input
              type="text"
              value={formData.stb_number}
              onChange={(e) => setFormData({...formData, stb_number: e.target.value})}
              placeholder="Set-top box number"
            />
          </div>
          <div className="form-group">
            <label>Monthly Amount (₹)</label>
            <input
              type="number"
              value={formData.monthly_amount}
              onChange={(e) => setFormData({...formData, monthly_amount: e.target.value})}
              placeholder="Monthly subscription amount"
            />
          </div>
          <div className="form-group">
            <label>Area</label>
            <input
              type="text"
              value={formData.area}
              onChange={(e) => setFormData({...formData, area: e.target.value})}
              placeholder="Area/Locality"
            />
          </div>
          <div className="form-group">
            <label>Address</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              placeholder="Full address"
              rows={3}
            />
          </div>
          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-cancel">Cancel</button>
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? 'Saving...' : (customer ? 'Update' : 'Add Customer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CableCustomers;
