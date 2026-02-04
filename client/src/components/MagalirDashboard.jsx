import { useState } from 'react';
import useSWR from 'swr';
import { API_URL } from '../config';
import MagalirGroups from './MagalirGroups';
import MagalirCollection from './MagalirCollection';
import './MagalirDashboard.css';

const fetcher = (url) => fetch(url).then(res => res.json());

function MagalirDashboard({ onBackToModules }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);

  // Fetch stats
  const { data: stats, mutate: mutateStats } = useSWR(`${API_URL}/magalir/stats`, fetcher, {
    refreshInterval: 30000
  });

  // Fetch groups
  const { data: groups = [], mutate: mutateGroups, isLoading } = useSWR(
    `${API_URL}/magalir/groups`,
    fetcher,
    { refreshInterval: 30000 }
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getMonthName = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  // Handle group selection for collection
  const handleGroupClick = (group) => {
    setSelectedGroup(group);
    setActiveTab('collection');
  };

  // Add new group
  const handleAddGroup = async (formData) => {
    try {
      const response = await fetch(`${API_URL}/magalir/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed');
      }
      mutateGroups();
      mutateStats();
      setShowAddGroup(false);
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  // Delete group
  const handleDeleteGroup = async (group) => {
    if (!confirm(`Delete "${group.name}"? This will remove all members and payment history.`)) return;
    try {
      await fetch(`${API_URL}/magalir/groups/${group.id}`, { method: 'DELETE' });
      mutateGroups();
      mutateStats();
    } catch (error) {
      alert('Error deleting group');
    }
  };

  if (activeTab === 'groups') {
    return <MagalirGroups onBack={() => setActiveTab('dashboard')} />;
  }

  if (activeTab === 'collection' && selectedGroup) {
    return (
      <MagalirCollection
        group={selectedGroup}
        onBack={() => { setSelectedGroup(null); setActiveTab('dashboard'); }}
      />
    );
  }

  return (
    <div className="magalir-dashboard">
      {/* Sidebar */}
      <div className={`sidebar ${showSidebar ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Magalir Loan</h2>
          <button className="close-sidebar" onClick={() => setShowSidebar(false)}>x</button>
        </div>
        <nav className="sidebar-nav">
          <button className="nav-item active" onClick={() => { setActiveTab('dashboard'); setShowSidebar(false); }}>
            <span>🏠</span> Overview
          </button>
          <button className="nav-item" onClick={() => { setActiveTab('groups'); setShowSidebar(false); }}>
            <span>👥</span> All Groups
          </button>
          <div className="nav-divider"></div>
          <button className="nav-item back-modules" onClick={onBackToModules}>
            <span>🔙</span> Switch Module
          </button>
        </nav>
      </div>

      {showSidebar && <div className="sidebar-overlay" onClick={() => setShowSidebar(false)}></div>}

      {/* Header */}
      <header className="magalir-header">
        <div className="header-left">
          <button className="hamburger" onClick={() => setShowSidebar(true)}>
            <span></span>
            <span></span>
            <span></span>
          </button>
          <h1>Magalir Loan Tracker</h1>
        </div>
        <div className="header-right">
          <span className="current-month">{getMonthName(stats?.currentMonth)}</span>
        </div>
      </header>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card groups">
          <div className="stat-icon">📁</div>
          <div className="stat-info">
            <span className="stat-value">{stats?.totalGroups || 0}</span>
            <span className="stat-label">Total Groups</span>
          </div>
        </div>
        <div className="stat-card members">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <span className="stat-value">{stats?.totalMembers || 0}</span>
            <span className="stat-label">Total Members</span>
          </div>
        </div>
        <div className="stat-card collected">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <span className="stat-value">{formatCurrency(stats?.collectedThisMonth)}</span>
            <span className="stat-label">Collected This Month</span>
          </div>
        </div>
        <div className="stat-card payments">
          <div className="stat-icon">✓</div>
          <div className="stat-info">
            <span className="stat-value">{stats?.paidThisMonth || 0}</span>
            <span className="stat-label">Payments This Month</span>
          </div>
        </div>
      </div>

      {/* Groups Section */}
      <div className="groups-section">
        <div className="section-header">
          <h2>Your Groups / Batches</h2>
          <button className="add-group-btn" onClick={() => setShowAddGroup(true)}>
            + New Group
          </button>
        </div>

        {isLoading ? (
          <div className="loading">Loading...</div>
        ) : groups.length === 0 ? (
          <div className="empty-state">
            <p>No groups yet. Create your first group to get started!</p>
            <button className="create-first-btn" onClick={() => setShowAddGroup(true)}>
              + Create First Group
            </button>
          </div>
        ) : (
          <div className="groups-grid">
            {groups.map(group => (
              <div key={group.id} className="group-card" onClick={() => handleGroupClick(group)}>
                <div className="group-header">
                  <h3>{group.name}</h3>
                  <button
                    className="delete-btn"
                    onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group); }}
                  >
                    x
                  </button>
                </div>
                {group.description && <p className="group-desc">{group.description}</p>}
                <div className="group-stats">
                  <span className="members-count">
                    👥 {group.member_count || 0} members
                  </span>
                  <span className="monthly-amount">
                    {formatCurrency(group.monthly_amount)}/month
                  </span>
                </div>
                <div className="group-action">
                  <span>View Collection →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Group Modal */}
      {showAddGroup && (
        <AddGroupModal
          onSave={handleAddGroup}
          onClose={() => setShowAddGroup(false)}
        />
      )}
    </div>
  );
}

// Add Group Modal Component
function AddGroupModal({ onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    monthly_amount: ''
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Group</h2>
          <button className="close-btn" onClick={onClose}>x</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Group Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Monthly, UlKadan, Santha"
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description"
            />
          </div>
          <div className="form-group">
            <label>Monthly Amount (Rs)</label>
            <input
              type="number"
              value={formData.monthly_amount}
              onChange={(e) => setFormData({ ...formData, monthly_amount: e.target.value })}
              placeholder="Amount each member pays monthly"
            />
          </div>
          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-cancel">Cancel</button>
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MagalirDashboard;
