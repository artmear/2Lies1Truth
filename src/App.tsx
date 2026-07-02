// src/App.tsx
import { useState } from 'react';
import PublicScreen from '@/screens/PublicScreen';
import ConductorScreen from '@/screens/ConductorScreen';
import '@/App.css';

export default function App() {
  const path = window.location.pathname;
  const isAdminRoute = path === '/conductor' || path === '/admin';

  const [isAuth, setIsAuth] = useState(() => sessionStorage.getItem('admin_auth') === 'true');
  const [passwordInput, setPasswordInput] = useState('');

  const handleAdminLogin = (e: React.ChangeEvent) => {
    e.preventDefault();
    
    const securePassword = import.meta.env.VITE_ADMIN_PASSWORD;

    if (passwordInput === securePassword) {
      sessionStorage.setItem('admin_auth', 'true');
      setIsAuth(true);
    } else {
      alert('Incorrect password! Please try again.');
      setPasswordInput('');
    }
  };

  if (isAdminRoute) {
    if (!isAuth) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#0f0f13', padding: '20px' }}>
          <form onSubmit={handleAdminLogin} className="mobile-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '400px', width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '3rem' }}>🔒</span>
              <h2 style={{ marginTop: '10px', fontSize: '1.8rem' }}>Admin Gatekeeper</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '5px' }}>
                Enter the credential to manage the main presentation board broadcast.
              </p>
            </div>

            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter password..."
              autoFocus
              style={{ 
                padding: '14px', 
                fontSize: '1.1rem', 
                borderRadius: 'var(--radius)', 
                border: '1px solid #262636', 
                backgroundColor: '#1f1f2e', 
                color: '#fff',
                textAlign: 'center'
              }}
            />

            <button type="submit" className="btn btn-primary" style={{ height: '50px', fontSize: '1rem' }}>
              Unlock Dashboard
            </button>
          </form>
        </div>
      );
    }

    return <ConductorScreen />;
  }

  return <PublicScreen />;
}