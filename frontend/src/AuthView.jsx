import React, { useState } from 'react';
import AuthShowcase from './AuthShowcase';

const AuthView = ({ onAuthSuccess }) => {
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authMessage, setAuthMessage] = useState('');
  const [savingAuth, setSavingAuth] = useState(false);

  const handleAuthChange = (event) => {
    const { name, value } = event.target;
    setAuthForm((current) => ({ ...current, [name]: value }));
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    setSavingAuth(true);
    setAuthMessage('');

    try {
      const path = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload = authMode === 'register'
        ? { name: authForm.name.trim(), email: authForm.email.trim(), password: authForm.password }
        : { email: authForm.email.trim(), password: authForm.password };

      const API_BASE = import.meta.env.VITE_BACKEND_URL || "";

      const response = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid email or password. Check Login mode or register a new account.');
        }

        if (response.status === 400 && /email already exists/i.test(data?.message || '')) {
          // Switch to login mode and show a friendly, actionable message instead of throwing
          setAuthMode('login');
          setAuthMessage('Email already exists — switched to Login. Please sign in with your password.');
          setSavingAuth(false);
          return;
        }

        throw new Error(data?.message || 'Request failed with ' + response.status);
      }

      setAuthMessage(authMode === 'register' ? 'Registered ' + (data.user?.name || authForm.name) + '.' : 'Signed in as ' + (data.user?.name || authForm.email) + '.');
      setAuthForm({ name: '', email: '', password: '' });
      onAuthSuccess(data.token, data.user);
    } catch (error) {
      setAuthMessage('Authentication failed: ' + error.message);
    } finally {
      setSavingAuth(false);
    }
  };

  return (
    <main className='auth-page'>
      <section className='auth-hero'>
        <p className='eyebrow'>FarmTrack Pro</p>
        <h1>Livestock management that feels calm, clear, and fast</h1>
        <p className='lede'>Sign in to manage herds, health records, feed inventory, staff, and reports from one screen.</p>
      </section>

      <section className='auth-card'>
        <div className='login-header'>
          <div className='login-icon'>FT</div>
          <div className='login-title'>FarmTrack Pro</div>
          <div className='login-sub'>Livestock Management System</div>
        </div>

        <div className='auth-toggle-row'>
          <button type='button' className={'auth-toggle ' + (authMode === 'login' ? 'active' : '')} onClick={() => setAuthMode('login')}>Login</button>
          <button type='button' className={'auth-toggle ' + (authMode === 'register' ? 'active' : '')} onClick={() => setAuthMode('register')}>Register</button>
        </div>

        <form className='auth-form' onSubmit={submitAuth}>
          {authMode === 'register' && (
            <label className='fg'>
              <span className='fl'>Name</span>
              <input className='fi' name='name' value={authForm.name} onChange={handleAuthChange} placeholder='Admin' required />
            </label>
          )}

          <label className='fg'>
            <span className='fl'>Email</span>
            <input className='fi' type='email' name='email' value={authForm.email} onChange={handleAuthChange} placeholder='user@farm.com' required />
          </label>

          <label className='fg'>
            <span className='fl'>Password</span>
            <input className='fi' type='password' name='password' value={authForm.password} onChange={handleAuthChange} placeholder='Enter password' required />
          </label>

          <button className='btn btn-primary auth-submit' type='submit' disabled={savingAuth}>
            {savingAuth ? 'Processing...' : (authMode === 'register' ? 'Create account' : 'Sign in')}
          </button>
        </form>

        {authMessage && <div className='hint-box auth-message'>{authMessage}</div>}

        <div className='hint-box'>
          Use Login for an existing account or Register to create a new one in the local backend.
        </div>
      </section>

      <AuthShowcase />
    </main>
  );
};

export default React.memo(AuthView);
