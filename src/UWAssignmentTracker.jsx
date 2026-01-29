import { useState, useEffect, useCallback } from 'react';
import {
  validateAuthorization,
  canModifyStatus,
  canModifyCount,
  normalizeEmail,
  UserRole,
  ValidationMessages
} from './utils/validation.js';
import storage from './utils/storage.js';

// ============================================
// CONFIGURATION
// This section will be replaced with dynamic loading from Supabase
// ============================================
const CONFIG = {
  underwriters: {
    "brian.mosman@nationslending.com": { name: "Brian Mosman" },
    "jill.beaulieu@nationslending.com": { name: "Jill Beaulieu" },
    "miranda.gammella@nationslending.com": { name: "Miranda Gammella" },
    "ronnie.rasso@nationslending.com": { name: "Ronnie Rasso" },
    "shelley.tobin@nationslending.com": { name: "Shelley Tobin" },
    "lisa.kinsinger@nationslending.com": { name: "Lisa Kinsinger" },
    "mary.butler@nationslending.com": { name: "Mary Butler" },
    "shannon.villasenor@nationslending.com": { name: "Shannon Villasenor" },
    "tonya.ross@nationslending.com": { name: "Tonya Ross" },
    "terry.lunsford@nationslending.com": { name: "Terry Lunsford" },
    "rachel.anselmi@nationslending.com": { name: "Rachel Anselmi" },
    "christie.santucci@nationslending.com": { name: "Christie Santucci" },
    "tamara.johnson@nationslending.com": { name: "Tamara Johnson" },
    "linda.baehr@nationslending.com": { name: "Linda Baehr" },
    "demian.brown@nationslending.com": { name: "Demian Brown" },
    "judy.marsh@nationslending.com": { name: "Judy Marsh" },
    "cindy.hoffman@nationslending.com": { name: "Cindy Hoffman" },
    "tracy.harvey@nationslending.com": { name: "Tracy Harvey" },
    "gaby.degroot@nationslending.com": { name: "Gaby DeGroot" }
  },
  assigners: [
    "daniel.obenauf@nationslending.com",
    "ricky.hanchett@nationslending.com",
    "kylie.mason@nationslending.com",
    "karen.hatfield@nationslending.com"
  ],
  // Future: API endpoint for dynamic user management
  apiEndpoint: null,
  // Allowed email domains
  allowedDomains: ['nationslending.com']
};

const STORAGE_KEY = 'uw-tracker-shared-data';

// ============================================
// TIME UTILITIES
// ============================================

function getCSTDateString() {
  const now = new Date();
  const cstOffset = -6 * 60; // CST is UTC-6
  const utcOffset = now.getTimezoneOffset();
  const cstTime = new Date(now.getTime() + (utcOffset + cstOffset) * 60000);

  if (cstTime.getHours() < 2) {
    cstTime.setDate(cstTime.getDate() - 1);
  }
  return cstTime.toISOString().split('T')[0];
}

function getCSTTimeString() {
  const now = new Date();
  const cstOffset = -6 * 60;
  const utcOffset = now.getTimezoneOffset();
  const cstTime = new Date(now.getTime() + (utcOffset + cstOffset) * 60000);

  let hours = cstTime.getHours();
  const minutes = cstTime.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;

  return `${hours}:${minutesStr} ${ampm}`;
}

function getCSTTimestamp() {
  return Date.now();
}

// ============================================
// DATA MANAGEMENT
// ============================================

function createDefaultData(config) {
  const data = {
    lastResetDate: getCSTDateString(),
    underwriters: {}
  };

  Object.keys(config.underwriters).forEach(email => {
    data.underwriters[email] = {
      status: 'neutral',
      count: 0,
      statusTime: null,
      statusTimestamp: null
    };
  });

  return data;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function UWAssignmentTracker() {
  // Auth state
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(UserRole.UNKNOWN);
  const [displayName, setDisplayName] = useState('');

  // UI state
  const [emailInput, setEmailInput] = useState('');
  const [appData, setAppData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState([]);
  const [notification, setNotification] = useState(null);

  // Config state (for future dynamic loading)
  const [config, setConfig] = useState(CONFIG);

  // Derived state
  const isAssigner = userRole === UserRole.ASSIGNER;
  const isUW = userRole === UserRole.UNDERWRITER;

  // ============================================
  // DATA OPERATIONS
  // ============================================

  const loadData = useCallback(async () => {
    try {
      const result = await storage.get(STORAGE_KEY, true);
      let data;

      if (result && result.value) {
        data = JSON.parse(result.value);

        // Check for daily reset
        const today = getCSTDateString();
        if (data.lastResetDate !== today) {
          Object.keys(data.underwriters).forEach(email => {
            data.underwriters[email].count = 0;
            data.underwriters[email].status = 'neutral';
            data.underwriters[email].statusTime = null;
            data.underwriters[email].statusTimestamp = null;
          });
          data.lastResetDate = today;
          await storage.set(STORAGE_KEY, JSON.stringify(data), true);
        }

        // Sync with config (add new UWs, ensure fields exist)
        Object.keys(config.underwriters).forEach(email => {
          if (!data.underwriters[email]) {
            data.underwriters[email] = {
              status: 'neutral',
              count: 0,
              statusTime: null,
              statusTimestamp: null
            };
          }
          if (data.underwriters[email].statusTime === undefined) {
            data.underwriters[email].statusTime = null;
            data.underwriters[email].statusTimestamp = null;
          }
        });
      } else {
        data = createDefaultData(config);
        await storage.set(STORAGE_KEY, JSON.stringify(data), true);
      }

      setAppData(data);
      setErrors([]);
    } catch (err) {
      console.error('Storage error:', err);
      setAppData(createDefaultData(config));
      showNotification(ValidationMessages.STORAGE_ERROR, 'error');
    }
    setLoading(false);
    setRefreshing(false);
  }, [config]);

  const saveData = useCallback(async (newData) => {
    try {
      await storage.set(STORAGE_KEY, JSON.stringify(newData), true);
      setAppData(newData);
    } catch (err) {
      console.error('Save error:', err);
      showNotification(ValidationMessages.STORAGE_ERROR, 'error');
    }
  }, []);

  // ============================================
  // NOTIFICATION SYSTEM
  // ============================================

  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // ============================================
  // AUTH OPERATIONS
  // ============================================

  function handleLogin() {
    // Clear previous errors
    setErrors([]);

    // Validate authorization using our validation module
    const authResult = validateAuthorization(emailInput, config);

    if (!authResult.isAuthorized) {
      setErrors(authResult.errors);
      return;
    }

    // Successful login
    setCurrentUser(authResult.email);
    setUserRole(authResult.role);
    setDisplayName(authResult.displayName);
    setErrors([]);
    showNotification(`Welcome, ${authResult.displayName}!`, 'success');
  }

  function handleSignOut() {
    setCurrentUser(null);
    setUserRole(UserRole.UNKNOWN);
    setDisplayName('');
    setEmailInput('');
    setErrors([]);
  }

  // ============================================
  // STATUS & COUNT OPERATIONS
  // ============================================

  function changeStatus(email, newStatus) {
    // Authorization check using validation module
    if (!canModifyStatus(currentUser, email, userRole)) {
      showNotification(ValidationMessages.UNAUTHORIZED_ACTION, 'error');
      return;
    }

    if (!appData) return;

    const currentStatus = appData.underwriters[email]?.status || 'neutral';
    const updatedStatus = currentStatus === newStatus ? 'neutral' : newStatus;

    const newData = {
      ...appData,
      underwriters: {
        ...appData.underwriters,
        [email]: {
          ...appData.underwriters[email],
          status: updatedStatus,
          statusTime: updatedStatus !== 'neutral' ? getCSTTimeString() : null,
          statusTimestamp: updatedStatus !== 'neutral' ? getCSTTimestamp() : null
        }
      }
    };

    saveData(newData);
  }

  function changeCount(email, delta) {
    // Authorization check using validation module
    if (!canModifyCount(userRole)) {
      showNotification(ValidationMessages.UNAUTHORIZED_ACTION, 'error');
      return;
    }

    if (!appData) return;

    const currentCount = appData.underwriters[email]?.count || 0;
    const newCount = Math.max(0, Math.min(99, currentCount + delta));

    const newData = {
      ...appData,
      underwriters: {
        ...appData.underwriters,
        [email]: {
          ...appData.underwriters[email],
          count: newCount
        }
      }
    };

    saveData(newData);
  }

  // ============================================
  // SORTING
  // ============================================

  function getSortedUnderwriters() {
    if (!appData) return [];

    const entries = Object.entries(config.underwriters).map(([email, info]) => ({
      email,
      name: info.name,
      status: appData.underwriters[email]?.status || 'neutral',
      count: appData.underwriters[email]?.count || 0,
      statusTime: appData.underwriters[email]?.statusTime || null,
      statusTimestamp: appData.underwriters[email]?.statusTimestamp || null
    }));

    const greens = entries.filter(u => u.status === 'green');
    const neutrals = entries.filter(u => u.status === 'neutral');
    const reds = entries.filter(u => u.status === 'red');

    greens.sort((a, b) => (a.statusTimestamp || 0) - (b.statusTimestamp || 0));

    neutrals.sort((a, b) => {
      const aHasCount = a.count > 0;
      const bHasCount = b.count > 0;

      if (aHasCount && bHasCount) return a.count - b.count;
      if (aHasCount && !bHasCount) return 1;
      if (!aHasCount && bHasCount) return -1;
      return a.name.localeCompare(b.name);
    });

    reds.sort((a, b) => (a.statusTimestamp || 0) - (b.statusTimestamp || 0));

    return [...greens, ...neutrals, ...reds];
  }

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle refresh
  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
  }

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const totalAssigned = appData
    ? Object.values(appData.underwriters).reduce((sum, uw) => sum + (uw.count || 0), 0)
    : 0;

  // ============================================
  // RENDER: LOADING STATE
  // ============================================

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

  // ============================================
  // RENDER: LOGIN SCREEN
  // ============================================

  if (!currentUser) {
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

          <div>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                if (errors.length > 0) setErrors([]);
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
              placeholder="your.name@nationslending.com"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck="false"
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '8px',
                border: errors.length > 0
                  ? '1px solid #ef4444'
                  : '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(15, 23, 42, 0.8)',
                color: '#fff',
                fontSize: '16px',
                marginBottom: '16px',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease'
              }}
            />

            {/* Validation Errors */}
            {errors.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                {errors.map((error, index) => (
                  <p key={index} style={{
                    color: '#f87171',
                    fontSize: '14px',
                    margin: '4px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ fontSize: '12px' }}>⚠</span>
                    {error}
                  </p>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={handleLogin}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'transform 0.1s ease, box-shadow 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Sign In
            </button>

            <p style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: '12px',
              marginTop: '16px',
              textAlign: 'center'
            }}>
              Use your Nations Lending email address
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: MAIN APP
  // ============================================

  const sortedUWs = getSortedUnderwriters();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Notification Toast */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '12px 20px',
          borderRadius: '8px',
          background: notification.type === 'error' ? '#ef4444' :
                      notification.type === 'success' ? '#22c55e' : '#667eea',
          color: '#fff',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 1000,
          animation: 'slideIn 0.3s ease'
        }}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: '600', margin: 0 }}>
            UW Assignment Tracker
          </h1>
          {isAssigner && (
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginTop: '4px' }}>
              Total Assigned Today: <span style={{ color: '#667eea', fontWeight: '600' }}>{totalAssigned}</span>
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
            {displayName}
            {isAssigner && <span style={{ color: '#667eea' }}> (Assigner)</span>}
          </span>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: '14px',
              cursor: refreshing ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{
              display: 'inline-block',
              animation: refreshing ? 'spin 0.8s linear infinite' : 'none'
            }}>↻</span>
            Refresh
          </button>

          <button
            onClick={handleSignOut}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              color: '#fff',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto 20px',
        display: 'flex',
        gap: '24px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>Wants Files</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#64748b' }} />
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>Neutral</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }} />
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>Do Not Assign</span>
        </div>
      </div>

      {/* UW Cards Grid */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        {sortedUWs.map(uw => {
          const status = uw.status;
          const isOwnCard = normalizeEmail(currentUser) === normalizeEmail(uw.email);
          const canEditStatus = canModifyStatus(currentUser, uw.email, userRole);

          const statusColors = {
            green: { bg: 'rgba(34, 197, 94, 0.15)', border: '#22c55e', glow: 'rgba(34, 197, 94, 0.3)' },
            red: { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', glow: 'rgba(239, 68, 68, 0.3)' },
            neutral: { bg: 'rgba(100, 116, 139, 0.15)', border: '#64748b', glow: 'none' }
          };

          const colors = statusColors[status];

          return (
            <div
              key={uw.email}
              style={{
                background: colors.bg,
                borderRadius: '12px',
                padding: '16px',
                border: `2px solid ${colors.border}`,
                boxShadow: colors.glow !== 'none' ? `0 0 20px ${colors.glow}` : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Name and Timestamp Row */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px'
              }}>
                <div>
                  <h3 style={{
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: '600',
                    margin: 0
                  }}>
                    {uw.name}
                    {isOwnCard && <span style={{ color: '#667eea', marginLeft: '6px' }}>•</span>}
                  </h3>
                  {uw.statusTime && (
                    <span style={{
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: '11px',
                      marginTop: '2px',
                      display: 'block'
                    }}>
                      {uw.statusTime} CST
                    </span>
                  )}
                </div>

                {/* Count - Only visible to assigners */}
                {isAssigner && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '8px',
                    padding: '4px 8px'
                  }}>
                    <button
                      onClick={() => changeCount(uw.email, -1)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        border: 'none',
                        background: 'rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontSize: '16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      −
                    </button>
                    <span style={{
                      color: '#fff',
                      fontSize: '16px',
                      fontWeight: '600',
                      minWidth: '24px',
                      textAlign: 'center'
                    }}>
                      {uw.count}
                    </span>
                    <button
                      onClick={() => changeCount(uw.email, 1)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        border: 'none',
                        background: 'rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontSize: '16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>

              {/* Status Buttons */}
              {canEditStatus && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => changeStatus(uw.email, 'green')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      border: status === 'green' ? '2px solid #22c55e' : '2px solid transparent',
                      background: status === 'green' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.1)',
                      color: '#22c55e',
                      fontSize: '18px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => changeStatus(uw.email, 'red')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      border: status === 'red' ? '2px solid #ef4444' : '2px solid transparent',
                      background: status === 'red' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      fontSize: '18px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
