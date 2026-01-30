import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './contexts/AuthContext.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import {
  getUsers,
  getTrackerData,
  updateTrackerStatus,
  subscribeToTrackerChanges,
  unsubscribe
} from './utils/supabase.js';
import {
  logStatusChange,
  logCountChange
} from './utils/auditLog.js';

// ============================================
// TIME UTILITIES
// ============================================

function getCSTDateString() {
  const now = new Date();
  const cstOffset = -6 * 60;
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
// MAIN COMPONENT
// ============================================

export default function UWAssignmentTracker() {
  const { appUser, signOut, isAssigner } = useAuth();

  // Data state
  const [users, setUsers] = useState([]);
  const [trackerData, setTrackerData] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // UI state
  const [notification, setNotification] = useState(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // ============================================
  // DATA OPERATIONS
  // ============================================

  const loadData = useCallback(async () => {
    try {
      // Load users
      const { data: usersData, error: usersError } = await getUsers();
      if (usersError) throw usersError;

      // Load tracker status
      const { data: trackerDataArr, error: trackerError } = await getTrackerData();
      if (trackerError) throw trackerError;

      // Convert tracker data array to object keyed by email
      const trackerObj = {};
      trackerDataArr?.forEach(row => {
        trackerObj[row.email] = {
          status: row.status || 'neutral',
          count: row.count || 0,
          statusTime: row.status_time,
          statusTimestamp: row.status_timestamp
        };
      });

      setUsers(usersData || []);
      setTrackerData(trackerObj);
    } catch (err) {
      console.error('Error loading data:', err);
      showNotification('Failed to load data. Please refresh.', 'error');
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  // ============================================
  // REALTIME SUBSCRIPTION
  // ============================================

  useEffect(() => {
    loadData();

    // Subscribe to realtime changes
    const subscription = subscribeToTrackerChanges((payload) => {
      console.log('Realtime update:', payload);

      if (payload.new) {
        setTrackerData(prev => ({
          ...prev,
          [payload.new.email]: {
            status: payload.new.status || 'neutral',
            count: payload.new.count || 0,
            statusTime: payload.new.status_time,
            statusTimestamp: payload.new.status_timestamp
          }
        }));
      }
    });

    return () => {
      unsubscribe(subscription);
    };
  }, [loadData]);

  // ============================================
  // NOTIFICATION SYSTEM
  // ============================================

  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // ============================================
  // STATUS & COUNT OPERATIONS
  // ============================================

  async function changeStatus(email, newStatus) {
    // Authorization check
    const canEdit = isAssigner || appUser?.email === email;
    if (!canEdit) {
      showNotification('You are not authorized to perform this action.', 'error');
      return;
    }

    const current = trackerData[email] || {};
    const currentStatus = current.status || 'neutral';
    const updatedStatus = currentStatus === newStatus ? 'neutral' : newStatus;

    // Optimistic update
    setTrackerData(prev => ({
      ...prev,
      [email]: {
        ...prev[email],
        status: updatedStatus,
        statusTime: updatedStatus !== 'neutral' ? getCSTTimeString() : null,
        statusTimestamp: updatedStatus !== 'neutral' ? getCSTTimestamp() : null
      }
    }));

    // Audit log
    logStatusChange(appUser?.email, email, currentStatus, updatedStatus);

    // Save to Supabase
    const { error } = await updateTrackerStatus(email, {
      status: updatedStatus,
      status_time: updatedStatus !== 'neutral' ? getCSTTimeString() : null,
      status_timestamp: updatedStatus !== 'neutral' ? getCSTTimestamp() : null
    });

    if (error) {
      console.error('Error updating status:', error);
      showNotification('Failed to update status.', 'error');
      // Revert optimistic update
      loadData();
    }
  }

  async function changeCount(email, delta) {
    // Authorization check
    if (!isAssigner) {
      showNotification('You are not authorized to perform this action.', 'error');
      return;
    }

    const current = trackerData[email] || {};
    const currentCount = current.count || 0;
    const newCount = Math.max(0, Math.min(99, currentCount + delta));

    if (currentCount === newCount) return;

    // Optimistic update
    setTrackerData(prev => ({
      ...prev,
      [email]: {
        ...prev[email],
        count: newCount
      }
    }));

    // Audit log
    logCountChange(appUser?.email, email, currentCount, newCount);

    // Save to Supabase
    const { error } = await updateTrackerStatus(email, {
      count: newCount
    });

    if (error) {
      console.error('Error updating count:', error);
      showNotification('Failed to update count.', 'error');
      // Revert optimistic update
      loadData();
    }
  }

  // ============================================
  // SORTING
  // ============================================

  function getSortedUnderwriters() {
    const underwriters = users.filter(u => u.role === 'underwriter');

    const entries = underwriters.map(user => ({
      email: user.email,
      name: user.name,
      status: trackerData[user.email]?.status || 'neutral',
      count: trackerData[user.email]?.count || 0,
      statusTime: trackerData[user.email]?.statusTime || null,
      statusTimestamp: trackerData[user.email]?.statusTimestamp || null
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

  // Handle refresh
  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
  }

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const totalAssigned = Object.values(trackerData).reduce((sum, uw) => sum + (uw.count || 0), 0);

  // Build config for admin panel (from users data)
  const config = {
    underwriters: {},
    assigners: []
  };
  users.forEach(user => {
    if (user.role === 'underwriter') {
      config.underwriters[user.email] = { name: user.name };
    } else if (user.role === 'assigner') {
      config.assigners.push(user.email);
    }
  });

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
            {appUser?.name}
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

          {/* Admin Button - Assigners only */}
          {isAssigner && (
            <button
              onClick={() => setShowAdminPanel(true)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(102, 126, 234, 0.5)',
                background: 'rgba(102, 126, 234, 0.1)',
                color: '#667eea',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Admin
            </button>
          )}

          <button
            onClick={signOut}
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

      {/* Admin Panel Modal */}
      {showAdminPanel && (
        <AdminPanel
          config={config}
          onClose={() => setShowAdminPanel(false)}
          onConfigChange={() => {
            setShowAdminPanel(false);
            loadData(); // Reload data after admin changes
          }}
        />
      )}

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
          const isOwnCard = appUser?.email?.toLowerCase() === uw.email?.toLowerCase();
          const canEditStatus = isAssigner || isOwnCard;

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
