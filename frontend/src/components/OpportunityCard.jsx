import React from 'react';
import { ExternalLink } from 'lucide-react';

const getFaviconUrl = (url) => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return null;
  }
};

const formatDeadline = (isoDate) => {
  if (!isoDate) return 'No deadline';
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatConfidence = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'N/A';
  }

  return `${Math.round(value * 100)}%`;
};

const renderValue = (value, fallback = 'N/A') => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  return value;
};

const OpportunityCard = ({ opportunity }) => {
  const {
    title,
    company,
    role,
    domain,
    deadline,
    eligibility,
    skills,
    riskLevel,
    linkStatus,
    confidenceScore,
    logo,
    applicationLink,
  } = opportunity;
  const logoSrc = logo || getFaviconUrl(applicationLink);

  const handleApply = () => {
    if (applicationLink) window.open(applicationLink, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-[32px] p-7 shadow-sm hover:shadow-lg transition-all relative group flex items-start gap-6">
      <div className="w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center p-2.5 shrink-0 shadow-sm group-hover:scale-105 transition-transform">
        {logoSrc ? (
          <img src={logoSrc} alt={company} className="w-full h-full object-contain" />
        ) : (
          <span className="text-xl font-bold text-slate-400">{company?.[0]?.toUpperCase() || '?'}</span>
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors font-outfit">{title}</h4>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Extracted Data</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[13px] mb-6">
          <p className="text-slate-500 font-semibold">Company: <span className="text-slate-800 ml-1 font-bold">{renderValue(company, 'Unknown Company')}</span></p>
          <p className="text-slate-500 font-semibold">Role: <span className="text-slate-800 ml-1 font-bold">{renderValue(role)}</span></p>
          <p className="text-slate-500 font-semibold">Domain: <span className="text-slate-800 ml-1 font-bold">{renderValue(domain)}</span></p>
          <p className="text-slate-500 font-semibold">Deadline: <span className="text-slate-800 ml-1 font-bold">{formatDeadline(deadline)}</span></p>
          <p className="text-slate-500 font-semibold">Eligibility: <span className="text-slate-800 ml-1 font-bold">{renderValue(eligibility, 'Open to all')}</span></p>
          <p className="text-slate-500 font-semibold">Risk: <span className="text-slate-800 ml-1 font-bold uppercase">{renderValue(riskLevel, 'low')}</span></p>
          <p className="text-slate-500 font-semibold">Link Status: <span className="text-slate-800 ml-1 font-bold">{renderValue(linkStatus)}</span></p>
          <p className="text-slate-500 font-semibold">Confidence: <span className="text-slate-800 ml-1 font-bold">{formatConfidence(confidenceScore)}</span></p>
        </div>

        <div className="mb-6">
          <p className="text-slate-500 font-semibold text-[13px] mb-2">Skills:</p>
          {Array.isArray(skills) && skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span key={skill} className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-[12px] font-semibold">
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-slate-700 font-bold text-[13px]">N/A</p>
          )}
        </div>

        <div className="flex gap-3">
          <button className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm active:scale-[0.98] transition-all">
            Structured View
          </button>
          <button
            onClick={handleApply}
            disabled={!applicationLink}
            className="flex-1 py-3 bg-[#3B82F6] hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            Apply <ExternalLink size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OpportunityCard;
