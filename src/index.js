/**
 * UW Assignment Tracker
 * Entry point for the application
 *
 * This module exports the main component and utilities for use in
 * Claude's artifact system or Supabase backend.
 */

// Main component
export { default as UWAssignmentTracker } from './UWAssignmentTracker.jsx';
export { default } from './UWAssignmentTracker.jsx';

// Validation utilities - for use in Supabase integration
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

// Storage adapter - for switching between localStorage/Claude/Supabase
export { default as storage } from './utils/storage.js';
