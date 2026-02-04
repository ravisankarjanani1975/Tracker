import { useState } from 'react';
import useSWR from 'swr';
import { API_URL } from '../config';
import './MagalirGroups.css';

const fetcher = (url) => fetch(url).then(res => res.json());

function MagalirGroups({ onBack }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editGroup, setEditGroup] = useState(null);

  const { data: groups = [], mutate, isLoading } = useSWR(
    `${API_URL}/magalir/groups`,
    fetcher
  );

  const formatCurrency = (amount) => {
    return `₹${(amount || 0).toLocaleString('en-IN')}`;
  };

  const filteredGroups = groups.filter(g => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return g.name?.toLowerCase().includes(search) ||
           g.description?.toLowerCase().includes(search);
  });

  const handleUpdateGroup = async (formData) => {
    try {
      await fetch(`${API_URL}/magalir/groups/${editGroup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      mutate();
      setEditGroup(null);
    } catch (error) {
      alert('Error updating group');
    }
  };

  const handleDeleteGroup = async (group) => {
    if (!confirm(`Delete "${group.name}"? This will remove all members and payments.`)) return;
    try {
      await fetch(`${API_URL}/magalir/groups/${group.id}`, { method: 'DELETE' });
      mutate();
    } catch (error) {
      alert('Error deleting group');
    }
  };

  return (
    <div className="magalir-groups">
      <header className="page-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h1>All Groups</h1>
      </header>

      <input
        type="text"
        placeholder="Search groups..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-input"
      />

      <div className="stats-bar">
        <span>Total Groups: {filteredGroups.length}</span>
        <span>Total Members: {filteredGroups.reduce((sum, g) => sum + (g.member_count || 0), 0)}</span>
      </div>

      {isLoading ? (
        <div className="loading">Loading...</div>
      ) : filteredGroups.length === 0 ? (
        <div className="empty">No groups found</div>
      ) : (
        <div className="groups-list">
          {filteredGroups.map(group => (
            <div key={group.id} className="group-item">
              <div className="group-info">
                <h3>{group.name}</h3>
                {group.description && <p className="description">{group.description}</p>}
                <div className="group-meta">
                  <span>👥 {group.member_count || 0} members</span>
                  <span>💰 {formatCurrency(group.monthly_amount)}/month</span>
                  <span className={`status ${group.status}`}>{group.status || 'active'}</span>
                </div>
              </div>
              <div className="group-actions">
                <button className="btn-edit" onClick={() => setEditGroup(group)}>Edit</button>
                <button className="btn-delete" onClick={() => handleDeleteGroup(group)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editGroup && (
        <div className="modal-overlay" onClick={() => setEditGroup(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Group</h2>
              <button className="close-btn" onClick={() => setEditGroup(null)}>x</button>
            </div>
            <EditGroupForm group={editGroup} onSave={handleUpdateGroup} onClose={() => setEditGroup(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

function EditGroupForm({ group, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: group.name || '',
    description: group.description || '',
    monthly_amount: group.monthly_amount || '',
    status: group.status || 'active'
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Group name is required');
      return;
    }
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="modal-body">
      <div className="form-group">
        <label>Group Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      <div className="form-group">
        <label>Description</label>
        <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label>Monthly Amount (Rs)</label>
        <input
          type="number"
          value={formData.monthly_amount}
          onChange={(e) => setFormData({ ...formData, monthly_amount: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label>Status</label>
        <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <div className="form-actions">
        <button type="button" onClick={onClose} className="btn-cancel">Cancel</button>
        <button type="submit" className="btn-save" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

export default MagalirGroups;
