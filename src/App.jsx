/**
 * App Component
 *
 * Main app wrapper that handles auth state and routing.
 */

import { useAuth } from './contexts/AuthContext.jsx';
import Login from './components/Login.jsx';
import UWAssignmentTracker from './UWAssignmentTracker.jsx';

export default function App() {
  const { loading, isAuthenticated, isAuthorized, error, signOut } = useAuth();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid rgba(255,255,255,0.1)',
          borderTopColor: '#667eea',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not authenticated - show login
  if (!isAuthenticated) {
    return <Login />;
  }

  // Authenticated but not authorized (email not in users table)
  if (!isAuthorized) {
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
          maxWidth: '450px',
          width: '100%',
          border: '1px solid rgba(255,255,255,0.1)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '32px',
            color: '#ef4444'
          }}>
            !
          </div>

          <h1 style={{
            color: '#fff',
            fontSize: '24px',
            fontWeight: '600',
            marginBottom: '12px'
          }}>Access Denied</h1>

          <p style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '14px',
            marginBottom: '24px',
            lineHeight: '1.6'
          }}>
            {error || 'Your account is not registered in the system. Please contact an administrator to request access.'}
          </p>

          <button
            onClick={signOut}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Authenticated and authorized - show the app
  return <UWAssignmentTracker />;
}
