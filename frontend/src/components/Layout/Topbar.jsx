import { useState, useEffect, useRef } from 'react';
import { api } from '../../api.js';

const ROLE_COLORS = {
  Manager:     '#2563eb',
  'PIC Travel':'#0d9488',
  Staff:       '#7c3aed',
};

const UNIT_OPTIONS    = ['All', 'PAUD', 'SD', 'SMP'];
const CAMPUS_OPTIONS  = ['SD SMP YPJ KK', 'PAUD YPJ KK', 'YPJ TPRA'];
const PREFIX_OPTIONS  = ['Mr', 'Mrs', 'Master', 'Miss'];
const GENDER_OPTIONS  = ['MALE', 'FEMALE'];
const RELATION_OPTIONS = ['Spouse', 'Child', 'Mother', 'Father', 'Mother in Law', 'Father in Law', 'Assistance'];

const emptyDep = () => ({
  prefix: 'Mr', name: '', dependent_id: '', age: '', gender: 'MALE',
  relation: 'Spouse', ktp_number: '',
});

export default function Topbar({ user, onLogout, onProfileUpdate }) {
  const [switchOpen, setSwitchOpen]     = useState(false);
  const [profileOpen, setProfileOpen]   = useState(false);
  const [activeTab, setActiveTab]       = useState('profile'); // 'profile' | 'dependents'
  const switchRef = useRef(null);

  /* ── Profile state ── */
  const [prof, setProf]       = useState({ name: '', employee_id: '', unit: 'All', campus_location: '', telegram_chat_id: '' });
  const [saving, setSaving]   = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveErr, setSaveErr] = useState('');

  /* ── Dependent state ── */
  const [deps, setDeps]       = useState([]);
  const [depsLoading, setDepsLoading] = useState(false);
  const [editing, setEditing] = useState(null);   // null | { _new: true, ...emptyDep() } | { id, ... }
  const [depSaving, setDepSaving]   = useState(false);
  const [depErr, setDepErr]         = useState('');
  const [depMsg, setDepMsg]         = useState('');

  const initial     = (user.name || user.email || '?')[0].toUpperCase();
  const avatarColor = ROLE_COLORS[user.role] || '#64748b';

  /* Load profile + deps when modal opens */
  useEffect(() => {
    if (!profileOpen) { setSaveMsg(''); setSaveErr(''); setEditing(null); return; }
    api.getMe().then(d => {
      setProf({
        name:             d.name            || '',
        employee_id:      d.employee_id     || '',
        unit:             d.unit            || 'All',
        campus_location:  d.campus_location || '',
        telegram_chat_id: d.telegram_chat_id|| '',
      });
    }).catch(() => {});
    loadDeps();
  }, [profileOpen]);

  const loadDeps = () => {
    setDepsLoading(true);
    api.getDependents()
      .then(d => setDeps(d))
      .catch(() => {})
      .finally(() => setDepsLoading(false));
  };

  /* Close switch dropdown on outside click */
  useEffect(() => {
    const handler = e => {
      if (switchRef.current && !switchRef.current.contains(e.target)) setSwitchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Save profile ── */
  const handleSaveProfile = async () => {
    setSaving(true); setSaveMsg(''); setSaveErr('');
    try {
      await api.updateMe(prof);
      setSaveMsg('Profile saved successfully.');
      if (onProfileUpdate) onProfileUpdate({ ...user, name: prof.name });
    } catch (e) {
      setSaveErr(e.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Dependent CRUD ── */
  const handleSaveDep = async () => {
    if (!editing) return;
    if (!editing.name.trim()) { setDepErr('Name is required.'); return; }
    if (!editing.relation)    { setDepErr('Relation is required.'); return; }
    setDepSaving(true); setDepErr(''); setDepMsg('');
    try {
      if (editing._new) {
        await api.createDependent(editing);
        setDepMsg('Dependent added.');
      } else {
        await api.updateDependent(editing.id, editing);
        setDepMsg('Dependent updated.');
      }
      setEditing(null);
      loadDeps();
    } catch (e) {
      setDepErr(e.message || 'Save failed.');
    } finally {
      setDepSaving(false);
    }
  };

  const handleDeleteDep = async (id) => {
    if (!window.confirm('Remove this dependent?')) return;
    try {
      await api.deleteDependent(id);
      setDeps(d => d.filter(x => x.id !== id));
    } catch (e) {
      alert(e.message || 'Delete failed.');
    }
  };

  const fieldStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 };

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
          {/* Switch App — Manager only */}
          {user.role === 'Manager' && (
            <div className="switch-dropdown" ref={switchRef}>
              <button className="btn btn-ghost btn-sm" onClick={() => setSwitchOpen(o => !o)} title="Switch App">
                🔀 Apps
              </button>
              {switchOpen && (
                <div className="switch-menu">
                  <a className="switch-menu-item" href="https://kkinventory.ypj.sch.id" target="_blank" rel="noopener noreferrer" onClick={() => setSwitchOpen(false)}>
                    🏫 YPJ KK Inventory
                  </a>
                  <a className="switch-menu-item" href="https://tprainventory.ypj.sch.id" target="_blank" rel="noopener noreferrer" onClick={() => setSwitchOpen(false)}>
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
          <div className="user-avatar" style={{ background: avatarColor }} onClick={() => setProfileOpen(true)} title="My Profile">
            {initial}
          </div>

          {/* Sign Out */}
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>Sign Out</button>
        </div>
      </div>

      {/* ── Profile Modal ── */}
      {profileOpen && (
        <div className="modal-overlay" onClick={() => setProfileOpen(false)}>
          <div className="modal" style={{ maxWidth: 560, width: '94vw' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">My Profile</div>
              <button className="modal-close" onClick={() => setProfileOpen(false)}>✕</button>
            </div>

            {/* Avatar row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px 0' }}>
              <div className="user-avatar" style={{ background: avatarColor, width: 48, height: 48, fontSize: 20, flexShrink: 0 }}>
                {initial}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>{user.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{user.email}</div>
                <span className={`badge badge-${user.role === 'Manager' ? 'blue' : user.role === 'PIC Travel' ? 'teal' : 'purple'}`} style={{ marginTop: 4 }}>
                  {user.role}
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 20px', marginTop: 14 }}>
              {[['profile','👤 Profile'], ['dependents','👨‍👩‍👧 Dependents']].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { setActiveTab(key); setSaveMsg(''); setSaveErr(''); setDepMsg(''); setDepErr(''); setEditing(null); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '8px 14px', fontSize: 13, fontWeight: 600,
                    color: activeTab === key ? 'var(--primary)' : 'var(--muted)',
                    borderBottom: activeTab === key ? '2px solid var(--primary)' : '2px solid transparent',
                    marginBottom: -1,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── Profile Tab ── */}
            {activeTab === 'profile' && (
              <>
                <div className="modal-body" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                  {saveMsg && <div className="success-box" style={{ marginBottom: 12 }}>{saveMsg}</div>}
                  {saveErr && <div className="error-box"  style={{ marginBottom: 12 }}>{saveErr}</div>}

                  <div style={fieldStyle}>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Full Name</label>
                      <input className="form-input" value={prof.name} onChange={e => setProf(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Employee ID</label>
                      <input className="form-input" value={prof.employee_id} onChange={e => setProf(p => ({ ...p, employee_id: e.target.value }))} placeholder="e.g. 12345" />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Role</label>
                      <input className="form-input" value={user.role} readOnly style={{ background: '#f1f5f9', cursor: 'not-allowed', color: 'var(--muted)' }} />
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Role is assigned by Manager</div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Campus Location</label>
                      <select className="form-select" value={prof.campus_location} onChange={e => setProf(p => ({ ...p, campus_location: e.target.value }))}>
                        <option value="">— Select Campus —</option>
                        {CAMPUS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Unit School</label>
                      <select className="form-select" value={prof.unit} onChange={e => setProf(p => ({ ...p, unit: e.target.value }))}>
                        {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Telegram Chat ID</label>
                      <input className="form-input" value={prof.telegram_chat_id} onChange={e => setProf(p => ({ ...p, telegram_chat_id: e.target.value }))} placeholder="e.g. 123456789" />
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>
                        Search <strong>@ypjtravel_bot</strong> on Telegram → send <code>/start</code> → copy the Chat ID to enable travel status notifications.
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setProfileOpen(false)}>Close</button>
                  <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving}>
                    {saving ? 'Saving…' : 'Save Profile'}
                  </button>
                </div>
              </>
            )}

            {/* ── Dependents Tab ── */}
            {activeTab === 'dependents' && (
              <>
                <div className="modal-body" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                  {depMsg && <div className="success-box" style={{ marginBottom: 12 }}>{depMsg}</div>}
                  {depErr && <div className="error-box"  style={{ marginBottom: 12 }}>{depErr}</div>}

                  {/* Dependent list */}
                  {!editing && (
                    <>
                      {depsLoading ? (
                        <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>Loading…</div>
                      ) : deps.length === 0 ? (
                        <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>
                          No dependents added yet.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                          {deps.map(d => (
                            <div key={d.id} style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)' }}>
                                  {d.prefix ? d.prefix + ' ' : ''}{d.name}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                                  {d.relation}
                                  {d.gender ? ` · ${d.gender === 'MALE' ? 'Male' : 'Female'}` : ''}
                                  {d.age    ? ` · Age ${d.age}` : ''}
                                </div>
                                {(d.dependent_id || d.ktp_number) && (
                                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                                    {d.dependent_id ? `ID: ${d.dependent_id}` : ''}
                                    {d.dependent_id && d.ktp_number ? '  ·  ' : ''}
                                    {d.ktp_number ? `KTP: ${d.ktp_number}` : ''}
                                  </div>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => { setEditing({ ...d }); setDepErr(''); setDepMsg(''); }}>Edit</button>
                                <button className="btn btn-danger btn-sm"    onClick={() => handleDeleteDep(d.id)}>✕</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <button className="btn btn-primary btn-sm" onClick={() => { setEditing({ _new: true, ...emptyDep() }); setDepErr(''); setDepMsg(''); }}>
                        + Add Dependent
                      </button>
                    </>
                  )}

                  {/* Dependent form */}
                  {editing && (
                    <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)', marginBottom: 12 }}>
                        {editing._new ? 'Add Dependent' : 'Edit Dependent'}
                      </div>

                      <div style={fieldStyle}>
                        <div className="form-group">
                          <label className="form-label">Prefix</label>
                          <select className="form-select" value={editing.prefix || ''} onChange={e => setEditing(d => ({ ...d, prefix: e.target.value }))}>
                            <option value="">—</option>
                            {PREFIX_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Full Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                          <input className="form-input" value={editing.name} onChange={e => setEditing(d => ({ ...d, name: e.target.value }))} placeholder="Name as on ID" />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Dependent ID</label>
                          <input className="form-input" value={editing.dependent_id || ''} onChange={e => setEditing(d => ({ ...d, dependent_id: e.target.value }))} placeholder="e.g. 12345-01" />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Age</label>
                          <input className="form-input" type="number" min="0" max="120" value={editing.age || ''} onChange={e => setEditing(d => ({ ...d, age: e.target.value ? parseInt(e.target.value) : '' }))} placeholder="Age" />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Gender</label>
                          <select className="form-select" value={editing.gender || ''} onChange={e => setEditing(d => ({ ...d, gender: e.target.value }))}>
                            <option value="">—</option>
                            {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g === 'MALE' ? 'Male' : 'Female'}</option>)}
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Relation to Employee <span style={{ color: 'var(--danger)' }}>*</span></label>
                          <select className="form-select" value={editing.relation} onChange={e => setEditing(d => ({ ...d, relation: e.target.value }))}>
                            {RELATION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>

                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                          <label className="form-label">KTP Number</label>
                          <input className="form-input" value={editing.ktp_number || ''} onChange={e => setEditing(d => ({ ...d, ktp_number: e.target.value }))} placeholder="16-digit KTP" />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(null); setDepErr(''); }}>Cancel</button>
                        <button className="btn btn-primary btn-sm"   onClick={handleSaveDep} disabled={depSaving}>
                          {depSaving ? 'Saving…' : editing._new ? 'Add' : 'Update'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setProfileOpen(false)}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
