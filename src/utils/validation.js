/**
 * Validation Utilities for UW Assignment Tracker
 *
 * This module provides input validation, sanitization, and authorization
 * helpers. Designed to support future integration with Supabase and dynamic
 * user management systems.
 */

// ============================================
// EMAIL VALIDATION
// ============================================

/**
 * Validates email format using RFC 5322 compliant regex
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email format
 */
export function isValidEmailFormat(email) {
  if (!email || typeof email !== 'string') return false;

  // RFC 5322 compliant email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  return emailRegex.test(email.trim());
}

/**
 * Validates that email belongs to allowed domain(s)
 * @param {string} email - Email address to validate
 * @param {string[]} allowedDomains - Array of allowed domain names
 * @returns {boolean} True if email domain is allowed
 */
export function isAllowedDomain(email, allowedDomains = ['nationslending.com']) {
  if (!isValidEmailFormat(email)) return false;

  const domain = email.trim().toLowerCase().split('@')[1];
  return allowedDomains.some(allowed =>
    domain === allowed.toLowerCase() || domain.endsWith('.' + allowed.toLowerCase())
  );
}

/**
 * Normalizes email for consistent comparison
 * @param {string} email - Email to normalize
 * @returns {string} Lowercase, trimmed email
 */
export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

// ============================================
// INPUT SANITIZATION
// ============================================

/**
 * Sanitizes string input to prevent XSS attacks
 * @param {string} input - Raw input string
 * @returns {string} Sanitized string
 */
export function sanitizeString(input) {
  if (!input || typeof input !== 'string') return '';

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitizes email input - removes potentially dangerous characters
 * while preserving valid email characters
 * @param {string} email - Raw email input
 * @returns {string} Sanitized email
 */
export function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') return '';

  // Remove any character that shouldn't be in an email
  // Allow: alphanumeric, @, ., _, -, +
  return email
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._\-+]/g, '');
}

// ============================================
// AUTHORIZATION HELPERS
// ============================================

/**
 * User roles enumeration
 */
export const UserRole = {
  UNDERWRITER: 'underwriter',
  ASSIGNER: 'assigner',
  UNKNOWN: 'unknown'
};

/**
 * Determines user role from email and user configuration
 * @param {string} email - User email
 * @param {Object} config - Configuration object with underwriters and assigners
 * @returns {string} User role from UserRole enum
 */
export function getUserRole(email, config) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !config) return UserRole.UNKNOWN;

  if (config.assigners && config.assigners.includes(normalizedEmail)) {
    return UserRole.ASSIGNER;
  }

  if (config.underwriters && config.underwriters[normalizedEmail]) {
    return UserRole.UNDERWRITER;
  }

  return UserRole.UNKNOWN;
}

/**
 * Checks if user is authorized to access the application
 * @param {string} email - User email
 * @param {Object} config - Configuration object
 * @returns {Object} Authorization result with isAuthorized, role, and message
 */
export function validateAuthorization(email, config) {
  const result = {
    isAuthorized: false,
    role: UserRole.UNKNOWN,
    email: '',
    displayName: '',
    errors: []
  };

  // Step 1: Sanitize input
  const sanitizedEmail = sanitizeEmail(email);

  // Step 2: Validate email format
  if (!isValidEmailFormat(sanitizedEmail)) {
    result.errors.push('Please enter a valid email address.');
    return result;
  }

  // Step 3: Validate domain
  if (!isAllowedDomain(sanitizedEmail)) {
    result.errors.push('Please use your Nations Lending email address.');
    return result;
  }

  // Step 4: Check user exists in config
  const role = getUserRole(sanitizedEmail, config);

  if (role === UserRole.UNKNOWN) {
    result.errors.push('Email not recognized. Please contact your administrator if you need access.');
    return result;
  }

  // Step 5: Build successful result
  result.isAuthorized = true;
  result.role = role;
  result.email = sanitizedEmail;
  result.displayName = config.underwriters[sanitizedEmail]?.name ||
                       sanitizedEmail.split('@')[0].split('.').map(
                         s => s.charAt(0).toUpperCase() + s.slice(1)
                       ).join(' ');

  return result;
}

/**
 * Checks if user can modify a specific underwriter's status
 * @param {string} currentUserEmail - Current logged-in user's email
 * @param {string} targetEmail - Email of underwriter being modified
 * @param {string} userRole - Current user's role
 * @returns {boolean} True if modification is allowed
 */
export function canModifyStatus(currentUserEmail, targetEmail, userRole) {
  const normalizedCurrent = normalizeEmail(currentUserEmail);
  const normalizedTarget = normalizeEmail(targetEmail);

  // Assigners can modify any status
  if (userRole === UserRole.ASSIGNER) return true;

  // Underwriters can only modify their own status
  if (userRole === UserRole.UNDERWRITER) {
    return normalizedCurrent === normalizedTarget;
  }

  return false;
}

/**
 * Checks if user can modify file counts
 * @param {string} userRole - Current user's role
 * @returns {boolean} True if user can modify counts
 */
export function canModifyCount(userRole) {
  return userRole === UserRole.ASSIGNER;
}

// ============================================
// FUTURE: DYNAMIC USER MANAGEMENT HOOKS
// ============================================

/**
 * Placeholder for future API-based user validation
 * When Supabase is configured, this will call the backend
 * @param {string} email - User email to validate
 * @returns {Promise<Object>} User data from backend
 */
export async function validateUserFromAPI(email) {
  // TODO: Implement when Supabase is configured
  // Example structure:
  // const response = await fetch('/api/users/validate', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ email: sanitizeEmail(email) })
  // });
  // return response.json();

  throw new Error('API validation not yet implemented. Using local config.');
}

/**
 * Placeholder for fetching dynamic user list from Supabase
 * @returns {Promise<Object>} Configuration object with users
 */
export async function fetchUserConfig() {
  // TODO: Implement when Supabase is configured
  // Example structure:
  // const response = await fetch('/api/users/config');
  // return response.json();

  throw new Error('Dynamic user config not yet implemented. Using local config.');
}

// ============================================
// VALIDATION ERROR MESSAGES
// ============================================

export const ValidationMessages = {
  INVALID_EMAIL_FORMAT: 'Please enter a valid email address.',
  INVALID_DOMAIN: 'Please use your Nations Lending email address.',
  USER_NOT_FOUND: 'Email not recognized. Please contact your administrator if you need access.',
  UNAUTHORIZED_ACTION: 'You are not authorized to perform this action.',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
  STORAGE_ERROR: 'Unable to save changes. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.'
};
