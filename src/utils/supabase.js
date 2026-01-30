/**
 * Supabase Client
 *
 * Initializes and exports the Supabase client for use throughout the app.
 * Handles authentication, database operations, and real-time subscriptions.
 */

import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Track if Supabase is configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Create Supabase client only if configured
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null;

// Log warning if not configured
if (!isSupabaseConfigured) {
  console.error('Missing Supabase environment variables. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
}

/**
 * Authentication helpers
 */

/**
 * Sign in with GitHub OAuth
 * @returns {Promise<{data, error}>}
 */
export async function signInWithGitHub() {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: window.location.origin
    }
  });
  return { data, error };
}

/**
 * Sign out the current user
 * @returns {Promise<{error}>}
 */
export async function signOut() {
  if (!supabase) return { error: new Error('Supabase not configured') };
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get the current session
 * @returns {Promise<{data: {session}, error}>}
 */
export async function getSession() {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  const { data, error } = await supabase.auth.getSession();
  return { data, error };
}

/**
 * Get the current user
 * @returns {Promise<{data: {user}, error}>}
 */
export async function getUser() {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  const { data, error } = await supabase.auth.getUser();
  return { data, error };
}

/**
 * Subscribe to auth state changes
 * @param {Function} callback - Called with (event, session) on auth changes
 * @returns {Object} Subscription object with unsubscribe method
 */
export function onAuthStateChange(callback) {
  if (!supabase) return null;
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return subscription;
}

/**
 * Database helpers
 */

/**
 * Get all users from the users table
 * @returns {Promise<{data, error}>}
 */
export async function getUsers() {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name');
  return { data, error };
}

/**
 * Get a user by email
 * @param {string} email
 * @returns {Promise<{data, error}>}
 */
export async function getUserByEmail(email) {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();
  return { data, error };
}

/**
 * Add a new user
 * @param {Object} user - User object with email, name, role
 * @returns {Promise<{data, error}>}
 */
export async function addUser(user) {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  const { data, error } = await supabase
    .from('users')
    .insert([{
      email: user.email.toLowerCase(),
      name: user.name,
      role: user.role
    }])
    .select()
    .single();
  return { data, error };
}

/**
 * Remove a user by email
 * @param {string} email
 * @returns {Promise<{data, error}>}
 */
export async function removeUser(email) {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  const { data, error } = await supabase
    .from('users')
    .delete()
    .eq('email', email.toLowerCase());
  return { data, error };
}

/**
 * Get tracker status data
 * @returns {Promise<{data, error}>}
 */
export async function getTrackerData() {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  const { data, error } = await supabase
    .from('tracker_status')
    .select('*');
  return { data, error };
}

/**
 * Update tracker status for a user
 * @param {string} email
 * @param {Object} updates - Fields to update (status, count, etc.)
 * @returns {Promise<{data, error}>}
 */
export async function updateTrackerStatus(email, updates) {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  const { data, error } = await supabase
    .from('tracker_status')
    .upsert({
      email: email.toLowerCase(),
      ...updates,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  return { data, error };
}

/**
 * Reset all tracker statuses (for daily reset)
 * @returns {Promise<{data, error}>}
 */
export async function resetAllTrackerStatuses() {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  const { data, error } = await supabase
    .from('tracker_status')
    .update({
      status: 'neutral',
      count: 0,
      status_time: null,
      status_timestamp: null,
      updated_at: new Date().toISOString()
    })
    .neq('email', ''); // Update all rows
  return { data, error };
}

/**
 * Subscribe to tracker status changes (real-time)
 * @param {Function} callback - Called when tracker data changes
 * @returns {Object} Subscription object
 */
export function subscribeToTrackerChanges(callback) {
  if (!supabase) return null;
  return supabase
    .channel('tracker_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tracker_status'
      },
      callback
    )
    .subscribe();
}

/**
 * Unsubscribe from a channel
 * @param {Object} subscription
 */
export function unsubscribe(subscription) {
  if (subscription) {
    supabase.removeChannel(subscription);
  }
}

export default supabase;
