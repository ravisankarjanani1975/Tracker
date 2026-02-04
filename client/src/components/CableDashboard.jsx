import { useState, useRef } from 'react';
import useSWR from 'swr';
import { API_URL } from '../config';
import CableCustomers from './CableCustomers';
import CableCollection from './CableCollection';
import CableReports from './CableReports';
import CableSettings from './CableSettings';
import './CableDashboard.css';

const fetcher = (url) => fetch(url).then(res => res.json());

function CableDashboard({ onBackToModules }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSidebar, setShowSidebar] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef(null);

  // Get current month
  const currentMonth = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();

  // Fetch stats
  const { data: stats, isLoading, mutate } = useSWR(`${API_URL}/stats`, fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });

  // Fetch customers for export
  const { data: customers = [] } = useSWR(`${API_URL}/customers`, fetcher);

  // Fetch collection data for quick view
  const { data: collectionData, mutate: mutateCollection } = useSWR(
    `${API_URL}/collection?month=${currentMonth}`,
    fetcher,
    { refreshInterval: 15000 }
  );

  const collection = collectionData?.collection || [];
  const paidList = collection.filter(item => item.paid).slice(0, 5);
  const unpaidList = collection.filter(item => !item.paid).slice(0, 5);

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

  // Quick mark as paid
  const handleQuickPay = async (item) => {
    try {
      const response = await fetch(`${API_URL}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: item.customer_id,
          month: currentMonth,
          amount: item.monthly_amount,
          payment_mode: 'cash'
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed');
      }

      mutate();
      mutateCollection();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  // Backup data
  const handleBackup = async () => {
    try {
      setIsBackingUp(true);
      const response = await fetch(`${API_URL}/backup`);
      const data = await response.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `cable-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();

      alert('Backup downloaded successfully!');
    } catch (error) {
      alert('Error creating backup: ' + error.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  // Restore data
  const handleRestore = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('This will replace all existing data. Are you sure?')) {
      e.target.value = '';
      return;
    }

    try {
      setIsRestoring(true);
      const text = await file.text();
      const backupData = JSON.parse(text);

      if (!backupData.data || !backupData.data.customers) {
        throw new Error('Invalid backup file format');
      }

      const response = await fetch(`${API_URL}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: backupData.data, mode: 'replace' })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Restore failed');
      }

      alert(`Restored ${result.importedCustomers} customers and ${result.importedPayments} payments!`);
      mutate();
      mutateCollection();
    } catch (error) {
      alert('Error restoring data: ' + error.message);
    } finally {
      setIsRestoring(false);
      e.target.value = '';
    }
  };

  // Export to Excel/CSV
  const exportToExcel = () => {
    if (!customers || customers.length === 0) {
      alert('No customers to export');
      return;
    }

    const headers = ['Name', 'Phone', 'STB Number', 'Area', 'Monthly Amount', 'Status', 'Address'];
    const csvContent = [
      headers.join(','),
      ...customers.map(c => [
        `"${c.name || ''}"`,
        `"${c.phone || ''}"`,
        `"${c.stb_number || ''}"`,
        `"${c.area || ''}"`,
        c.monthly_amount || 0,
        `"${c.status || ''}"`,
        `"${c.address || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cable-customers-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (activeTab === 'customers') {
    return <CableCustomers onBack={() => setActiveTab('dashboard')} />;
  }

  if (activeTab === 'collection') {
    return <CableCollection onBack={() => setActiveTab('dashboard')} />;
  }

  if (activeTab === 'reports') {
    return <CableReports onBack={() => setActiveTab('dashboard')} />;
  }

  if (activeTab === 'settings') {
    return <CableSettings onBack={() => setActiveTab('dashboard')} />;
  }

  return (
    <div className="cable-dashboard">
      {/* Sidebar */}
      <div className={`sidebar ${showSidebar ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>📺 Cable Tracker</h2>
          <button className="close-sidebar" onClick={() => setShowSidebar(false)}>×</button>
        </div>
        <nav className="sidebar-nav">
          <button className="nav-item active" onClick={() => { setActiveTab('dashboard'); setShowSidebar(false); }}>
            <span>🏠</span> Dashboard
          </button>
          <button className="nav-item" onClick={() => { setActiveTab('customers'); setShowSidebar(false); }}>
            <span>👥</span> Customers
          </button>
          <button className="nav-item" onClick={() => { setActiveTab('collection'); setShowSidebar(false); }}>
            <span>📋</span> Collection
          </button>
          <button className="nav-item" onClick={() => { setActiveTab('reports'); setShowSidebar(false); }}>
            <span>📊</span> Reports
          </button>
          <button className="nav-item" onClick={() => { setActiveTab('settings'); setShowSidebar(false); }}>
            <span>⚙️</span> Settings
          </button>
          <button className="nav-item" onClick={() => { exportToExcel(); setShowSidebar(false); }}>
            <span>📥</span> Export Excel
          </button>
          <div className="nav-divider"></div>
          <button className="nav-item" onClick={() => { handleBackup(); setShowSidebar(false); }} disabled={isBackingUp}>
            <span>💾</span> {isBackingUp ? 'Backing up...' : 'Backup Data'}
          </button>
          <button className="nav-item" onClick={() => { fileInputRef.current?.click(); setShowSidebar(false); }} disabled={isRestoring}>
            <span>📤</span> {isRestoring ? 'Restoring...' : 'Restore Data'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleRestore}
            style={{ display: 'none' }}
          />
          <div className="nav-divider"></div>
          <button className="nav-item back-modules" onClick={onBackToModules}>
            <span>🔙</span> Switch Module
          </button>
        </nav>
      </div>

      {/* Overlay */}
      {showSidebar && <div className="sidebar-overlay" onClick={() => setShowSidebar(false)}></div>}

      {/* Header */}
      <header className="cable-header">
        <div className="header-left">
          <button className="hamburger" onClick={() => setShowSidebar(true)}>
            <span></span>
            <span></span>
            <span></span>
          </button>
          <h1>Cable Connection Tracker</h1>
        </div>
        <div className="header-right">
          <span className="current-month">{getMonthName(stats?.currentMonth)}</span>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card active">
          <div className="stat-icon">📺</div>
          <div className="stat-info">
            <span className="stat-value">{stats?.totalActive || 0}</span>
            <span className="stat-label">Active Connections</span>
          </div>
        </div>

        <div className="stat-card inactive">
          <div className="stat-icon">📴</div>
          <div className="stat-info">
            <span className="stat-value">{stats?.totalInactive || 0}</span>
            <span className="stat-label">Inactive</span>
          </div>
        </div>

        <div className="stat-card collected">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <span className="stat-value">{formatCurrency(stats?.collectedThisMonth)}</span>
            <span className="stat-label">Collected This Month</span>
          </div>
        </div>

        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <span className="stat-value">{formatCurrency(stats?.pendingThisMonth)}</span>
            <span className="stat-label">Pending This Month</span>
          </div>
        </div>

        <div className="stat-card total">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <span className="stat-value">{formatCurrency(stats?.totalMonthlyAmount)}</span>
            <span className="stat-label">Total Monthly Revenue</span>
          </div>
        </div>

        <div className="stat-card customers">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <span className="stat-value">{stats?.totalCustomers || 0}</span>
            <span className="stat-label">Total Customers</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <button className="action-btn primary" onClick={() => setActiveTab('collection')}>
            <span className="btn-icon">📋</span>
            <span className="btn-text">Monthly Collection</span>
          </button>

          <button className="action-btn success" onClick={() => setActiveTab('customers')}>
            <span className="btn-icon">👥</span>
            <span className="btn-text">Manage Customers</span>
          </button>

          <button className="action-btn info" onClick={() => setActiveTab('reports')}>
            <span className="btn-icon">📊</span>
            <span className="btn-text">Reports</span>
          </button>

          <button className="action-btn excel" onClick={exportToExcel}>
            <span className="btn-icon">📥</span>
            <span className="btn-text">Export Excel</span>
          </button>
        </div>
      </div>

      {/* Quick Paid/Unpaid View */}
      <div className="quick-collection">
        <div className="quick-collection-header">
          <h2>This Month's Collection</h2>
          <button className="view-all-btn" onClick={() => setActiveTab('collection')}>
            View All →
          </button>
        </div>
        <div className="quick-split-view">
          {/* Unpaid List */}
          <div className="quick-column unpaid">
            <h3 className="quick-column-title unpaid">
              ✗ Unpaid ({collectionData?.summary?.unpaid || 0})
            </h3>
            <div className="quick-list">
              {unpaidList.length === 0 ? (
                <div className="quick-empty">All paid! 🎉</div>
              ) : (
                unpaidList.map(item => (
                  <div key={item.customer_id} className="quick-item">
                    <div className="quick-item-info">
                      <span className="quick-name">{item.customer_name}</span>
                      <span className="quick-amount">₹{item.monthly_amount}</span>
                    </div>
                    <button
                      className="quick-pay-btn"
                      onClick={() => handleQuickPay(item)}
                    >
                      ✓
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Paid List */}
          <div className="quick-column paid">
            <h3 className="quick-column-title paid">
              ✓ Paid ({collectionData?.summary?.paid || 0})
            </h3>
            <div className="quick-list">
              {paidList.length === 0 ? (
                <div className="quick-empty">No payments yet</div>
              ) : (
                paidList.map(item => (
                  <div key={item.customer_id} className="quick-item paid">
                    <div className="quick-item-info">
                      <span className="quick-name">{item.customer_name}</span>
                      <span className="quick-amount paid">₹{item.paid_amount}</span>
                    </div>
                    <span className="quick-date">{new Date(item.paid_date).getDate()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      )}
    </div>
  );
}

export default CableDashboard;
