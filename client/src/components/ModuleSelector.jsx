import { useState } from 'react';

function ModuleSelector({ onSelectModule, onLogout, onUserManagement }) {
  const [hoveredModule, setHoveredModule] = useState(null);
  const userName = localStorage.getItem('userName') || 'User';
  const userRole = localStorage.getItem('userRole');
  const isAdmin = userRole === 'admin';

  const modules = [
    {
      id: 'tvcable',
      icon: '📺',
      title: 'TV-Cable',
      subtitle: 'Cable Connections',
      color: '#1e40af',
      gradient: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)'
    },
    {
      id: 'chit',
      icon: '🎯',
      title: 'Chit Fund',
      subtitle: 'Monthly Collections',
      color: '#7c3aed',
      gradient: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)'
    },
    {
      id: 'magalirloan',
      icon: '👩‍💼',
      title: 'Magalir Loan',
      subtitle: 'Women Loans',
      color: '#db2777',
      gradient: 'linear-gradient(135deg, #db2777 0%, #be185d 100%)'
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Top Navigation Bar */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>📊</span>
          <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '16px' }}>RaviShankar Tracker</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: isAdmin ? '#dc2626' : '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600
            }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ color: 'white', fontSize: '13px', fontWeight: 500 }}>{userName}</div>
              <div style={{ color: '#94a3b8', fontSize: '10px' }}>{isAdmin ? 'Administrator' : 'User'}</div>
            </div>
          </div>
          {isAdmin && onUserManagement && (
            <button
              onClick={onUserManagement}
              style={{
                background: 'transparent',
                color: '#94a3b8',
                border: '1px solid #374151',
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => { e.target.style.background = '#374151'; e.target.style.color = 'white'; }}
              onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#94a3b8'; }}
            >
              👥 Users
            </button>
          )}
          {onLogout && (
            <button
              onClick={onLogout}
              style={{
                background: 'transparent',
                color: '#ef4444',
                border: '1px solid #ef4444',
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => { e.target.style.background = '#ef4444'; e.target.style.color = 'white'; }}
              onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#ef4444'; }}
            >
              Logout
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <p style={{
            color: '#94a3b8',
            fontSize: '14px',
            margin: '0 0 8px',
            letterSpacing: '3px'
          }}>
            SELECT YOUR MODULE
          </p>
        </div>

      {/* Module Cards */}
      <div style={{
        display: 'flex',
        gap: '20px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: '500px'
      }}>
        {modules.map((module) => (
          <div
            key={module.id}
            onClick={() => onSelectModule(module.id)}
            onMouseEnter={() => setHoveredModule(module.id)}
            onMouseLeave={() => setHoveredModule(null)}
            style={{
              background: module.gradient,
              borderRadius: '20px',
              padding: '30px 40px',
              cursor: 'pointer',
              textAlign: 'center',
              minWidth: '180px',
              boxShadow: hoveredModule === module.id
                ? `0 20px 40px rgba(0,0,0,0.4), 0 0 30px ${module.color}40`
                : '0 10px 30px rgba(0,0,0,0.3)',
              transform: hoveredModule === module.id ? 'translateY(-8px) scale(1.02)' : 'translateY(0)',
              transition: 'all 0.3s ease',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <div style={{
              fontSize: '48px',
              marginBottom: '15px',
              filter: hoveredModule === module.id ? 'drop-shadow(0 0 10px rgba(255,255,255,0.5))' : 'none',
              transition: 'filter 0.3s ease'
            }}>
              {module.icon}
            </div>
            <h2 style={{
              color: 'white',
              fontSize: '22px',
              fontWeight: 700,
              margin: '0 0 8px'
            }}>
              {module.title}
            </h2>
            <p style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '12px',
              margin: 0
            }}>
              {module.subtitle}
            </p>
          </div>
        ))}
      </div>

        {/* Footer */}
        <p style={{
          color: '#64748b',
          fontSize: '11px',
          marginTop: '40px'
        }}>
          Select a module to continue
        </p>
      </div>
    </div>
  );
}

export default ModuleSelector;
