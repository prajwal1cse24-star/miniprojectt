import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';

const AdminAuth = ({ onAuthSuccess }) => {
  const [form, setForm] = useState({ farmerId: '', password: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((c) => ({ ...c, [e.target.name]: e.target.value }));

  const location = useLocation();
  const fromPath = location.state?.from?.pathname || '/';

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const API_BASE = import.meta.env.VITE_BACKEND_URL || "";
      const endpoint = '/api/auth/admin/login';
      const body = { farmerId: form.farmerId.trim(), password: form.password };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || `Request failed ${res.status}`);
      }
      setMessage('Signed in as ' + (data.user?.name || data.user?.farmerId));
      setForm({ farmerId: '', password: '' });
      onAuthSuccess?.(data.token, data.user, fromPath);
    } catch (err) {
      setMessage('Admin login failed: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className='auth-page'>
      <section className='auth-card'>
        <div className='login-header'>
          <div className='login-icon'>ADM</div>
          <div className='login-title'>Admin Login</div>
          <div className='login-sub'>Administrative sign-in</div>
        </div>

        <form className='auth-form' onSubmit={submit}>
          <div className='hint-box' style={{ marginBottom: 16 }}>
            Admin login requires a valid Farmer ID and password. Use this form to sign in with an existing admin account.
          </div>

          <label className='fg'>
            <span className='fl'>Farmer ID</span>
            <input name='farmerId' className='fi' value={form.farmerId} onChange={handleChange} placeholder='admin-id' required />
          </label>

          <label className='fg'>
            <span className='fl'>Password</span>
            <input name='password' type='password' className='fi' value={form.password} onChange={handleChange} placeholder='password' required />
          </label>

          <button className='btn btn-primary' type='submit' disabled={loading}>{loading ? 'Signing in...' : 'Sign in as Admin'}</button>
        </form>

        {message && <div className='hint-box' style={{ marginTop: 12 }}>{message}</div>}
        {location.state?.from?.pathname && (
          <div className='hint-box' style={{ marginTop: 12 }}>
            You were redirected here from <strong>{location.state.from.pathname}</strong>. After login, you will return to that page.
          </div>
        )}
      </section>
    </main>
  );
};

export default React.memo(AdminAuth);
