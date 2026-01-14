/**
 * URL Normalizer Utility
 * Validates and normalizes website URLs
 */

/**
 * Normalize URL by adding https:// prefix and removing trailing slashes
 * @param url - URL string to normalize
 * @returns Normalized URL
 * @throws Error if URL is invalid or uses non-HTTP protocol
 */
export function normalizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    throw new Error('URL must be a non-empty string');
  }

  // Trim whitespace
  let normalized = url.trim();

  if (normalized.length === 0) {
    throw new Error('URL cannot be empty');
  }

  // Add https:// if no protocol specified
  if (!normalized.match(/^[a-zA-Z]+:\/\//)) {
    normalized = `https://${normalized}`;
  }

  // Validate URL format
  let urlObj: URL;
  try {
    urlObj = new URL(normalized);
  } catch (error) {
    throw new Error(`Invalid URL format: ${url}`);
  }

  // Only allow HTTP and HTTPS protocols
  if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
    throw new Error(`Invalid protocol: ${urlObj.protocol}. Only http:// and https:// are allowed`);
  }

  // Normalize hostname to lowercase
  urlObj.hostname = urlObj.hostname.toLowerCase();

  // Remove trailing slashes from pathname
  if (urlObj.pathname !== '/') {
    urlObj.pathname = urlObj.pathname.replace(/\/+$/, '');
  } else {
    // Root path - keep it empty by setting to empty string
    urlObj.pathname = '';
  }

  // Reconstruct URL without trailing slash
  let result = `${urlObj.protocol}//${urlObj.hostname}`;

  // Add port if non-standard
  if (urlObj.port) {
    result += `:${urlObj.port}`;
  }

  // Add pathname if exists
  if (urlObj.pathname && urlObj.pathname !== '/') {
    result += urlObj.pathname;
  }

  // Add search params if exist
  if (urlObj.search) {
    result += urlObj.search;
  }

  // Add hash if exists
  if (urlObj.hash) {
    result += urlObj.hash;
  }

  return result;
}

/**
 * Check if URL is a valid HTTP/HTTPS URL
 * @param url - URL string to validate
 * @returns true if valid HTTP/HTTPS URL
 */
export function isValidHttpUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}
