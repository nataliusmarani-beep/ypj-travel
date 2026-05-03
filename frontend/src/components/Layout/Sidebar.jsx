import { NavLink } from 'react-router-dom';

const ROLE_COLORS = {
  Manager:     '#2563eb',
  'PIC Travel':'#0d9488',
  Staff:       '#7c3aed',
};

export default function Sidebar({ user }) {
  const isPIC     = user.role === 'Manager' || user.role === 'PIC Travel';
  const isManager = user.role === 'Manager';

  const initial = (user.name || user.email || '?')[0].toUpperCase();
  const avatarColor = ROLE_COLORS[user.role] || '#64748b';

  return (
    <nav className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ fontSize: 24, marginBottom: 6 }}>✈️</div>
        <div className="sidebar-logo-text">YPJ Travel</div>
        <div className="sidebar-logo-sub">School Travel System</div>
      </div>

      {/* Main section */}
      <div className="sidebar-section">Main</div>
      <NavLink
        to="/"
        end
        className={({ isActive }) => 'sidebar-item' + (isActive ? ' active' : '')}
      >
        🏠 Dashboard
      </NavLink>
      <NavLink
        to="/new-request"
        className={({ isActive }) => 'sidebar-item' + (isActive ? ' active' : '')}
      >
        ✈️ New Request
      </NavLink>
      <NavLink
        to="/my-requests"
        className={({ isActive }) => 'sidebar-item' + (isActive ? ' active' : '')}
      >
        📋 My Requests
      </NavLink>
      <NavLink
        to="/rti"
        className={({ isActive }) => 'sidebar-item' + (isActive ? ' active' : '')}
      >
        📅 RTI Events
      </NavLink>
      <NavLink
        to="/flights"
        className={({ isActive }) => 'sidebar-item' + (isActive ? ' active' : '')}
      >
        🛫 Airfast Schedule
      </NavLink>

      {/* PIC Travel section */}
      {isPIC && (
        <>
          <div className="sidebar-section">PIC Travel</div>
          <NavLink
            to="/requests"
            className={({ isActive }) => 'sidebar-item' + (isActive ? ' active' : '')}
          >
            📂 All Requests
          </NavLink>
          <NavLink
            to="/rti-manage"
            className={({ isActive }) => 'sidebar-item' + (isActive ? ' active' : '')}
          >
            🗂️ Manage RTI
          </NavLink>
          <NavLink
            to="/export"
            className={({ isActive }) => 'sidebar-item' + (isActive ? ' active' : '')}
          >
            ⬇️ Export Excel
          </NavLink>
        </>
      )}

      {/* Admin section */}
      {isManager && (
        <>
          <div className="sidebar-section">Admin</div>
          <NavLink
            to="/users"
            className={({ isActive }) => 'sidebar-item' + (isActive ? ' active' : '')}
          >
            👥 Users
          </NavLink>
        </>
      )}

      {/* User info at bottom */}
      <div style={{ flex: 1 }} />
      <div className="sidebar-user">
        <div
          className="user-avatar"
          style={{ background: avatarColor, width: 32, height: 32, fontSize: 12 }}
        >
          {initial}
        </div>
        <div>
          <div className="sidebar-user-name">{user.name || user.email}</div>
          <div className="sidebar-user-role">{user.role}</div>
        </div>
      </div>
    </nav>
  );
}
