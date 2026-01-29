import { useState } from 'react';
import {
  isValidEmailFormat,
  isAllowedDomain,
  sanitizeEmail,
  normalizeEmail
} from '../utils/validation.js';

/**
 * AdminPanel Component
 *
 * Allows assigners to manage users (underwriters and assigners).
 * Currently displays the hardcoded config - will be connected to
 * Supabase for persistent changes.
 */
export default function AdminPanel({ config, onClose, onConfigChange }) {
  const [activeTab, setActiveTab] = useState('underwriters');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [formErrors, setFormErrors] = useState([]);
  const [pendingChanges, setPendingChanges] = useState([]);

  // Get lists from config
  const underwriters = Object.entries(config.underwriters).map(([email, data]) => ({
    email,
    name: data.name
  }));

  const assigners = config.assigners.map(email => ({
    email,
    name: email.split('@')[0].split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
  }));

  const currentList = activeTab === 'underwriters' ? underwriters : assigners;

  // Validate and add user
  function handleAddUser() {
    setFormErrors([]);
    const errors = [];

    const name = newUserName.trim();
    const email = sanitizeEmail(newUserEmail);

    if (!name) {
      errors.push('Name is required');
    }

    if (!isValidEmailFormat(email)) {
      errors.push('Please enter a valid email address');
    } else if (!isAllowedDomain(email)) {
      errors.push('Email must be @nationslending.com');
    }

    // Check for duplicates
    const normalizedEmail = normalizeEmail(email);
    const existsInUW = config.underwriters[normalizedEmail];
    const existsInAssigners = config.assigners.includes(normalizedEmail);

    if (existsInUW || existsInAssigners) {
      errors.push('This email is already in the system');
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    // Add to pending changes
    setPendingChanges([...pendingChanges, {
      action: 'add',
      type: activeTab,
      email: normalizedEmail,
      name: name
    }]);

    // Clear form
    setNewUserName('');
    setNewUserEmail('');
    setShowAddForm(false);
  }

  // Mark user for removal
  function handleRemoveUser(email) {
    setPendingChanges([...pendingChanges, {
      action: 'remove',
      type: activeTab,
      email: normalizeEmail(email)
    }]);
  }

  // Check if user is pending removal
  function isPendingRemoval(email) {
    return pendingChanges.some(
      change => change.action === 'remove' && change.email === normalizeEmail(email)
    );
  }

  // Get pending additions for current tab
  function getPendingAdditions() {
    return pendingChanges.filter(
      change => change.action === 'add' && change.type === activeTab
    );
  }

  // Undo a pending change
  function undoChange(index) {
    setPendingChanges(pendingChanges.filter((_, i) => i !== index));
  }

  // Apply changes (placeholder - will connect to Supabase)
  function handleApplyChanges() {
    // For now, just show a message that Supabase is needed
    alert('Changes will be saved when Supabase is connected.\n\nPending changes:\n' +
      pendingChanges.map(c => `${c.action}: ${c.email}`).join('\n'));

    // In the future, this will call onConfigChange with the updated config
    // onConfigChange(newConfig);
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ color: '#fff', margin: 0, fontSize: '20px', fontWeight: '600' }}>
            Admin Panel
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px 8px',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <button
            onClick={() => setActiveTab('underwriters')}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: activeTab === 'underwriters' ? 'rgba(102, 126, 234, 0.2)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'underwriters' ? '2px solid #667eea' : '2px solid transparent',
              color: activeTab === 'underwriters' ? '#667eea' : 'rgba(255,255,255,0.6)',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Underwriters ({underwriters.length})
          </button>
          <button
            onClick={() => setActiveTab('assigners')}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: activeTab === 'assigners' ? 'rgba(102, 126, 234, 0.2)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'assigners' ? '2px solid #667eea' : '2px solid transparent',
              color: activeTab === 'assigners' ? '#667eea' : 'rgba(255,255,255,0.6)',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Assigners ({assigners.length})
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px 24px'
        }}>
          {/* Add User Button / Form */}
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '16px',
                borderRadius: '8px',
                border: '2px dashed rgba(255,255,255,0.2)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#667eea';
                e.currentTarget.style.color = '#667eea';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
              }}
            >
              + Add {activeTab === 'underwriters' ? 'Underwriter' : 'Assigner'}
            </button>
          ) : (
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <input
                type="text"
                placeholder="Full Name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  marginBottom: '8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
              <input
                type="email"
                placeholder="email@nationslending.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  marginBottom: '12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />

              {formErrors.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  {formErrors.map((error, i) => (
                    <p key={i} style={{ color: '#f87171', fontSize: '13px', margin: '4px 0' }}>
                      {error}
                    </p>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleAddUser}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#667eea',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewUserName('');
                    setNewUserEmail('');
                    setFormErrors([]);
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Pending Additions */}
          {getPendingAdditions().map((change, index) => (
            <div
              key={`add-${index}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                marginBottom: '8px',
                borderRadius: '8px',
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.3)'
              }}
            >
              <div>
                <div style={{ color: '#22c55e', fontSize: '14px', fontWeight: '500' }}>
                  + {change.name}
                </div>
                <div style={{ color: 'rgba(34, 197, 94, 0.7)', fontSize: '12px' }}>
                  {change.email} (pending)
                </div>
              </div>
              <button
                onClick={() => undoChange(pendingChanges.indexOf(change))}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Undo
              </button>
            </div>
          ))}

          {/* User List */}
          {currentList.map((user) => (
            <div
              key={user.email}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                marginBottom: '8px',
                borderRadius: '8px',
                background: isPendingRemoval(user.email)
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'rgba(255,255,255,0.05)',
                border: isPendingRemoval(user.email)
                  ? '1px solid rgba(239, 68, 68, 0.3)'
                  : '1px solid rgba(255,255,255,0.1)',
                opacity: isPendingRemoval(user.email) ? 0.6 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              <div>
                <div style={{
                  color: isPendingRemoval(user.email) ? '#ef4444' : '#fff',
                  fontSize: '14px',
                  fontWeight: '500',
                  textDecoration: isPendingRemoval(user.email) ? 'line-through' : 'none'
                }}>
                  {user.name}
                </div>
                <div style={{
                  color: isPendingRemoval(user.email)
                    ? 'rgba(239, 68, 68, 0.7)'
                    : 'rgba(255,255,255,0.5)',
                  fontSize: '12px'
                }}>
                  {user.email}
                  {isPendingRemoval(user.email) && ' (pending removal)'}
                </div>
              </div>
              {isPendingRemoval(user.email) ? (
                <button
                  onClick={() => {
                    const idx = pendingChanges.findIndex(
                      c => c.action === 'remove' && c.email === normalizeEmail(user.email)
                    );
                    if (idx !== -1) undoChange(idx);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Undo
                </button>
              ) : (
                <button
                  onClick={() => handleRemoveUser(user.email)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    color: '#ef4444',
                    fontSize: '12px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
            {pendingChanges.length > 0
              ? `${pendingChanges.length} pending change(s)`
              : 'No pending changes'}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
            {pendingChanges.length > 0 && (
              <button
                onClick={handleApplyChanges}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#667eea',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Apply Changes
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
