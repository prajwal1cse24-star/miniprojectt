import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import API_BASE from './apiConfig.js';

const AdminAuth = ({ onAuthSuccess }) => {
  const [form, setForm] = useState({ name: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', password: '', adminPin: '' });
  const [isRegister, setIsRegister] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const rainDrops = React.useMemo(() => Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: `${2 + Math.random() * 96}%`,
    delay: `${Math.random() * 8}s`,
    duration: `${6 + Math.random() * 8}s`,
    scale: 0.35 + Math.random() * 0.75,
    opacity: 0.25 + Math.random() * 0.55
  })), []);

  const handleChange = (e) => setForm((c) => ({ ...c, [e.target.name]: e.target.value }));
  const handleRegisterChange = (e) => setRegisterForm((c) => ({ ...c, [e.target.name]: e.target.value }));

  const location = useLocation();
  const fromPath = location.state?.from?.pathname || '/';

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      if (isRegister) {
        const res = await fetch(`${API_BASE}/api/auth/admin/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: registerForm.name.trim(),
            password: registerForm.password,
            adminPin: registerForm.adminPin.trim()
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.message || `Registration failed with status ${res.status}`);
        }
        setMessage('Admin account created successfully! You can now log in.');
        setIsRegister(false);
        setForm({ name: registerForm.name, password: '' });
      } else {
        const endpoint = '/api/auth/admin/login';
        const body = {
          name: form.name.trim(),
          farmerId: form.name.trim().toLowerCase(),
          password: form.password,
        };

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
        setForm({ name: '', password: '' });
        onAuthSuccess?.(data.token, data.user, fromPath);
      }
    } catch (err) {
      setMessage((isRegister ? 'Admin registration failed: ' : 'Admin login failed: ') + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className='auth-page'>
      <div className="water-rain-container">
        <div className="water-drop water-drop-1"></div>
        <div className="water-drop water-drop-2"></div>
        <div className="water-drop water-drop-3"></div>
        {rainDrops.map((drop) => (
          <div
            key={drop.id}
            className="water-drip"
            style={{
              left: drop.left,
              animationDelay: drop.delay,
              animationDuration: drop.duration,
              transform: `scale(${drop.scale})`,
              opacity: drop.opacity,
            }}
          />
        ))}
      </div>

      <section className='auth-card'>
        <div className='login-header'>
          <div className='login-icon'>ADM</div>
          <div className='login-title'>{isRegister ? 'Admin Register' : 'Admin Login'}</div>
          <div className='login-sub'>{isRegister ? 'Create an admin account' : 'Administrative sign-in'}</div>
        </div>

        <form className='auth-form' onSubmit={submit}>
          <div className='hint-box' style={{ marginBottom: 16 }}>
            {isRegister
              ? 'Enter name, password, and the system admin PIN (default: admin123) to register as an administrator.'
              : 'Admin login requires a valid admin name and password. Use this form to sign in with an existing admin account.'}
          </div>

          {isRegister ? (
            <>
              <label className='fg'>
                <span className='fl'>Admin Name</span>
                <input name='name' className='fi' value={registerForm.name} onChange={handleRegisterChange} placeholder='Desired admin name' required />
              </label>

              <label className='fg'>
                <span className='fl'>Password</span>
                <input name='password' type='password' className='fi' value={registerForm.password} onChange={handleRegisterChange} placeholder='Password' required />
              </label>

              <label className='fg'>
                <span className='fl'>Admin PIN</span>
                <input name='adminPin' type='password' className='fi' value={registerForm.adminPin} onChange={handleRegisterChange} placeholder='System Admin PIN' required />
              </label>

              <button className='btn btn-primary' type='submit' disabled={loading}>{loading ? 'Registering...' : 'Register as Admin'}</button>
            </>
          ) : (
            <>
              <label className='fg'>
                <span className='fl'>Admin Name</span>
                <input name='name' className='fi' value={form.name} onChange={handleChange} placeholder='Admin name' required />
              </label>

              <label className='fg'>
                <span className='fl'>Password</span>
                <input name='password' type='password' className='fi' value={form.password} onChange={handleChange} placeholder='Password' required />
              </label>

              <button className='btn btn-primary' type='submit' disabled={loading}>{loading ? 'Signing in...' : 'Sign in as Admin'}</button>
            </>
          )}
        </form>

        {message && <div className='hint-box' style={{ marginTop: 12 }}>{message}</div>}
        {location.state?.from?.pathname && (
          <div className='hint-box' style={{ marginTop: 12 }}>
            You were redirected here from <strong>{location.state.from.pathname}</strong>. After login, you will return to that page.
          </div>
        )}

        <div className='hint-box' style={{ marginTop: 16 }}>
          {isRegister ? (
            <span>Already have an admin account? <button type="button" onClick={() => { setIsRegister(false); setMessage(''); }} style={{ background: 'none', border: 'none', color: 'var(--blue)', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>Sign in here</button>.</span>
          ) : (
            <span>Need to create an admin account? <button type="button" onClick={() => { setIsRegister(true); setMessage(''); }} style={{ background: 'none', border: 'none', color: 'var(--blue)', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>Register as admin</button>.</span>
          )}
        </div>

        <div className='hint-box' style={{ marginTop: 8 }}>
          Looking for regular access? Go to <Link to="/login" style={{ color: 'var(--blue)', textDecoration: 'underline' }}>Farmer Login</Link>.
        </div>
      </section>
    </main>
  );
};

export default React.memo(AdminAuth);   