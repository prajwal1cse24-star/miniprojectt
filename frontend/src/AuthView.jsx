import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';

import API_BASE from './apiConfig.js';

const AuthView = ({ onAuthSuccess }) => {
  const [authForm, setAuthForm] = useState({ farmerId: '', password: '' });
  const [authMessage, setAuthMessage] = useState('');
  const [savingAuth, setSavingAuth] = useState(false);

  const [registerForm, setRegisterForm] = useState({ name: '', farmerId: '', password: '' });
  const [registerMessage, setRegisterMessage] = useState('');
  const [registering, setRegistering] = useState(false);

  const handleAuthChange = (event) => {
    const { name, value } = event.target;
    setAuthForm((current) => ({ ...current, [name]: value }));
  };

  const handleRegisterChange = (event) => {
    const { name, value } = event.target;
    setRegisterForm((current) => ({ ...current, [name]: value }));
  };

  const location = useLocation();
  const fromPath = location.state?.from?.pathname || '/';

  const submitAuth = async (event) => {
    event.preventDefault();
    setSavingAuth(true);
    setAuthMessage('');

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmerId: authForm.farmerId.trim(), password: authForm.password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || 'Request failed with ' + response.status);
      }

      setAuthMessage('Signed in as ' + (data.user?.name || data.user?.farmerId || authForm.farmerId) + '.');
      setAuthForm({ farmerId: '', password: '' });
      onAuthSuccess(data.token, data.user, fromPath);
    } catch (error) {
      const message = String(error?.message || 'Authentication failed');
      setAuthMessage('Authentication failed: ' + message);
    } finally {
      setSavingAuth(false);
    }
  };

  const submitRegister = async (event) => {
    event.preventDefault();
    setRegistering(true);
    setRegisterMessage('');

    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerForm.name.trim(),
          farmerId: registerForm.farmerId.trim().toLowerCase(),
          password: registerForm.password,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || 'Request failed with ' + response.status);
      }

      setRegisterMessage('Account created. You can now sign in with your Farmer ID.');
      setRegisterForm({ name: '', farmerId: '', password: '' });
    } catch (error) {
      setRegisterMessage('Registration failed: ' + String(error?.message || 'Unable to create account'));
    } finally {
      setRegistering(false);
    }
  };

  return (
    <main className='auth-page'>
      <section className='auth-hero'>
        <p className='eyebrow'>FarmTrack Pro</p>
        <h1>Sign in to FarmTrack Pro</h1>
        <p className='lede'>Use your account to access the livestock dashboard, reports, and admin tools.</p>
      </section>

      <section className='auth-card'>
        <div className='login-header'>
          <div className='login-icon'>FT</div>
          <div className='login-title'>FarmTrack Pro</div>
          <div className='login-sub'>Livestock Management System</div>
        </div>
        <div className='hint-box' style={{ marginBottom: 16 }}>
          If you are an admin, use your admin name and password. Regular users sign in with their Farmer ID here.
        </div>
        <form className='auth-form' onSubmit={submitAuth}>
          <label className='fg'>
            <span className='fl'>Farmer ID</span>
            <input className='fi' name='farmerId' value={authForm.farmerId} onChange={handleAuthChange} placeholder='e.g. farmer001' required />
          </label>
          <label className='fg'>
            <span className='fl'>Password</span>
            <input className='fi' name='password' type='password' value={authForm.password} onChange={handleAuthChange} placeholder='Enter password if your account has one' />
          </label>

          <button className='btn btn-primary auth-submit' type='submit' disabled={savingAuth}>
            {savingAuth ? 'Processing...' : 'Sign in'}
          </button>
        </form>

        {authMessage && <div className='hint-box auth-message'>{authMessage}</div>}
        {location.state?.from?.pathname && (
          <div className='hint-box'>
            You were redirected here from <strong>{location.state.from.pathname}</strong>. After login, you will be returned to that page.
          </div>
        )}
        <div className='hint-box'>
          Already have a farmer account? Sign in using your Farmer ID and password.
        </div>
        <div className='hint-box'>
          <a href='/admin-login' style={{ color: 'var(--blue)', textDecoration: 'underline' }}>Admin login</a> is available if you need administrator access.
        </div>
      </section>

      <section className='auth-card' style={{ marginTop: '24px' }}>
        <div className='login-header'>
          <div className='login-icon'>FR</div>
          <div className='login-title'>Farmer Register</div>
          <div className='login-sub'>Create a new farmer account</div>
        </div>
        <div className='hint-box' style={{ marginBottom: 16 }}>
          Register with your name, Farmer ID and a password. Then sign in using Farmer ID.
        </div>
        <form className='auth-form' onSubmit={submitRegister}>
          <label className='fg'>
            <span className='fl'>Name</span>
            <input className='fi' name='name' value={registerForm.name} onChange={handleRegisterChange} placeholder='Your full name' required />
          </label>
          <label className='fg'>
            <span className='fl'>Farmer ID</span>
            <input className='fi' name='farmerId' value={registerForm.farmerId} onChange={handleRegisterChange} placeholder='e.g. farmer001' required />
          </label>
          <label className='fg'>
            <span className='fl'>Password</span>
            <input className='fi' name='password' type='password' value={registerForm.password} onChange={handleRegisterChange} placeholder='Create a password' required />
          </label>
          <button className='btn btn-secondary auth-submit' type='submit' disabled={registering}>
            {registering ? 'Registering...' : 'Create account'}
          </button>
        </form>
        {registerMessage && <div className='hint-box auth-message'>{registerMessage}</div>}
      </section>
    </main>
  );
};

export default React.memo(AuthView);
