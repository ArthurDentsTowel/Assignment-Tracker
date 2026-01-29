/**
 * Retry Utilities
 *
 * Provides retry logic with exponential backoff for async operations.
 * Useful for storage operations and API calls that may fail temporarily.
 */

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2
};

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {Object} config - Retry configuration
 * @returns {number} Delay in milliseconds
 */
function calculateDelay(attempt, config) {
  const delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt);
  // Add jitter (0-20% of delay) to prevent thundering herd
  const jitter = delay * Math.random() * 0.2;
  return Math.min(delay + jitter, config.maxDelayMs);
}

/**
 * Execute an async function with retry logic
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Retry options
 * @param {number} options.maxAttempts - Maximum number of attempts
 * @param {number} options.baseDelayMs - Base delay between retries
 * @param {number} options.maxDelayMs - Maximum delay between retries
 * @param {number} options.backoffMultiplier - Multiplier for exponential backoff
 * @param {Function} options.onRetry - Callback called before each retry
 * @param {Function} options.shouldRetry - Function to determine if retry should occur
 * @returns {Promise<any>} Result of the function
 */
export async function withRetry(fn, options = {}) {
  const config = { ...DEFAULT_RETRY_CONFIG, ...options };
  let lastError;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (config.shouldRetry && !config.shouldRetry(error)) {
        throw error;
      }

      // Don't delay after the last attempt
      if (attempt < config.maxAttempts - 1) {
        const delay = calculateDelay(attempt, config);

        // Call onRetry callback if provided
        if (config.onRetry) {
          config.onRetry({
            attempt: attempt + 1,
            maxAttempts: config.maxAttempts,
            delay,
            error
          });
        }

        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Create a retryable version of an async function
 * @param {Function} fn - Async function to wrap
 * @param {Object} options - Default retry options
 * @returns {Function} Wrapped function with retry logic
 */
export function makeRetryable(fn, options = {}) {
  return (...args) => withRetry(() => fn(...args), options);
}

/**
 * Error types that should typically trigger a retry
 */
export function isRetryableError(error) {
  // Network errors
  if (error.name === 'NetworkError' || error.message?.includes('network')) {
    return true;
  }

  // Timeout errors
  if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
    return true;
  }

  // Storage quota errors should not retry
  if (error.name === 'QuotaExceededError') {
    return false;
  }

  // HTTP 5xx errors (server errors) should retry
  if (error.status >= 500 && error.status < 600) {
    return true;
  }

  // HTTP 429 (rate limit) should retry
  if (error.status === 429) {
    return true;
  }

  // Default: don't retry unknown errors
  return false;
}
