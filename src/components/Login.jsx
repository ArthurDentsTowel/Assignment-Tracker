/**
 * Login Component
 *
 * Displays the login screen with GitHub OAuth button.
 */

import { useAuth } from '../contexts/AuthContext.jsx';

export default function Login() {
  const { signIn, loading, error } = useAuth();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '400px',
        width: '100%',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h1 style={{
          color: '#fff',
          fontSize: '24px',
          fontWeight: '600',
          marginBottom: '8px',
          textAlign: 'center'
        }}>UW Assignment Tracker</h1>
        <p style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: '14px',
          marginBottom: '32px',
          textAlign: 'center'
        }}>Sign in to continue</p>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px'
          }}>
            <p style={{
              color: '#f87171',
              fontSize: '14px',
              margin: 0,
              textAlign: 'center'
            }}>{error}</p>
          </div>
        )}

        <button
          onClick={signIn}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '8px',
            border: 'none',
            background: '#24292e',
            color: '#fff',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'background 0.2s ease'
          }}
          onMouseOver={(e) => {
            if (!loading) e.currentTarget.style.background = '#2f363d';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = '#24292e';
          }}
        >
          {/* GitHub Icon */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          {loading ? 'Signing in...' : 'Sign in with GitHub'}
        </button>

        <p style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: '12px',
          marginTop: '20px',
          textAlign: 'center',
          lineHeight: '1.5'
        }}>
          You must be registered in the system to access the tracker.
          <br />
          Contact your administrator if you need access.
        </p>
      </div>
    </div>
  );
}
