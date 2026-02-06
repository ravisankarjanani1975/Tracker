import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import ModuleSelector from './components/ModuleSelector';
import CableDashboard from './components/CableDashboard';
import ChitDashboard from './components/ChitDashboard';
import MagalirDashboard from './components/MagalirDashboard';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import './App.css';

// Password version - must match Login.jsx
const PASSWORD_VERSION = '2025-01-27-v2';

// Chit Dashboard Wrapper
function ChitDashboardWrapper({ onBackToModules }) {
  const navigate = useNavigate();
  return <ChitDashboard navigateTo={(path) => navigate(`/${path}`)} onBackToModules={onBackToModules} />;
}

// Main App Content with module selection
function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const storedVersion = localStorage.getItem('passwordVersion');
    return storedVersion === PASSWORD_VERSION;
  });

  const [selectedModule, setSelectedModule] = useState(() => {
    return localStorage.getItem('selectedModule') || null;
  });

  useEffect(() => {
    if (selectedModule) {
      localStorage.setItem('selectedModule', selectedModule);
    } else {
      localStorage.removeItem('selectedModule');
    }
  }, [selectedModule]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('passwordVersion');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('selectedModule');
    setIsAuthenticated(false);
    setSelectedModule(null);
  };

  const handleBackToModules = () => {
    setSelectedModule(null);
  };

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const handleUserManagement = () => {
    setSelectedModule('usermanagement');
  };

  // Show module selector if no module selected
  if (!selectedModule) {
    return <ModuleSelector onSelectModule={setSelectedModule} onLogout={handleLogout} onUserManagement={handleUserManagement} />;
  }

  // USER MANAGEMENT (Admin only)
  if (selectedModule === 'usermanagement') {
    return (
      <div className="app">
        <UserManagement navigateTo={() => setSelectedModule(null)} />
      </div>
    );
  }

  // TV-CABLE MODULE
  if (selectedModule === 'tvcable') {
    return (
      <div className="app">
        <Routes>
          <Route path="/dashboard" element={<CableDashboard onBackToModules={handleBackToModules} />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    );
  }

  // CHIT FUND MODULE
  if (selectedModule === 'chit') {
    return (
      <div className="app">
        <Routes>
          <Route path="/chit-dashboard" element={<ChitDashboardWrapper onBackToModules={handleBackToModules} />} />
          <Route path="*" element={<Navigate to="/chit-dashboard" replace />} />
        </Routes>
      </div>
    );
  }

  // MAGALIR LOAN MODULE
  if (selectedModule === 'magalirloan') {
    return (
      <div className="app">
        <Routes>
          <Route path="/magalir-dashboard" element={<MagalirDashboard onBackToModules={handleBackToModules} />} />
          <Route path="*" element={<Navigate to="/magalir-dashboard" replace />} />
        </Routes>
      </div>
    );
  }

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AppContent />
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
