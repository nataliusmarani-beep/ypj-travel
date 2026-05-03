import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { api } from './api.js';
import Topbar from './components/Layout/Topbar.jsx';
import Sidebar from './components/Layout/Sidebar.jsx';
import MobileNav from './components/Layout/MobileNav.jsx';
import Toast from './components/Toast.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SetPasswordPage from './pages/SetPasswordPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import NewRequestPage from './pages/NewRequestPage.jsx';
import MyRequestsPage from './pages/MyRequestsPage.jsx';
import RTIEventsPage from './pages/RTIEventsPage.jsx';
import AllRequestsPage from './pages/AllRequestsPage.jsx';
import RTIManagePage from './pages/RTIManagePage.jsx';
import FlightSchedulesPage from './pages/FlightSchedulesPage.jsx';
import ExportPage from './pages/ExportPage.jsx';
import UsersPage from './pages/UsersPage.jsx';

export default function App() {
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]   = useState(null);
  const navigate = useNavigate();

  const showToast = (message, type = 'info') => setToast({ message, type });

  useEffect(() => {
    api.me().then(setUser).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await api.logout().catch(() => {});
    setUser(null);
    navigate('/login');
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontSize:24 }}>
      ✈️
    </div>
  );

  if (!user) return (
    <Routes>
      <Route path="/login" element={<LoginPage onLogin={setUser} />} />
      <Route path="/set-password" element={<SetPasswordPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );

  const isPIC = user.role === 'Manager' || user.role === 'PIC Travel';

  return (
    <div className="app-layout">
      <Sidebar user={user} />
      <div className="main-content">
        <Topbar user={user} onLogout={handleLogout} onProfileUpdate={setUser} />
        <div className="page-content">
          <Routes>
            <Route path="/"              element={<DashboardPage user={user} />} />
            <Route path="/new-request"   element={<NewRequestPage user={user} />} />
            <Route path="/my-requests"   element={<MyRequestsPage user={user} />} />
            <Route path="/rti"           element={<RTIEventsPage user={user} />} />
            <Route path="/flights"       element={<FlightSchedulesPage user={user} showToast={showToast} />} />
            {isPIC && <>
              <Route path="/requests"    element={<AllRequestsPage user={user} />} />
              <Route path="/rti-manage"  element={<RTIManagePage user={user} />} />
              <Route path="/export"      element={<ExportPage user={user} />} />
            </>}
            {user.role === 'Manager' && (
              <Route path="/users"       element={<UsersPage user={user} />} />
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <footer className="app-footer">
            <span className="footer-copy">© {new Date().getFullYear()} Yayasan Pendidikan Jayawijaya. All rights reserved.</span>
            <span className="footer-links">
              📧{' '}
              <a href="mailto:nmarani@fmi.com">nmarani@fmi.com</a>
              {' · '}
              🌐{' '}
              <a href="https://ypj.sch.id" target="_blank" rel="noreferrer">ypj.sch.id</a>
            </span>
          </footer>
        </div>
      </div>
      <MobileNav user={user} onLogout={handleLogout} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
