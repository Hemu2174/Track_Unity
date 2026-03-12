/**
 * opportunityParser.js
 * Extracts opportunity fields from a raw text message using regex patterns.
 */

/**
 * @param {string} message - Raw opportunity message text
 * @returns {Object} - Extracted fields: company, role, deadline, applicationLink
 */
const parseOpportunity = (message) => {
  const result = {
    company: null,
    role: null,
    deadline: null,
    applicationLink: null,
  };

  if (!message || typeof message !== 'string') return result;

  // --- Company ---
  // Matches patterns like "Google AI Internship", "at Microsoft", "by Amazon"
  const companyPatterns = [
    /^([A-Z][A-Za-z0-9\s&.'-]+?)\s+(?:internship|job|hiring|opportunity|role|position)/i,
    /\bat\s+([A-Z][A-Za-z0-9\s&.'-]+?)(?:\s+for|\s+is|\s*[.,!]|$)/i,
    /\bby\s+([A-Z][A-Za-z0-9\s&.'-]+?)(?:\s+for|\s+is|\s*[.,!]|$)/i,
    /([A-Z][A-Za-z0-9]+)(?:\s+AI|\s+Technologies?|\s+Inc\.?|\s+Ltd\.?|\s+Corp\.?)/i,
  ];

  for (const pattern of companyPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      result.company = match[1].trim();
      break;
    }
  }

  // --- Role ---
  // Matches "internship", "engineer", "developer", "analyst", "designer", etc.
  const roleMatch = message.match(
    /\b((?:software|frontend|backend|fullstack|full[\s-]stack|data|ai|ml|ui\/ux|product|devops|cloud|mobile|android|ios)\s+)?([a-z]+\s+)?(intern(?:ship)?|engineer(?:ing)?|developer|analyst|designer|architect|manager|researcher|consultant|specialist)\b/i
  );
  if (roleMatch) {
    result.role = roleMatch[0].trim();
  }

  // --- Deadline ---
  // Matches "Deadline March 30", "apply by 30 March", "last date: 2024-03-30", etc.
  const deadlinePatterns = [
    /(?:deadline|last\s+date|apply\s+by|applications?\s+close[sd]?|closes?\s+on)\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{4}-\d{2}-\d{2})/i,
    /([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?)\s+(?:is\s+the\s+)?(?:last|deadline)/i,
  ];

  for (const pattern of deadlinePatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const parsed = new Date(match[1].trim());
      result.deadline = isNaN(parsed.getTime()) ? match[1].trim() : parsed.toISOString().split('T')[0];
      break;
    }
  }

  // --- Application Link ---
  // Matches URLs (http/https) or plain domain references like "apply at google.com"
  const urlMatch = message.match(/https?:\/\/[^\s,]+/i);
  if (urlMatch) {
    result.applicationLink = urlMatch[0].trim();
  } else {
    const domainMatch = message.match(
      /(?:apply\s+at|link\s*[:\-]?\s*|visit\s+)([a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s,]*)?)/i
    );
    if (domainMatch) {
      result.applicationLink = domainMatch[1].trim();
    }
  }

  return result;
};

module.exports = { parseOpportunity };
