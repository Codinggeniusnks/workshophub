/**
 * WorkshopHub Safe Utilities
 * Prevents XSS, validates URLs, sanitizes strings and IDs.
 */

const Safe = {
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  safeUrl(url) {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    // Only allow http, https, and mailto protocols. Strictly disallow javascript:, data:, vbscript:
    if (/^(https?:\/\/|mailto:)/i.test(trimmed)) {
      return trimmed;
    }
    return '';
  },

  safeId(id) {
    if (!id || typeof id !== 'string') return 'evt_' + Date.now();
    return id.replace(/[^a-zA-Z0-9_\-]/g, '_');
  },

  truncate(str, max = 100) {
    if (!str) return '';
    return str.length > max ? str.substring(0, max) + '...' : str;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Safe;
}
