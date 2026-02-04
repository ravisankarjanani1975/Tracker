import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { API_URL } from '../config';
import './CableSettings.css';

const fetcher = (url) => fetch(url).then(res => res.json());

function CableSettings({ onBack }) {
  const [activeSection, setActiveSection] = useState('reminders');

  // Fetch settings
  const { data: settings, mutate } = useSWR(`${API_URL}/settings`, fetcher, {
    fallbackData: {
      reminderDay: 1,
      reminderEnabled: false,
      businessName: 'Cable TV Service',
      businessPhone: '',
      staffMembers: []
    }
  });

  const [formData, setFormData] = useState({
    reminderDay: 1,
    reminderEnabled: false,
    businessName: 'Cable TV Service',
    businessPhone: ''
  });

  const [newStaff, setNewStaff] = useState({ name: '', phone: '', role: 'collector' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        reminderDay: settings.reminderDay || 1,
        reminderEnabled: settings.reminderEnabled || false,
        businessName: settings.businessName || 'Cable TV Service',
        businessPhone: settings.businessPhone || ''
      });
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      mutate();
      alert('Settings saved!');
    } catch (error) {
      alert('Error saving settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.phone) {
      alert('Name and phone are required');
      return;
    }

    try {
      await fetch(`${API_URL}/settings/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStaff)
      });
      setNewStaff({ name: '', phone: '', role: 'collector' });
      mutate();
    } catch (error) {
      alert('Error adding staff: ' + error.message);
    }
  };

  const handleRemoveStaff = async (staffId) => {
    if (!confirm('Remove this staff member?')) return;

    try {
      await fetch(`${API_URL}/settings/staff/${staffId}`, { method: 'DELETE' });
      mutate();
    } catch (error) {
      alert('Error removing staff: ' + error.message);
    }
  };

  return (
    <div className="cable-settings">
      {/* Header */}
      <header className="settings-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h1>Settings</h1>
      </header>

      {/* Section Tabs */}
      <div className="section-tabs">
        <button
          className={`tab-btn ${activeSection === 'reminders' ? 'active' : ''}`}
          onClick={() => setActiveSection('reminders')}
        >
          Reminders
        </button>
        <button
          className={`tab-btn ${activeSection === 'business' ? 'active' : ''}`}
          onClick={() => setActiveSection('business')}
        >
          Business Info
        </button>
        <button
          className={`tab-btn ${activeSection === 'staff' ? 'active' : ''}`}
          onClick={() => setActiveSection('staff')}
        >
          Staff
        </button>
      </div>

      {/* Reminders Section */}
      {activeSection === 'reminders' && (
        <div className="settings-section">
          <h2>Auto Reminder Settings</h2>
          <p className="section-desc">Configure automatic WhatsApp reminders for unpaid customers</p>

          <div className="setting-group">
            <label className="toggle-label">
              <span>Enable Auto Reminders</span>
              <div className={`toggle ${formData.reminderEnabled ? 'on' : ''}`}
                onClick={() => setFormData({ ...formData, reminderEnabled: !formData.reminderEnabled })}>
                <div className="toggle-knob"></div>
              </div>
            </label>
          </div>

          <div className="setting-group">
            <label>Reminder Day of Month</label>
            <select
              value={formData.reminderDay}
              onChange={(e) => setFormData({ ...formData, reminderDay: parseInt(e.target.value) })}
              disabled={!formData.reminderEnabled}
            >
              {Array.from({ length: 28 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}</option>
              ))}
            </select>
            <span className="hint">Reminders will be sent on this day each month</span>
          </div>

          <div className="reminder-preview">
            <h3>Reminder Message Preview</h3>
            <div className="preview-box">
              <p>🔔 *Payment Reminder*</p>
              <p>Dear [Customer Name],</p>
              <p>Your cable TV subscription for *[Month]* is pending.</p>
              <p>Amount Due: *₹[Amount]*</p>
              <p>Please pay at your earliest convenience.</p>
              <p>Thank you! 🙏</p>
            </div>
          </div>

          <button className="save-btn" onClick={handleSaveSettings} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}

      {/* Business Info Section */}
      {activeSection === 'business' && (
        <div className="settings-section">
          <h2>Business Information</h2>
          <p className="section-desc">This information appears on receipts and messages</p>

          <div className="setting-group">
            <label>Business Name</label>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              placeholder="Your business name"
            />
          </div>

          <div className="setting-group">
            <label>Business Phone</label>
            <input
              type="tel"
              value={formData.businessPhone}
              onChange={(e) => setFormData({ ...formData, businessPhone: e.target.value })}
              placeholder="10-digit phone number"
            />
          </div>

          <button className="save-btn" onClick={handleSaveSettings} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}

      {/* Staff Section */}
      {activeSection === 'staff' && (
        <div className="settings-section">
          <h2>Staff Management</h2>
          <p className="section-desc">Add staff members who can collect payments</p>

          {/* Add Staff Form */}
          <div className="add-staff-form">
            <h3>Add New Staff</h3>
            <div className="staff-form-row">
              <input
                type="text"
                value={newStaff.name}
                onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                placeholder="Staff name"
              />
              <input
                type="tel"
                value={newStaff.phone}
                onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                placeholder="Phone number"
              />
              <select
                value={newStaff.role}
                onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
              >
                <option value="collector">Collector</option>
                <option value="admin">Admin</option>
              </select>
              <button className="add-staff-btn" onClick={handleAddStaff}>+ Add</button>
            </div>
          </div>

          {/* Staff List */}
          <div className="staff-list">
            <h3>Staff Members ({settings?.staffMembers?.length || 0})</h3>
            {!settings?.staffMembers?.length ? (
              <p className="no-staff">No staff members added yet</p>
            ) : (
              settings.staffMembers.map(staff => (
                <div key={staff.id} className="staff-item">
                  <div className="staff-info">
                    <span className="staff-name">{staff.name}</span>
                    <span className="staff-phone">📱 {staff.phone}</span>
                    <span className={`staff-role ${staff.role}`}>{staff.role}</span>
                  </div>
                  <button
                    className="remove-staff-btn"
                    onClick={() => handleRemoveStaff(staff.id)}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="staff-note">
            <p>💡 <strong>Note:</strong> Staff access feature requires Firebase Authentication setup.
              Currently, staff information is stored for reference. Full login functionality
              can be enabled by configuring Firebase Auth in your project.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default CableSettings;
