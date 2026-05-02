import { useState, useEffect } from 'react';
import { api } from '../api.js';

const ROLES = ['Manager', 'PIC Travel', 'Staff'];

const emptyForm = () => ({
  name: '', email: '', role: 'Staff', employee_id: '', unit: '',
});

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function UsersPage({ user }) {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState(emptyForm());
  const [saving, setSaving]     = useState(false);
  const [inviting, setInviting] = useState(null);
  const [inviteMsg, setInviteMsg] = useState('');

  useEffect(() => { load(); }, []);

  const load = () => {
    setLoading(true);
    api.getUsers()
      .then(d => setUsers(d.users || d))
      .catch(e => setError(e.message || 'Failed to load users.'))
      .finally(() => setLoading(false));
  };

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm());
    setError('');
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditId(u.id);
    setForm({
      name:        u.name        || '',
      email:       u.email       || '',
      role:        u.role        || 'Staff',
      employee_id: u.employee_id || '',
      unit:        u.unit        || '',
    });
    setError('');
    setShowModal(true);
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
    setInviting(u.id); setInviteMsg(''); setError('');
    try {
      await api.inviteUser(u.id);
      setInviteMsg(`Welcome email sent to ${u.email}`);
      setTimeout(() => setInviteMsg(''), 4000);
    } catch (e) {
      setError(e.message || 'Invite failed.');
    } finally {
      setInviting(null);
    }
  };

  const roleBadge = (role) => {
    if (role === 'Manager')    return <span className="badge badge-blue">Manager</span>;
    if (role === 'PIC Travel') return <span className="badge badge-teal">PIC Travel</span>;
    return <span className="badge badge-purple">Staff</span>;
  };

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Users</div>
          <div className="page-subtitle">Manage staff accounts</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Add User</button>
      </div>

      {error    && <div className="error-box">{error}</div>}
      {inviteMsg && <div className="success-box">{inviteMsg}</div>}
      {loading  && <div style={{ color: 'var(--muted)' }}>Loading…</div>}

      {!loading && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>No users found.</td></tr>
              )}
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td style={{ color: 'var(--muted)' }}>{u.email}</td>
                  <td>{roleBadge(u.role)}</td>
                  <td>{u.employee_id || '—'}</td>
                  <td>{u.unit || '—'}</td>
                  <td>
                    {u.is_active !== false
                      ? <span className="badge badge-green">Active</span>
                      : <span className="badge badge-red">Inactive</span>
                    }
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}>Edit</button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleInvite(u)}
                        disabled={inviting === u.id}
                        title="Resend welcome / invite email"
                      >
                        {inviting === u.id ? '…' : '📧 Invite'}
                      </button>
                      <button
                        className={`btn btn-sm ${u.is_active !== false ? 'btn-ghost' : 'btn-ghost'}`}
                        onClick={() => handleToggleActive(u)}
                        style={{ color: u.is_active !== false ? '#ef4444' : '#16a34a' }}
                        title={u.is_active !== false ? 'Deactivate' : 'Activate'}
                        disabled={u.id === user.id}
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
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editId ? 'Edit User' : 'Add User'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {error && <div className="error-box">{error}</div>}
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder="e.g. Budi Santoso"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input
                  className="form-input"
                  type="email"
                  value={form.email}
                  onChange={e => setField('email', e.target.value)}
                  placeholder="e.g. budi@ypj.sch.id"
                  disabled={!!editId}
                />
                {editId && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Email cannot be changed.</div>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-select" value={form.role} onChange={e => setField('role', e.target.value)}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Employee ID</label>
                  <input
                    className="form-input"
                    value={form.employee_id}
                    onChange={e => setField('employee_id', e.target.value)}
                    placeholder="e.g. 12345"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Unit / Department</label>
                <input
                  className="form-input"
                  value={form.unit}
                  onChange={e => setField('unit', e.target.value)}
                  placeholder="e.g. Primary School"
                />
              </div>
              {!editId && (
                <div style={{ fontSize: 12, color: 'var(--muted)', background: '#f8fafc', borderRadius: 8, padding: '10px 12px', marginTop: 4 }}>
                  A welcome email with a password setup link will be sent to the user's email address.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editId ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
