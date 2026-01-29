/**
 * Audit Log Utility
 *
 * Tracks changes to statuses and counts for accountability and debugging.
 * Currently stores in localStorage, designed for Supabase integration.
 *
 * Log entries include:
 * - Timestamp
 * - Actor (who made the change)
 * - Action type (status_change, count_change)
 * - Target (who was affected)
 * - Previous and new values
 */

const AUDIT_LOG_KEY = 'uw-tracker-audit-log';
const MAX_LOG_ENTRIES = 500; // Keep last 500 entries

/**
 * Action types for the audit log
 */
export const AuditAction = {
  STATUS_CHANGE: 'status_change',
  COUNT_CHANGE: 'count_change',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  DAILY_RESET: 'daily_reset',
  USER_ADDED: 'user_added',
  USER_REMOVED: 'user_removed'
};

/**
 * Get current CST timestamp
 */
function getCSTTimestamp() {
  const now = new Date();
  const cstOffset = -6 * 60;
  const utcOffset = now.getTimezoneOffset();
  const cstTime = new Date(now.getTime() + (utcOffset + cstOffset) * 60000);
  return cstTime.toISOString();
}

/**
 * Load audit log from storage
 * @returns {Array} Array of log entries
 */
function loadLog() {
  try {
    const stored = localStorage.getItem(AUDIT_LOG_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error('Failed to load audit log:', err);
    return [];
  }
}

/**
 * Save audit log to storage
 * @param {Array} log - Array of log entries
 */
function saveLog(log) {
  try {
    // Trim to max entries
    const trimmedLog = log.slice(-MAX_LOG_ENTRIES);
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(trimmedLog));
  } catch (err) {
    console.error('Failed to save audit log:', err);
  }
}

/**
 * Add an entry to the audit log
 * @param {Object} entry - Log entry details
 * @param {string} entry.action - Action type from AuditAction
 * @param {string} entry.actor - Email of user who performed the action
 * @param {string} entry.target - Email of user affected (optional)
 * @param {any} entry.previousValue - Value before change
 * @param {any} entry.newValue - Value after change
 * @param {Object} entry.metadata - Additional context
 */
export function logAction(entry) {
  const log = loadLog();

  const logEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: getCSTTimestamp(),
    action: entry.action,
    actor: entry.actor,
    target: entry.target || null,
    previousValue: entry.previousValue,
    newValue: entry.newValue,
    metadata: entry.metadata || {}
  };

  log.push(logEntry);
  saveLog(log);

  // Also log to console for debugging
  console.log('[Audit]', logEntry);

  return logEntry;
}

/**
 * Log a status change
 */
export function logStatusChange(actor, target, previousStatus, newStatus) {
  return logAction({
    action: AuditAction.STATUS_CHANGE,
    actor,
    target,
    previousValue: previousStatus,
    newValue: newStatus
  });
}

/**
 * Log a count change
 */
export function logCountChange(actor, target, previousCount, newCount) {
  return logAction({
    action: AuditAction.COUNT_CHANGE,
    actor,
    target,
    previousValue: previousCount,
    newValue: newCount
  });
}

/**
 * Log a user login
 */
export function logUserLogin(actor, role) {
  return logAction({
    action: AuditAction.USER_LOGIN,
    actor,
    previousValue: null,
    newValue: role,
    metadata: { userAgent: navigator?.userAgent }
  });
}

/**
 * Log a user logout
 */
export function logUserLogout(actor) {
  return logAction({
    action: AuditAction.USER_LOGOUT,
    actor,
    previousValue: null,
    newValue: null
  });
}

/**
 * Log daily reset
 */
export function logDailyReset(triggeredBy) {
  return logAction({
    action: AuditAction.DAILY_RESET,
    actor: triggeredBy || 'system',
    previousValue: null,
    newValue: null,
    metadata: { resetDate: getCSTTimestamp().split('T')[0] }
  });
}

/**
 * Get all audit log entries
 * @returns {Array} Array of log entries
 */
export function getAuditLog() {
  return loadLog();
}

/**
 * Get audit log entries filtered by criteria
 * @param {Object} filters - Filter criteria
 * @param {string} filters.action - Filter by action type
 * @param {string} filters.actor - Filter by actor email
 * @param {string} filters.target - Filter by target email
 * @param {string} filters.startDate - Filter entries after this date
 * @param {string} filters.endDate - Filter entries before this date
 * @returns {Array} Filtered log entries
 */
export function getFilteredLog(filters = {}) {
  let log = loadLog();

  if (filters.action) {
    log = log.filter(entry => entry.action === filters.action);
  }

  if (filters.actor) {
    log = log.filter(entry =>
      entry.actor?.toLowerCase().includes(filters.actor.toLowerCase())
    );
  }

  if (filters.target) {
    log = log.filter(entry =>
      entry.target?.toLowerCase().includes(filters.target.toLowerCase())
    );
  }

  if (filters.startDate) {
    log = log.filter(entry => entry.timestamp >= filters.startDate);
  }

  if (filters.endDate) {
    log = log.filter(entry => entry.timestamp <= filters.endDate);
  }

  return log;
}

/**
 * Get recent activity for a specific user
 * @param {string} email - User email
 * @param {number} limit - Max number of entries to return
 * @returns {Array} Recent log entries involving the user
 */
export function getUserActivity(email, limit = 50) {
  const log = loadLog();
  const normalizedEmail = email.toLowerCase();

  return log
    .filter(entry =>
      entry.actor?.toLowerCase() === normalizedEmail ||
      entry.target?.toLowerCase() === normalizedEmail
    )
    .slice(-limit);
}

/**
 * Clear the audit log (use with caution)
 */
export function clearAuditLog() {
  try {
    localStorage.removeItem(AUDIT_LOG_KEY);
    console.log('[Audit] Log cleared');
  } catch (err) {
    console.error('Failed to clear audit log:', err);
  }
}

/**
 * Export audit log as CSV
 * @returns {string} CSV formatted audit log
 */
export function exportLogAsCSV() {
  const log = loadLog();

  if (log.length === 0) {
    return 'No audit log entries';
  }

  const headers = ['Timestamp', 'Action', 'Actor', 'Target', 'Previous Value', 'New Value'];
  const rows = log.map(entry => [
    entry.timestamp,
    entry.action,
    entry.actor || '',
    entry.target || '',
    JSON.stringify(entry.previousValue),
    JSON.stringify(entry.newValue)
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  return csv;
}

// Default export with all functions
const auditLog = {
  AuditAction,
  logAction,
  logStatusChange,
  logCountChange,
  logUserLogin,
  logUserLogout,
  logDailyReset,
  getAuditLog,
  getFilteredLog,
  getUserActivity,
  clearAuditLog,
  exportLogAsCSV
};

export default auditLog;
