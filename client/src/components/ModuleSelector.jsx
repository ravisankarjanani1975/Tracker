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
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative'
    }}>
      {/* Top Bar with User Info */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <span style={{ color: '#94a3b8', fontSize: '14px' }}>
          Welcome, <strong style={{ color: '#f59e0b' }}>{userName}</strong>
          {isAdmin && <span style={{ marginLeft: '8px', background: '#dc2626', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '10px' }}>ADMIN</span>}
        </span>
        {isAdmin && onUserManagement && (
          <button
            onClick={onUserManagement}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            👥 User Management
          </button>
        )}
        {onLogout && (
          <button
            onClick={onLogout}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            Logout
          </button>
        )}
      </div>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{
          color: '#f59e0b',
          fontSize: '28px',
          fontWeight: 800,
          margin: 0,
          textShadow: '0 2px 10px rgba(245, 158, 11, 0.3)'
        }}>
          RaviShankar Tracker
        </h1>
        <p style={{
          color: '#94a3b8',
          fontSize: '14px',
          margin: '8px 0 0',
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
  );
}

export default ModuleSelector;
