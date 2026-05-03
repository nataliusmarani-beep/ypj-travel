import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const ROLE_COLORS = {
  Manager:     '#2563eb',
  'PIC Travel':'#0d9488',
  Staff:       '#7c3aed',
};

export default function MobileNav({ user, onLogout }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  const isPIC     = user.role === 'Manager' || user.role === 'PIC Travel';
  const isManager = user.role === 'Manager';
  const avatarColor = ROLE_COLORS[user.role] || '#64748b';
  const initial     = (user.name || user.email || '?')[0].toUpperCase();

  const tabStyle = (isActive) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    padding: '6px 0',
    flex: 1,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 18,
    color: isActive ? '#2563eb' : '#94a3b8',
    textDecoration: 'none',
    minWidth: 0,
  });

  const tabLabel = (isActive, label) => ({
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.02em',
    color: isActive ? '#2563eb' : '#94a3b8',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  });

  /* Drawer item */
  const DrawerLink = ({ to, icon, label, onClick }) => (
    <NavLink
      to={to}
      onClick={() => { setDrawerOpen(false); onClick?.(); }}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 20px',
        fontSize: 15,
        fontWeight: isActive ? 700 : 500,
        color: isActive ? '#2563eb' : '#1e293b',
        background: isActive ? '#eff6ff' : 'transparent',
        textDecoration: 'none',
        borderRadius: 12,
        marginBottom: 2,
      })}
    >
      <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{icon}</span>
      {label}
    </NavLink>
  );

  return (
    <>
      {/* ── Bottom Tab Bar ── */}
      <nav className="mobile-bottom-nav">
        <NavLink to="/" end style={({ isActive }) => tabStyle(isActive)}>
          {({ isActive }) => (
            <>
              <span>🏠</span>
              <span style={tabLabel(isActive)}>Home</span>
            </>
          )}
        </NavLink>

        <NavLink to="/new-request" style={({ isActive }) => tabStyle(isActive)}>
          {({ isActive }) => (
            <>
              <span>✈️</span>
              <span style={tabLabel(isActive)}>New</span>
            </>
          )}
        </NavLink>

        <NavLink to="/my-requests" style={({ isActive }) => tabStyle(isActive)}>
          {({ isActive }) => (
            <>
              <span>📋</span>
              <span style={tabLabel(isActive)}>My Trips</span>
            </>
          )}
        </NavLink>

        <NavLink to="/rti" style={({ isActive }) => tabStyle(isActive)}>
          {({ isActive }) => (
            <>
              <span>📅</span>
              <span style={tabLabel(isActive)}>RTI</span>
            </>
          )}
        </NavLink>

        <button
          onClick={() => setDrawerOpen(true)}
          style={tabStyle(false)}
        >
          <span>☰</span>
          <span style={tabLabel(false)}>More</span>
        </button>
      </nav>

      {/* ── Drawer overlay ── */}
      {drawerOpen && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="mobile-drawer"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, marginBottom: 4 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e2e8f0' }} />
            </div>

            {/* User info */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 20px 16px',
              borderBottom: '1px solid #f1f5f9',
              marginBottom: 10,
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: '50%',
                background: user.avatar ? 'transparent' : avatarColor,
                overflow: 'hidden', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {user.avatar
                  ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>{initial}</span>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name || user.email}
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{user.role} · {user.unit}</div>
              </div>
            </div>

            {/* Drawer links */}
            <div style={{ padding: '0 12px', overflowY: 'auto', flex: 1 }}>

              <DrawerLink to="/flights" icon="🛫" label="Airfast Schedule" />

              {isPIC && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '12px 8px 8px' }}>
                    PIC Travel
                  </div>
                  <DrawerLink to="/requests"  icon="📂" label="All Requests" />
                  <DrawerLink to="/rti-manage" icon="🗂️" label="Manage RTI" />
                  <DrawerLink to="/export"    icon="⬇️" label="Export Excel" />
                </>
              )}

              {isManager && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '12px 8px 8px' }}>
                    Admin
                  </div>
                  <DrawerLink to="/users" icon="👥" label="Users & Accounts" />
                </>
              )}

              <div style={{ height: 1, background: '#f1f5f9', margin: '12px 8px' }} />

              <button
                onClick={() => { setDrawerOpen(false); onLogout(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 20px', fontSize: 15, fontWeight: 500,
                  color: '#ef4444', background: 'transparent', border: 'none',
                  cursor: 'pointer', width: '100%', borderRadius: 12,
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>🚪</span>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
