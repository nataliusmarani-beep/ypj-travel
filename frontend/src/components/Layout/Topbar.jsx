import { useState, useEffect, useRef } from 'react';
import { api } from '../../api.js';

const ROLE_COLORS = {
  Manager:     '#2563eb',
  'PIC Travel':'#0d9488',
  Staff:       '#7c3aed',
};

const UNIT_OPTIONS     = ['PAUD', 'SD', 'SMP', 'Administration'];
const CAMPUS_OPTIONS   = ['YPJ Tembagapura', 'YPJ Kuala Kencana'];
const PREFIX_OPTIONS   = ['Mr', 'Mrs', 'Master', 'Miss'];
const GENDER_OPTIONS   = ['MALE', 'FEMALE'];
const RELATION_OPTIONS = ['Spouse', 'Child', 'Mother', 'Father', 'Mother in Law', 'Father in Law', 'Assistance'];

const MAX_AVATAR_BYTES = 200 * 1024; // 200 KB

const emptyDep = () => ({
  prefix: 'Mr', name: '', dependent_id: '', age: '', gender: 'MALE',
  relation: 'Spouse', ktp_number: '', passport_id: '', date_of_birth: '',
});

/**
 * Render avatar: object-fit:cover crop + zoom, then squeeze JPEG quality
 * until the base64 payload is ≤ 200 KB.
 */
const renderAvatar = (imgSrc, zoom) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onerror = () => reject(new Error('Could not load image.'));
  img.onload = () => {
    const size = 200;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');

    const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight) * zoom;
    const w = img.naturalWidth  * scale;
    const h = img.naturalHeight * scale;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);

    // Reduce quality iteratively until ≤ 200 KB
    let quality = 0.85;
    let dataUrl;
    while (quality >= 0.1) {
      dataUrl = canvas.toDataURL('image/jpeg', quality);
      // base64 payload bytes ≈ (length - header) * 0.75
      const header = dataUrl.indexOf(',') + 1;
      const bytes  = Math.ceil((dataUrl.length - header) * 0.75);
      if (bytes <= MAX_AVATAR_BYTES) break;
      quality -= 0.05;
    }
    resolve(dataUrl);
  };
  img.src = imgSrc;
});

/** Reusable avatar circle — shows photo or initial letter */
function AvatarCircle({ src, initial, color, size = 36, fontSize = 15, style = {} }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: src ? 'transparent' : color,
      overflow: 'hidden', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      ...style,
    }}>
      {src
        ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : <span style={{ color: '#fff', fontWeight: 800, fontSize, userSelect: 'none' }}>{initial}</span>
      }
    </div>
  );
}

export default function Topbar({ user, onLogout, onProfileUpdate }) {
  const [switchOpen, setSwitchOpen]   = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeTab, setActiveTab]     = useState('profile');
  const switchRef = useRef(null);
  const fileRef   = useRef(null);

  /* ── Profile fields ── */
  const [prof, setProf]       = useState({ name: '', employee_id: '', unit: 'PAUD', campus_location: '', telegram_chat_id: '', date_of_birth: '', gender: '', nik_number: '', passport_id: '' });
  const [profErrors, setProfErrors] = useState({});
  const [saving, setSaving]   = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveErr, setSaveErr] = useState('');

  /* ── Avatar ── */
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarZoom, setAvatarZoom]       = useState(1);
  const [savedAvatar, setSavedAvatar]     = useState('');
  const [avatarErr, setAvatarErr]         = useState('');

  /* ── Dependents ── */
  const [deps, setDeps]           = useState([]);
  const [depsLoading, setDepsLoading] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [depSaving, setDepSaving] = useState(false);
  const [depErrors, setDepErrors] = useState({});
  const [depErr, setDepErr]       = useState('');
  const [depMsg, setDepMsg]       = useState('');

  const initial     = (user.name || user.email || '?')[0].toUpperCase();
  const avatarColor = ROLE_COLORS[user.role] || '#64748b';

  /* Load profile when modal opens */
  useEffect(() => {
    if (!profileOpen) {
      setSaveMsg(''); setSaveErr(''); setAvatarErr('');
      setProfErrors({}); setEditing(null);
      setAvatarPreview(''); setAvatarZoom(1);
      return;
    }
    api.getMe().then(d => {
      setProf({
        name:             d.name             || '',
        employee_id:      d.employee_id      || '',
        unit:             d.unit             || 'PAUD',
        campus_location:  d.campus_location  || '',
        telegram_chat_id: d.telegram_chat_id || '',
        date_of_birth:    d.date_of_birth ? d.date_of_birth.slice(0, 10) : '',
        gender:           d.gender      || '',
        nik_number:       d.nik_number  || '',
        passport_id:      d.passport_id || '',
      });
      setSavedAvatar(d.avatar || '');
    }).catch(() => {});
    loadDeps();
  }, [profileOpen]);

  const loadDeps = () => {
    setDepsLoading(true);
    api.getDependents().then(setDeps).catch(() => {}).finally(() => setDepsLoading(false));
  };

  /* Close switch dropdown on outside click */
  useEffect(() => {
    const h = e => { if (switchRef.current && !switchRef.current.contains(e.target)) setSwitchOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* ── Avatar file pick ── */
  const handleFileChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarErr('');
    if (file.size > 5 * 1024 * 1024) {
      setAvatarErr('File too large. Please choose an image under 5 MB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => { setAvatarPreview(ev.target.result); setAvatarZoom(1); };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  /* ── Profile validation ── */
  const validateProfile = () => {
    const errs = {};
    if (!prof.name.trim())             errs.name             = 'Required';
    if (!prof.employee_id.trim())      errs.employee_id      = 'Required';
    if (!prof.gender)                  errs.gender           = 'Required';
    if (!prof.nik_number.trim())       errs.nik_number       = 'Required';
    if (!prof.campus_location)         errs.campus_location  = 'Required';
    if (!prof.unit)                    errs.unit             = 'Required';
    if (!prof.telegram_chat_id.trim()) errs.telegram_chat_id = 'Required';
    return errs;
  };

  /* ── Save profile ── */
  const handleSaveProfile = async () => {
    const errs = validateProfile();
    if (Object.keys(errs).length) { setProfErrors(errs); return; }
    setProfErrors({});
    setSaving(true); setSaveMsg(''); setSaveErr(''); setAvatarErr('');
    try {
      let avatarToSave = savedAvatar;
      if (avatarPreview) {
        avatarToSave = await renderAvatar(avatarPreview, avatarZoom);
      }
      await api.updateMe({ ...prof, avatar: avatarToSave });
      setSaveMsg('Profile saved successfully.');
      setSavedAvatar(avatarToSave);
      setAvatarPreview('');
      if (onProfileUpdate) onProfileUpdate({ ...user, name: prof.name.trim(), avatar: avatarToSave });
    } catch (e) {
      setSaveErr(e.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Dependent validation ── */
  const validateDep = d => {
    const e = {};
    if (!d.name.trim())        e.name         = 'Required';
    if (!d.dependent_id.trim()) e.dependent_id = 'Required';
    if (!d.age)                e.age          = 'Required';
    if (!d.gender)             e.gender       = 'Required';
    if (!d.relation)           e.relation     = 'Required';
    if (!d.ktp_number.trim())  e.ktp_number   = 'Required';
    return e;
  };

  /* ── Save dependent ── */
  const handleSaveDep = async () => {
    if (!editing) return;
    const errs = validateDep(editing);
    if (Object.keys(errs).length) { setDepErrors(errs); return; }
    setDepErrors({});
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

  const handleDeleteDep = async id => {
    if (!window.confirm('Remove this dependent? This cannot be undone.')) return;
    try { await api.deleteDependent(id); setDeps(d => d.filter(x => x.id !== id)); setDepMsg('Dependent removed.'); }
    catch (e) { setDepErr(e.message || 'Delete failed.'); }
  };

  /* helpers */
  const fi = (field, errs) => ({
    style: errs[field] ? { borderColor: 'var(--danger)' } : {},
  });
  const errTip = (field, errs) => errs[field]
    ? <span style={{ color: 'var(--danger)', fontSize: 11, marginTop: 3, display: 'block' }}>{errs[field]}</span>
    : null;

  const col2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 };

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <span className="logo-icon">✈️</span>
          <div>
            <div className="logo-text">YPJ Travel</div>
            <div className="logo-sub">Campus Travel System</div>
          </div>
        </div>

        <div className="topbar-right">
          {user.role === 'Manager' && (
            <div className="switch-dropdown" ref={switchRef}>
              <button className="btn btn-ghost btn-sm" onClick={() => setSwitchOpen(o => !o)} title="Switch App">
                🔀 Apps
              </button>
              {switchOpen && (
                <div className="switch-menu">
                  <a className="switch-menu-item" href="https://kkinventory.ypj.sch.id" target="_blank" rel="noopener noreferrer" onClick={() => setSwitchOpen(false)}>🏫 YPJ KK Inventory</a>
                  <a className="switch-menu-item" href="https://tprainventory.ypj.sch.id" target="_blank" rel="noopener noreferrer" onClick={() => setSwitchOpen(false)}>🏔️ YPJ TPRA Inventory</a>
                  <div className="switch-menu-item current">
                    ✈️ YPJ Travel
                    <span className="badge badge-blue" style={{ marginLeft: 'auto', fontSize: 10 }}>Here</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div
            className="user-avatar"
            style={{ background: (user.avatar) ? 'transparent' : avatarColor, padding: 0, overflow: 'hidden', cursor: 'pointer' }}
            onClick={() => setProfileOpen(true)}
            title="My Profile"
          >
            {user.avatar
              ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              : initial
            }
          </div>

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

            {/* Avatar + name header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px 0' }}>
              <AvatarCircle src={avatarPreview || savedAvatar} initial={initial} color={avatarColor} size={52} fontSize={22} />
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
                <button key={key}
                  onClick={() => { setActiveTab(key); setSaveMsg(''); setSaveErr(''); setDepMsg(''); setDepErr(''); setEditing(null); setProfErrors({}); setDepErrors({}); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '8px 14px', fontSize: 13, fontWeight: 600,
                    color: activeTab === key ? 'var(--primary)' : 'var(--muted)',
                    borderBottom: activeTab === key ? '2px solid var(--primary)' : '2px solid transparent',
                    marginBottom: -1,
                  }}
                >{label}</button>
              ))}
            </div>

            {/* ══ PROFILE TAB ══ */}
            {activeTab === 'profile' && (
              <>
                <div className="modal-body" style={{ maxHeight: '58vh', overflowY: 'auto' }}>
                  {saveMsg && <div className="success-box" style={{ marginBottom: 12 }}>{saveMsg}</div>}
                  {saveErr && <div className="error-box"  style={{ marginBottom: 12 }}>{saveErr}</div>}

                  {/* Avatar upload */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 18, padding: '14px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <div
                      style={{ width: 84, height: 84, borderRadius: '50%', overflow: 'hidden', background: avatarColor, flexShrink: 0, border: '3px solid var(--border)', cursor: 'pointer', position: 'relative' }}
                      onClick={() => fileRef.current?.click()}
                      title="Click to change photo"
                    >
                      {(avatarPreview || savedAvatar) ? (
                        <img
                          src={avatarPreview || savedAvatar} alt="avatar"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${avatarZoom})`, transformOrigin: 'center' }}
                        />
                      ) : (
                        <span style={{ color: '#fff', fontWeight: 800, fontSize: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                          {initial}
                        </span>
                      )}
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.38)', color: '#fff', fontSize: 12, textAlign: 'center', paddingBottom: 3 }}>📷</div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                      <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} style={{ marginBottom: 8 }}>
                        Upload Photo
                      </button>
                      {avatarErr && <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 6 }}>{avatarErr}</div>}
                      {avatarPreview ? (
                        <>
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                            Zoom: <strong>{avatarZoom.toFixed(1)}×</strong>
                          </div>
                          <input type="range" min="1" max="3" step="0.05" value={avatarZoom}
                            onChange={e => setAvatarZoom(parseFloat(e.target.value))}
                            style={{ width: '100%', cursor: 'pointer' }}
                          />
                          <button className="btn btn-ghost btn-sm" onClick={() => { setAvatarPreview(''); setAvatarZoom(1); }} style={{ marginTop: 6, fontSize: 11 }}>
                            ✕ Cancel
                          </button>
                        </>
                      ) : (
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>JPG or PNG · max 5 MB · saved at 200 KB</div>
                      )}
                    </div>
                  </div>

                  {/* Profile fields — all required */}
                  <div style={col2}>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Full Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input className="form-input" value={prof.name} {...fi('name', profErrors)}
                        onChange={e => setProf(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" />
                      {errTip('name', profErrors)}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Employee ID <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input className="form-input" value={prof.employee_id} {...fi('employee_id', profErrors)}
                        onChange={e => setProf(p => ({ ...p, employee_id: e.target.value }))} placeholder="0000910439" />
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>Format: 0000910439</div>
                      {errTip('employee_id', profErrors)}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Role</label>
                      <input className="form-input" value={user.role} readOnly style={{ background: '#f1f5f9', cursor: 'not-allowed', color: 'var(--muted)' }} />
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>Assigned by Manager</div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Date of Birth</label>
                      <input className="form-input" type="date" value={prof.date_of_birth}
                        onChange={e => setProf(p => ({ ...p, date_of_birth: e.target.value }))} />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Gender <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <select className="form-select" value={prof.gender} {...fi('gender', profErrors)}
                        onChange={e => setProf(p => ({ ...p, gender: e.target.value }))}>
                        <option value="">— Select —</option>
                        {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g === 'MALE' ? 'Male' : 'Female'}</option>)}
                      </select>
                      {errTip('gender', profErrors)}
                    </div>

                    <div className="form-group">
                      <label className="form-label">NIK Number <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input className="form-input" value={prof.nik_number} {...fi('nik_number', profErrors)}
                        onChange={e => setProf(p => ({ ...p, nik_number: e.target.value }))}
                        placeholder="16-digit NIK number" />
                      {errTip('nik_number', profErrors)}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Passport ID</label>
                      <input className="form-input" value={prof.passport_id}
                        onChange={e => setProf(p => ({ ...p, passport_id: e.target.value }))}
                        placeholder="Optional" />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Campus Location <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <select className="form-select" value={prof.campus_location} {...fi('campus_location', profErrors)}
                        onChange={e => setProf(p => ({ ...p, campus_location: e.target.value }))}>
                        <option value="">— Select Campus —</option>
                        {CAMPUS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {errTip('campus_location', profErrors)}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Unit School <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <select className="form-select" value={prof.unit} {...fi('unit', profErrors)}
                        onChange={e => setProf(p => ({ ...p, unit: e.target.value }))}>
                        {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                      {errTip('unit', profErrors)}
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Telegram Chat ID <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input className="form-input" value={prof.telegram_chat_id} {...fi('telegram_chat_id', profErrors)}
                        onChange={e => setProf(p => ({ ...p, telegram_chat_id: e.target.value }))} placeholder="e.g. 123456789" />
                      {errTip('telegram_chat_id', profErrors)}
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>
                        Search <strong>@ypjtravel_bot</strong> on Telegram → send <code>/start</code> → copy the Chat ID.
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

            {/* ══ DEPENDENTS TAB ══ */}
            {activeTab === 'dependents' && (
              <>
                <div className="modal-body" style={{ maxHeight: '58vh', overflowY: 'auto' }}>
                  {depMsg && <div className="success-box" style={{ marginBottom: 12 }}>{depMsg}</div>}
                  {depErr && <div className="error-box"  style={{ marginBottom: 12 }}>{depErr}</div>}

                  {/* Dependent list */}
                  {!editing && (
                    <>
                      {depsLoading ? (
                        <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>Loading…</div>
                      ) : deps.length === 0 ? (
                        <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
                          No dependents added yet.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                          {deps.map(d => (
                            <div key={d.id} style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)' }}>
                                  {d.prefix ? d.prefix + ' ' : ''}{d.name}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                                  {d.relation}{d.gender ? ` · ${d.gender === 'MALE' ? 'Male' : 'Female'}` : ''}{d.age ? ` · Age ${d.age}` : ''}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, display: 'flex', flexWrap: 'wrap', gap: '2px 10px' }}>
                                  {d.dependent_id && <span>ID: {d.dependent_id}</span>}
                                  {d.ktp_number   && <span>NIK: {d.ktp_number}</span>}
                                  {d.passport_id  && <span>Passport: {d.passport_id}</span>}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => { setEditing({ ...d, ktp_number: d.ktp_number||'', passport_id: d.passport_id||'', date_of_birth: d.date_of_birth ? d.date_of_birth.slice(0,10) : '' }); setDepErrors({}); setDepErr(''); setDepMsg(''); }}>Edit</button>
                                <button className="btn btn-danger btn-sm"    onClick={() => handleDeleteDep(d.id)}>Delete</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <button className="btn btn-primary btn-sm" onClick={() => { setEditing({ _new: true, ...emptyDep() }); setDepErrors({}); setDepErr(''); setDepMsg(''); }}>
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

                      <div style={col2}>
                        <div className="form-group">
                          <label className="form-label">Prefix</label>
                          <select className="form-select" value={editing.prefix || ''} onChange={e => setEditing(d => ({ ...d, prefix: e.target.value }))}>
                            <option value="">—</option>
                            {PREFIX_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Full Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                          <input className="form-input" value={editing.name} {...fi('name', depErrors)}
                            onChange={e => setEditing(d => ({ ...d, name: e.target.value }))} placeholder="Name as on ID" />
                          {errTip('name', depErrors)}
                        </div>

                        <div className="form-group">
                          <label className="form-label">Dependent ID <span style={{ color: 'var(--danger)' }}>*</span></label>
                          <input className="form-input" value={editing.dependent_id || ''} {...fi('dependent_id', depErrors)}
                            onChange={e => setEditing(d => ({ ...d, dependent_id: e.target.value }))} placeholder="0000910439-03" />
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>Employee ID + sequence (e.g. -01)</div>
                          {errTip('dependent_id', depErrors)}
                        </div>

                        <div className="form-group">
                          <label className="form-label">
                            Date of Birth
                            {(editing.prefix === 'Master' || editing.prefix === 'Miss') && (
                              <span style={{ color: 'var(--danger)' }}> *</span>
                            )}
                          </label>
                          <input className="form-input" type="date" value={editing.date_of_birth || ''}
                            onChange={e => {
                              const dob = e.target.value;
                              const age = dob
                                ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                                : '';
                              setEditing(d => ({ ...d, date_of_birth: dob, age: age !== '' ? Math.max(0, age) : '' }));
                            }} />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Age <span style={{ color: 'var(--danger)' }}>*</span></label>
                          <input className="form-input" type="number" min="0" max="120" value={editing.age || ''} {...fi('age', depErrors)}
                            onChange={e => setEditing(d => ({ ...d, age: e.target.value ? parseInt(e.target.value) : '' }))}
                            placeholder="Auto-filled from date of birth" />
                          {errTip('age', depErrors)}
                        </div>

                        <div className="form-group">
                          <label className="form-label">Gender <span style={{ color: 'var(--danger)' }}>*</span></label>
                          <select className="form-select" value={editing.gender || ''} {...fi('gender', depErrors)}
                            onChange={e => setEditing(d => ({ ...d, gender: e.target.value }))}>
                            <option value="">— Select —</option>
                            {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g === 'MALE' ? 'Male' : 'Female'}</option>)}
                          </select>
                          {errTip('gender', depErrors)}
                        </div>

                        <div className="form-group">
                          <label className="form-label">Relation to Employee <span style={{ color: 'var(--danger)' }}>*</span></label>
                          <select className="form-select" value={editing.relation} {...fi('relation', depErrors)}
                            onChange={e => setEditing(d => ({ ...d, relation: e.target.value }))}>
                            {RELATION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          {errTip('relation', depErrors)}
                        </div>

                        <div className="form-group">
                          <label className="form-label">NIK Number <span style={{ color: 'var(--danger)' }}>*</span></label>
                          <input className="form-input" value={editing.ktp_number || ''} {...fi('ktp_number', depErrors)}
                            onChange={e => setEditing(d => ({ ...d, ktp_number: e.target.value }))} placeholder="16-digit NIK" />
                          {errTip('ktp_number', depErrors)}
                        </div>

                        <div className="form-group">
                          <label className="form-label">Passport ID</label>
                          <input className="form-input" value={editing.passport_id || ''}
                            onChange={e => setEditing(d => ({ ...d, passport_id: e.target.value }))} placeholder="Optional" />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(null); setDepErrors({}); }}>Cancel</button>
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
