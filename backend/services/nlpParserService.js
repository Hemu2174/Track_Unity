const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ').trim();

const detectDomain = (message) => {
  const domainMap = [
    { domain: 'Artificial Intelligence', pattern: /\b(ai|artificial intelligence|ml|machine learning|deep learning|nlp|computer vision)\b/i },
    { domain: 'Software Development', pattern: /\b(software|developer|backend|frontend|full stack|fullstack|web development|engineering)\b/i },
    { domain: 'Data Science', pattern: /\b(data science|data analyst|analytics|python|sql|visualization)\b/i },
    { domain: 'Cloud / DevOps', pattern: /\b(devops|cloud|aws|azure|gcp|kubernetes|docker|infrastructure)\b/i },
    { domain: 'Product / Design', pattern: /\b(product|ui|ux|design|figma)\b/i },
  ];

  const match = domainMap.find((entry) => entry.pattern.test(message));
  return match ? match.domain : null;
};

const extractCompany = (message) => {
  const patterns = [
    /^([A-Z][A-Za-z0-9&.,'\- ]+?)\s+(?:internship|hiring|job|opportunity|opening|role|position)/i,
    /\bat\s+([A-Z][A-Za-z0-9&.,'\- ]+?)(?:\s+for|\s+is|\.|,|$)/i,
    /\bfrom\s+([A-Z][A-Za-z0-9&.,'\- ]+?)(?:\s+for|\s+is|\.|,|$)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      return normalizeWhitespace(match[1]);
    }
  }

  const linkMatch = message.match(/([a-z0-9-]+)\.[a-z]{2,}/i);
  if (linkMatch?.[1]) {
    return linkMatch[1]
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  return null;
};

const extractRole = (message) => {
  const rolePattern = /\b(?:software|frontend|backend|full stack|fullstack|data|ai|ml|cloud|devops|product|business|research)?\s*(intern(?:ship)?|engineer|developer|analyst|associate|designer|researcher|trainee|apprentice)\b/i;
  const match = message.match(rolePattern);
  return match ? normalizeWhitespace(match[0]) : null;
};

const extractEligibility = (message) => {
  const patterns = [
    /\b(for|eligible(?: candidates)?|eligibility:?|open to)\s+([^.!\n]+)/i,
    /\b(\d(?:st|nd|rd|th)\s+year\s+students?|final\s+year\s+students?|graduates?|freshers?)\b/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[2]) {
      return normalizeWhitespace(match[2]);
    }
    if (match?.[1] && !match[2]) {
      return normalizeWhitespace(match[1]);
    }
  }

  return null;
};

const extractApplicationLink = (message) => {
  const urlMatch = message.match(/https?:\/\/[^\s,]+/i);
  if (urlMatch) {
    return urlMatch[0].trim();
  }

  const domainMatch = message.match(/(?:apply\s+at|register\s+at|visit|link)\s*:?\s*([a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s,]*)?)/i);
  if (domainMatch?.[1]) {
    return `https://${domainMatch[1].trim().replace(/^https?:\/\//i, '')}`;
  }

  const plainDomainMatch = message.match(/\b([a-z0-9-]+(?:\.[a-z0-9-]+)+\.[a-z]{2,})(?:\/[^\s,]*)?/i);
  if (plainDomainMatch?.[1]) {
    return `https://${plainDomainMatch[1].trim().replace(/^https?:\/\//i, '')}`;
  }

  return null;
};

const parseDateCandidate = (candidate) => {
  const hasYear = /\b\d{4}\b/.test(candidate);
  const baseCandidate = hasYear ? candidate : `${candidate} ${new Date().getFullYear()}`;
  let parsedDate = new Date(baseCandidate);

  if (!hasYear && !Number.isNaN(parsedDate.getTime()) && parsedDate < new Date()) {
    parsedDate = new Date(`${candidate} ${new Date().getFullYear() + 1}`);
  }

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const extractDeadline = (message) => {
  const patterns = [
    /(?:deadline|last date|apply by|applications? close[sd]?|closes? on)\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{4}-\d{2}-\d{2})/i,
    /(?:deadline|last date|apply by)\s*[:\-]?\s*(\d{1,2}\s+[A-Za-z]+(?:\s+\d{4})?)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      const cleanCandidate = match[1].replace(/(st|nd|rd|th)/gi, '');
      return parseDateCandidate(cleanCandidate);
    }
  }

  return null;
};

const buildTitle = ({ company, role, domain }) => {
  if (company && role) {
    if (role.toLowerCase().startsWith(company.toLowerCase())) {
      return role;
    }

    const companyWords = company.split(/\s+/);
    const roleWords = role.split(/\s+/);
    if (
      companyWords[companyWords.length - 1].toLowerCase() === roleWords[0].toLowerCase() &&
      roleWords.length > 1
    ) {
      return `${company} ${roleWords.slice(1).join(' ')}`;
    }

    return `${company} ${role}`;
  }
  if (role) {
    return role;
  }
  if (company && domain) {
    return `${company} ${domain} Opportunity`;
  }
  return 'Opportunity';
};

const parseOpportunityMessage = (rawMessage) => {
  const message = normalizeWhitespace(rawMessage || '');

  const company = extractCompany(message);
  const role = extractRole(message);
  const deadline = extractDeadline(message);
  const applicationLink = extractApplicationLink(message);
  const eligibility = extractEligibility(message);
  const domain = detectDomain(message);
  const title = buildTitle({ company, role, domain });

  return {
    title,
    company,
    role,
    domain,
    eligibility,
    deadline,
    applicationLink,
    description: message,
  };
};

module.exports = { parseOpportunityMessage };
