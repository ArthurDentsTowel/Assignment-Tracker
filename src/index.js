/**
 * UW Assignment Tracker
 * Entry point for the application
 *
 * This module exports the main component and utilities for use in
 * Claude's artifact system or future Aira integration.
 */

// Main component
export { default as UWAssignmentTracker } from './UWAssignmentTracker.jsx';
export { default } from './UWAssignmentTracker.jsx';

// Validation utilities - for use in Aira integration
export {
  isValidEmailFormat,
  isAllowedDomain,
  normalizeEmail,
  sanitizeString,
  sanitizeEmail,
  UserRole,
  getUserRole,
  validateAuthorization,
  canModifyStatus,
  canModifyCount,
  validateUserFromAPI,
  fetchUserConfig,
  ValidationMessages
} from './utils/validation.js';
