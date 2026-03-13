const { URL } = require('url');

const axios = require('axios');

const BLACKLISTED_DOMAINS = new Set([
  'bit.ly',
  'tinyurl.com',
  'goo.gl',
  't.co',
]);

const normalizeUrl = (value) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
};

const validateOpportunityLink = async (inputUrl) => {
  const normalized = normalizeUrl(inputUrl);
  if (!normalized) {
    return { linkStatus: 'broken', normalizedUrl: null, reason: 'missing-url' };
  }

  let parsed;
  try {
    parsed = new URL(normalized);
  } catch (error) {
    return { linkStatus: 'broken', normalizedUrl: normalized, reason: 'invalid-url-format' };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLACKLISTED_DOMAINS.has(hostname)) {
    return { linkStatus: 'suspicious', normalizedUrl: normalized, reason: 'blacklisted-domain' };
  }

  try {
    const response = await axios.get(normalized, {
      maxRedirects: 5,
      timeout: Number(process.env.LINK_VALIDATION_TIMEOUT_MS) || 5000,
      validateStatus: () => true,
    });

    // 2xx → valid
    if (response.status >= 200 && response.status < 300) {
      return { linkStatus: 'valid', normalizedUrl: normalized, reason: `status-${response.status}` };
    }

    // 404 / 410 → definitively broken (page does not exist)
    if (response.status === 404 || response.status === 410) {
      return { linkStatus: 'broken', normalizedUrl: normalized, reason: `status-${response.status}` };
    }

    // 5xx server errors → broken
    if (response.status >= 500) {
      return { linkStatus: 'broken', normalizedUrl: normalized, reason: `status-${response.status}` };
    }

    // 3xx redirects (shouldn't reach here with maxRedirects, but just in case)
    // 401 / 403 / 429 / other 4xx → suspicious (auth-gated or rate-limited, not necessarily gone)
    return { linkStatus: 'suspicious', normalizedUrl: normalized, reason: `status-${response.status}` };
  } catch (error) {
    return { linkStatus: 'broken', normalizedUrl: normalized, reason: 'request-failed' };
  }
};

module.exports = {
  validateOpportunityLink,
};
