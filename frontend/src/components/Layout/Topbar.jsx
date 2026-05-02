import { useState, useEffect, useRef } from 'react';
import { api } from '../../api.js';

const ROLE_COLORS = {
  Manager:     '#2563eb',
  'PIC Travel':'#0d9488',
  Staff:       '#7c3aed',
};

export default function Topbar({ user, onLogout, onProfileUpdate }) {
  const [switchOpen, setSwitchOpen]   = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [chatId, setChatId]           = useState('');
  const [saving, setSaving]           = useState(false);
  const [saveMsg, setSaveMsg]         = useState('');
  const [saveErr, setSaveErr]         = useState('');
  const switchRef = useRef(null);

  const initial      = (user.name || user.email || '?')[0].toUpperCase();
  const avatarColor  = ROLE_COLORS[user.role] || '#64748b';

  // Load telegram_chat_id when profile opens
  useEffect(() => {
    if (!profileOpen) { setSaveMsg(''); setSaveErr(''); return; }
    api.getMe().then(d => setChatId(d.telegram_chat_id || '')).catch(() => {});
  }, [profileOpen]);

  // Close switch dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (switchRef.current && !switchRef.current.contains(e.target)) {
        setSwitchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true); setSaveMsg(''); setSaveErr('');
    try {
      const updated = await api.updateMe({ telegram_chat_id: chatId });
      setSaveMsg('Saved successfully.');
      if (onProfileUpdate) onProfileUpdate(updated);
    } catch (e) {
      setSaveErr(e.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="topbar">
        {/* Left */}
        <div className="topbar-left">
          <span className="logo-icon">✈️</span>
          <div>
            <div className="logo-text">YPJ Travel</div>
            <div className="logo-sub">Campus Travel System</div>
          </div>
        </div>

        {/* Right */}
        <div className="topbar-right">
          {/* Switch App Dropdown — Manager only */}
          {user.role === 'Manager' && (
            <div className="switch-dropdown" ref={switchRef}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setSwitchOpen(o => !o)}
                title="Switch App"
              >
                🔀 Apps
              </button>
              {switchOpen && (
                <div className="switch-menu">
                  <a
                    className="switch-menu-item"
                    href="https://kkinventory.ypj.sch.id"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setSwitchOpen(false)}
                  >
                    🏫 YPJ KK Inventory
                  </a>
                  <a
                    className="switch-menu-item"
                    href="https://tprainventory.ypj.sch.id"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setSwitchOpen(false)}
                  >
                    🏔️ YPJ TPRA Inventory
                  </a>
                  <div className="switch-menu-item current">
                    ✈️ YPJ Travel
                    <span className="badge badge-blue" style={{ marginLeft: 'auto', fontSize: 10 }}>Here</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Avatar */}
          <div
            className="user-avatar"
            style={{ background: avatarColor }}
            onClick={() => setProfileOpen(true)}
            title="Profile"
          >
            {initial}
          </div>

          {/* Sign Out */}
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Profile Modal */}
      {profileOpen && (
        <div className="modal-overlay" onClick={() => setProfileOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">My Profile</div>
              <button className="modal-close" onClick={() => setProfileOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <div className="user-avatar" style={{ background: avatarColor, width: 48, height: 48, fontSize: 20 }}>
                  {initial}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>{user.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>{user.email}</div>
                  <span className={`badge badge-${user.role === 'Manager' ? 'blue' : user.role === 'PIC Travel' ? 'teal' : 'purple'}`} style={{ marginTop: 4 }}>
                    {user.role}
                  </span>
                </div>
              </div>

              {saveMsg && <div className="success-box">{saveMsg}</div>}
              {saveErr && <div className="error-box">{saveErr}</div>}

              <div className="form-group">
                <label className="form-label">Telegram Chat ID</label>
                <input
                  className="form-input"
                  value={chatId}
                  onChange={e => setChatId(e.target.value)}
                  placeholder="e.g. 123456789"
                />
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                  To get your Chat ID: open Telegram, search for <strong>@ypjtravel_bot</strong>,
                  send <code>/start</code>, and copy the ID it sends back. This enables travel status notifications.
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setProfileOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
