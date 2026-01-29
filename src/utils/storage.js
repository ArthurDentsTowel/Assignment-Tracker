/**
 * Storage Adapter
 *
 * Abstracts storage operations so the app can work with:
 * - localStorage (default, for local development)
 * - Claude's window.storage (when running as artifact)
 * - Supabase (future, for production)
 *
 * Usage:
 *   import storage from './utils/storage';
 *   await storage.get('key');
 *   await storage.set('key', value);
 */

// Detect environment
const isClaudeArtifact = typeof window !== 'undefined' &&
                          typeof window.storage !== 'undefined' &&
                          typeof window.storage.get === 'function';

/**
 * Storage provider interface
 */
const StorageProvider = {
  LOCAL: 'localStorage',
  CLAUDE: 'claude',
  SUPABASE: 'supabase'
};

// Current provider (auto-detected, can be overridden)
let currentProvider = isClaudeArtifact ? StorageProvider.CLAUDE : StorageProvider.LOCAL;

/**
 * LocalStorage adapter
 */
const localStorageAdapter = {
  async get(key) {
    try {
      const value = localStorage.getItem(key);
      return value ? { value } : null;
    } catch (err) {
      console.error('LocalStorage get error:', err);
      return null;
    }
  },

  async set(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (err) {
      console.error('LocalStorage set error:', err);
      return false;
    }
  },

  async remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (err) {
      console.error('LocalStorage remove error:', err);
      return false;
    }
  }
};

/**
 * Claude artifact storage adapter
 */
const claudeStorageAdapter = {
  async get(key, shared = true) {
    try {
      return await window.storage.get(key, shared);
    } catch (err) {
      console.error('Claude storage get error:', err);
      return null;
    }
  },

  async set(key, value, shared = true) {
    try {
      await window.storage.set(key, value, shared);
      return true;
    } catch (err) {
      console.error('Claude storage set error:', err);
      return false;
    }
  },

  async remove(key, shared = true) {
    try {
      await window.storage.remove(key, shared);
      return true;
    } catch (err) {
      console.error('Claude storage remove error:', err);
      return false;
    }
  }
};

/**
 * Supabase adapter (placeholder for future implementation)
 */
const supabaseAdapter = {
  client: null,

  // Initialize with Supabase client
  init(supabaseClient) {
    this.client = supabaseClient;
  },

  async get(key) {
    if (!this.client) {
      throw new Error('Supabase client not initialized. Call storage.initSupabase() first.');
    }

    // TODO: Implement when Supabase is set up
    // Example structure:
    // const { data, error } = await this.client
    //   .from('app_storage')
    //   .select('value')
    //   .eq('key', key)
    //   .single();
    // return data ? { value: data.value } : null;

    throw new Error('Supabase storage not yet implemented');
  },

  async set(key, value) {
    if (!this.client) {
      throw new Error('Supabase client not initialized. Call storage.initSupabase() first.');
    }

    // TODO: Implement when Supabase is set up
    // Example structure:
    // const { error } = await this.client
    //   .from('app_storage')
    //   .upsert({ key, value, updated_at: new Date().toISOString() });
    // return !error;

    throw new Error('Supabase storage not yet implemented');
  },

  async remove(key) {
    if (!this.client) {
      throw new Error('Supabase client not initialized. Call storage.initSupabase() first.');
    }

    // TODO: Implement when Supabase is set up
    throw new Error('Supabase storage not yet implemented');
  }
};

/**
 * Get the current storage adapter based on provider
 */
function getAdapter() {
  switch (currentProvider) {
    case StorageProvider.CLAUDE:
      return claudeStorageAdapter;
    case StorageProvider.SUPABASE:
      return supabaseAdapter;
    case StorageProvider.LOCAL:
    default:
      return localStorageAdapter;
  }
}

/**
 * Main storage interface
 */
const storage = {
  /**
   * Get current provider
   */
  getProvider() {
    return currentProvider;
  },

  /**
   * Set storage provider
   */
  setProvider(provider) {
    if (!Object.values(StorageProvider).includes(provider)) {
      throw new Error(`Invalid storage provider: ${provider}`);
    }
    currentProvider = provider;
    console.log(`Storage provider set to: ${provider}`);
  },

  /**
   * Initialize Supabase (call before using Supabase provider)
   */
  initSupabase(supabaseClient) {
    supabaseAdapter.init(supabaseClient);
    this.setProvider(StorageProvider.SUPABASE);
  },

  /**
   * Get value by key
   * @param {string} key - Storage key
   * @param {boolean} shared - For Claude: use shared storage (ignored for other providers)
   * @returns {Promise<{value: string}|null>}
   */
  async get(key, shared = true) {
    const adapter = getAdapter();
    if (currentProvider === StorageProvider.CLAUDE) {
      return adapter.get(key, shared);
    }
    return adapter.get(key);
  },

  /**
   * Set value by key
   * @param {string} key - Storage key
   * @param {string} value - Value to store (should be stringified if object)
   * @param {boolean} shared - For Claude: use shared storage (ignored for other providers)
   * @returns {Promise<boolean>}
   */
  async set(key, value, shared = true) {
    const adapter = getAdapter();
    if (currentProvider === StorageProvider.CLAUDE) {
      return adapter.set(key, value, shared);
    }
    return adapter.set(key, value);
  },

  /**
   * Remove value by key
   * @param {string} key - Storage key
   * @param {boolean} shared - For Claude: use shared storage (ignored for other providers)
   * @returns {Promise<boolean>}
   */
  async remove(key, shared = true) {
    const adapter = getAdapter();
    if (currentProvider === StorageProvider.CLAUDE) {
      return adapter.remove(key, shared);
    }
    return adapter.remove(key);
  },

  // Export provider enum for external use
  Provider: StorageProvider
};

export default storage;
