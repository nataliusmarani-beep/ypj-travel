import { useState, useEffect } from 'react';
import { api } from '../api.js';

const ROLES = ['Manager', 'PIC Travel', 'Staff'];

const TRIBE_OPTIONS    = ['Papuan 7 Tribes', 'Papuan', 'Non Papua'];
const STATUS_OPTIONS   = ['Single', 'Single Status', 'Family Status'];

const emptyForm = () => ({
  name: '', email: '', role: 'Staff', employee_id: '', unit: '',
  date_of_hire: '', point_of_hire: '', date_of_service: '',
  tribe: '', employee_status: '', marriage_date: '',
});

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function RoleBadge({ role }) {
  const styles = {
    Manager:    { color: '#1d4ed8', bg: '#dbeafe' },
    'PIC Travel': { color: '#0d9488', bg: '#ccfbf1' },
    Staff:      { color: '#7c3aed', bg: '#f3e8ff' },
  };
  const s = styles[role] || { color: '#64748b', bg: '#f1f5f9' };
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, color: s.color, background: s.bg,
    }}>{role}</span>
  );
}

export default function UsersPage({ user }) {
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId]       = useState(null);
  const [form, setForm]           = useState(emptyForm());
  const [saving, setSaving]       = useState(false);
  const [inviting, setInviting]   = useState(null);

  useEffect(() => { load(); }, []);

  const load = () => {
    setLoading(true);
    api.getUsers()
      .then(d => setUsers(d.users || d))
      .catch(e => setError(e.message || 'Failed to load users.'))
      .finally(() => setLoading(false));
  };

  const openNew = () => {
    setEditId(null); setForm(emptyForm()); setError(''); setShowModal(true);
  };

  const openEdit = (u) => {
    setEditId(u.id);
    setForm({
      name:            u.name            || '',
      email:           u.email           || '',
      role:            u.role            || 'Staff',
      employee_id:     u.employee_id     || '',
      unit:            u.unit            || '',
      date_of_hire:    u.date_of_hire    ? u.date_of_hire.slice(0,10)    : '',
      point_of_hire:   u.point_of_hire   || '',
      date_of_service: u.date_of_service ? u.date_of_service.slice(0,10) : '',
      tribe:           u.tribe           || '',
      employee_status: u.employee_status || '',
      marriage_date:   u.marriage_date   ? u.marriage_date.slice(0,10)   : '',
    });
    setError(''); setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim())  { setError('Name is required.'); return; }
    if (!form.email.trim()) { setError('Email is required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('Invalid email address.'); return; }
    setSaving(true); setError('');
    try {
      if (editId) {
        await api.updateUser(editId, form);
      } else {
        await api.createUser(form);
      }
      setShowModal(false);
      load();
    } catch (e) {
      setError(e.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (u) => {
    try {
      await api.updateUser(u.id, { is_active: !u.is_active });
      setUsers(us => us.map(x => x.id === u.id ? { ...x, is_active: !u.is_active } : x));
    } catch (e) {
      setError(e.message || 'Update failed.');
    }
  };

  const handleInvite = async (u) => {
    setInviting(u.id); setSuccess(''); setError('');
    try {
      await api.inviteUser(u.id);
      setSuccess(`Welcome email sent to ${u.email}`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      setError(e.message || 'Invite failed.');
    } finally {
      setInviting(null);
    }
  };

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const activeCount   = users.filter(u => u.is_active !== false).length;
  const inactiveCount = users.length - activeCount;

  return (
    <div>
      {/* Page Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #7c3aed 100%)',
        borderRadius: 20, padding: '24px 28px', marginBottom: 24,
        boxShadow: '0 4px 20px rgba(30,58,95,.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
            👥 Administration
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>Users & Accounts</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>
            {activeCount} active · {inactiveCount} inactive
          </div>
        </div>
        <button
          onClick={openNew}
          style={{
            background: '#fff', color: 'var(--navy)',
            fontWeight: 700, padding: '10px 20px', borderRadius: 12,
            border: 'none', fontSize: 13, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,.15)', position: 'relative',
          }}
        >
          + Add User
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#dc2626' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#16a34a' }}>
          ✅ {success}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60, color: 'var(--muted)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
            <div style={{ fontSize: 14 }}>Loading users…</div>
          </div>
        </div>
      ) : (
        <div style={{
          background: '#fff', borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.04)',
        }}>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Employee ID</th>
                <th>Unit</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: 48 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
                    <div>No users found.</div>
                  </td>
                </tr>
              )}
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: u.is_active !== false
                          ? 'linear-gradient(135deg, #1e3a5f, #2563eb)'
                          : '#e2e8f0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, color: '#fff', fontWeight: 700, flexShrink: 0,
                      }}>
                        {u.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <span style={{ fontWeight: 600 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{u.email}</td>
                  <td><RoleBadge role={u.role} /></td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{u.employee_id || '—'}</td>
                  <td>{u.unit || '—'}</td>
                  <td>
                    {u.is_active !== false ? (
                      <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#16a34a', background: '#dcfce7' }}>Active</span>
                    ) : (
                      <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#dc2626', background: '#fee2e2' }}>Inactive</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ borderRadius: 8, fontSize: 11 }}
                        onClick={() => openEdit(u)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ borderRadius: 8, fontSize: 11 }}
                        onClick={() => handleInvite(u)}
                        disabled={inviting === u.id}
                        title="Resend welcome / invite email"
                      >
                        {inviting === u.id ? '…' : '📧 Invite'}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{
                          borderRadius: 8, fontSize: 11,
                          color: u.is_active !== false ? '#ef4444' : '#16a34a',
                        }}
                        onClick={() => handleToggleActive(u)}
                        disabled={u.id === user.id}
                        title={u.is_active !== false ? 'Deactivate' : 'Activate'}
                      >
                        {u.is_active !== false ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ borderRadius: 20 }}>
            <div className="modal-header">
              <div className="modal-title">{editId ? 'Edit User' : 'Add New User'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#dc2626' }}>
                  {error}
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  className="form-input" style={{ borderRadius: 10 }}
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder="e.g. Budi Santoso"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  className="form-input" style={{ borderRadius: 10 }}
                  type="email"
                  value={form.email}
                  onChange={e => setField('email', e.target.value)}
                  placeholder="e.g. budi@ypj.sch.id"
                  disabled={!!editId}
                />
                {editId && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Email cannot be changed after creation.</div>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-select" style={{ borderRadius: 10 }} value={form.role} onChange={e => setField('role', e.target.value)}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Employee ID</label>
                  <input
                    className="form-input" style={{ borderRadius: 10 }}
                    value={form.employee_id}
                    onChange={e => setField('employee_id', e.target.value)}
                    placeholder="e.g. 0000910001"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Unit / Department</label>
                <select
                  className="form-select" style={{ borderRadius: 10 }}
                  value={form.unit}
                  onChange={e => setField('unit', e.target.value)}
                >
                  <option value="">— Select —</option>
                  <option value="Teacher">Teacher</option>
                  <option value="Administration">Administration</option>
                </select>
              </div>

              {/* ── Employment Details ── */}
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginTop: 16, marginBottom: 12,
                paddingTop: 14, borderTop: '1px solid var(--border)',
              }}>
                📋 Employment Details
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date of Hire</label>
                  <input
                    className="form-input" style={{ borderRadius: 10 }}
                    type="date"
                    value={form.date_of_hire}
                    onChange={e => setField('date_of_hire', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Date of Service</label>
                  <input
                    className="form-input" style={{ borderRadius: 10 }}
                    type="date"
                    value={form.date_of_service}
                    onChange={e => setField('date_of_service', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Point of Hire</label>
                <input
                  className="form-input" style={{ borderRadius: 10 }}
                  value={form.point_of_hire}
                  onChange={e => setField('point_of_hire', e.target.value)}
                  placeholder="e.g. Tembagapura, Jakarta"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tribe</label>
                  <select
                    className="form-select" style={{ borderRadius: 10 }}
                    value={form.tribe}
                    onChange={e => setField('tribe', e.target.value)}
                  >
                    <option value="">— Select —</option>
                    {TRIBE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select" style={{ borderRadius: 10 }}
                    value={form.employee_status}
                    onChange={e => setField('employee_status', e.target.value)}
                  >
                    <option value="">— Select —</option>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {(form.employee_status === 'Single Status' || form.employee_status === 'Family Status') && (
                <div className="form-group">
                  <label className="form-label">Marriage Date</label>
                  <input
                    className="form-input" style={{ borderRadius: 10 }}
                    type="date"
                    value={form.marriage_date}
                    onChange={e => setField('marriage_date', e.target.value)}
                  />
                </div>
              )}

              {!editId && (
                <div style={{
                  fontSize: 12, color: '#0d9488', background: '#f0fdfa',
                  borderRadius: 10, padding: '10px 14px', marginTop: 4,
                  border: '1px solid #99f6e4',
                }}>
                  📧 A welcome email with a password setup link will be sent to the user.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" style={{ borderRadius: 10 }} onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ borderRadius: 10 }} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editId ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
