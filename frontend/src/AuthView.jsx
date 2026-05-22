import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';

const AuthView = ({ onAuthSuccess }) => {
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', farmerId: '', pin: '' });
  const [authMessage, setAuthMessage] = useState('');
  const [savingAuth, setSavingAuth] = useState(false);

  const handleAuthChange = (event) => {
    const { name, value } = event.target;
    setAuthForm((current) => ({ ...current, [name]: value }));
  };

  const REGISTER_PIN = import.meta.env.VITE_REGISTER_PIN || "";
  const isRegisterPinRequired = Boolean(REGISTER_PIN);
  const location = useLocation();
  const fromPath = location.state?.from?.pathname || '/';

  const submitAuth = async (event) => {
    event.preventDefault();
    setSavingAuth(true);
    setAuthMessage('');

    try {
      const path = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload = authMode === 'register'
        ? { name: authForm.name.trim(), farmerId: authForm.farmerId.trim(), pin: authForm.pin }
        : { farmerId: authForm.farmerId.trim() };

      const API_BASE = import.meta.env.VITE_BACKEND_URL || "";

      const response = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid Farmer ID.');
        }

        throw new Error(data?.message || 'Request failed with ' + response.status);
      }

      setAuthMessage(authMode === 'register' ? 'Registered ' + (data.user?.name || authForm.name) + '.' : 'Signed in as ' + (data.user?.name || data.user?.farmerId || authForm.farmerId) + '.');
      setAuthForm({ name: '', farmerId: '', pin: '' });
      onAuthSuccess(data.token, data.user, fromPath);
    } catch (error) {
      const message = String(error?.message || 'Authentication failed');
      if (message.toLowerCase().includes('already exists')) {
        setAuthMessage('This Farmer ID is already registered. Please sign in instead.');
      } else if (message.toLowerCase().includes('invalid registration pin')) {
        setAuthMessage('Invalid registration PIN. Please use the PIN provided by admin.');
      } else {
        setAuthMessage('Authentication failed: ' + message);
      }
    } finally {
      setSavingAuth(false);
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
        <div className='auth-toggle-row'>
          <button type='button' className={'auth-toggle ' + (authMode === 'login' ? 'active' : '')} onClick={() => setAuthMode('login')}>Login</button>
          <button type='button' className={'auth-toggle ' + (authMode === 'register' ? 'active' : '')} onClick={() => setAuthMode('register')}>Register</button>
        </div>
        <form className='auth-form' onSubmit={submitAuth}>
          {authMode === 'register' && (
            <label className='fg'>
              <span className='fl'>Name</span>
              <input className='fi' name='name' value={authForm.name} onChange={handleAuthChange} placeholder='Your name' required />
            </label>
          )}

          <label className='fg'>
            <span className='fl'>Farmer ID</span>
            <input className='fi' name='farmerId' value={authForm.farmerId} onChange={handleAuthChange} placeholder='e.g. farmer001' required />
          </label>

          {authMode === 'register' && isRegisterPinRequired && (
            <label className='fg'>
              <span className='fl'>Registration PIN</span>
              <input className='fi' name='pin' value={authForm.pin} onChange={handleAuthChange} placeholder='Enter PIN provided by admin' required />
            </label>
          )}

          <button className='btn btn-primary auth-submit' type='submit' disabled={savingAuth}>
            {savingAuth ? 'Processing...' : (authMode === 'register' ? 'Create account' : 'Sign in')}
          </button>
        </form>

        {authMessage && <div className='hint-box auth-message'>{authMessage}</div>}
        {location.state?.from?.pathname && (
          <div className='hint-box'>
            You were redirected here from <strong>{location.state.from.pathname}</strong>. After login, you will be returned to that page.
          </div>
        )}
        <div className='hint-box'>
          Use your Farmer ID to sign in. {isRegisterPinRequired ? 'For new registration, use the valid PIN shared by admin.' : 'Enter your name and Farmer ID to register.'}
        </div>
      </section>
    </main>
  );
};

export default React.memo(AuthView);
