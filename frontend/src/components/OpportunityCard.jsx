import React, { useState, useEffect } from 'react';
import { ExternalLink, RefreshCw, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { revalidateOpportunityLink, clickApplyOpportunity, markOpportunityApplied } from '../services/opportunityApi';

const getFaviconUrl = (url) => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return null;
  }
};

const parseDeadlineFromDescription = (description) => {
  if (!description) {
    return null;
  }

  const dateMatch = String(description).match(
    /(?:last date(?:\s+to\s+register)?|deadline|apply by|register by)\s*[:\-]?\s*(\d{1,2}\s+[A-Za-z]+(?:\s+\d{4})?|[A-Za-z]+\s+\d{1,2}(?:,\s*\d{4})?|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})/i
  );

  if (!dateMatch?.[1]) {
    return null;
  }

  const candidate = dateMatch[1].trim();
  const patterns = [
    /^(\d{4})-(\d{2})-(\d{2})$/,
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/,
    /^(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?$/,
    /^([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?$/,
  ];

  const nowYear = new Date().getFullYear();

  for (const pattern of patterns) {
    const match = candidate.match(pattern);
    if (!match) continue;

    let parsed;

    if (pattern === patterns[0]) {
      parsed = new Date(candidate);
    } else if (pattern === patterns[1]) {
      const day = Number(match[1]);
      const month = Number(match[2]) - 1;
      const yearRaw = Number(match[3]);
      const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
      parsed = new Date(year, month, day);
    } else if (pattern === patterns[2]) {
      const day = Number(match[1]);
      const month = match[2];
      const year = Number(match[3] || nowYear);
      parsed = new Date(`${month} ${day}, ${year}`);
    } else {
      const month = match[1];
      const day = Number(match[2]);
      const year = Number(match[3] || nowYear);
      parsed = new Date(`${month} ${day}, ${year}`);
    }

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
};

const getResolvedDeadline = (isoDate, description) => {
  const primary = isoDate ? new Date(isoDate) : null;
  if (primary && !Number.isNaN(primary.getTime())) return primary;
  return parseDeadlineFromDescription(description);
};

const getDeadlineUrgency = (deadlineDate) => {
  if (!deadlineDate) return null;
  const ms = deadlineDate.getTime() - Date.now();
  if (ms <= 0) return { level: 'passed', label: 'Deadline passed!', cls: 'bg-red-500 text-white' };
  const hours = ms / 3600000;
  if (hours <= 6)  return { level: 'critical', label: `⚡ ${Math.floor(hours)}h ${Math.floor((ms % 3600000) / 60000)}m left — act now!`, cls: 'bg-red-500 text-white animate-pulse' };
  if (hours <= 24) return { level: 'high',     label: `🔴 Deadline today — ${Math.floor(hours)}h left`, cls: 'bg-red-100 text-red-700 border border-red-200' };
  if (hours <= 48) return { level: 'medium',   label: `⚠️ Deadline tomorrow`, cls: 'bg-orange-100 text-orange-700 border border-orange-200' };
  if (hours <= 72) return { level: 'soon',     label: `⏰ Deadline in ${Math.floor(hours / 24)} days`, cls: 'bg-yellow-100 text-yellow-700 border border-yellow-200' };
  return null;
};

const formatDeadline = (isoDate, description) => {
  const primary = isoDate ? new Date(isoDate) : null;
  const fallback = parseDeadlineFromDescription(description);
  const finalDate = primary && !Number.isNaN(primary.getTime()) ? primary : fallback;

  if (!finalDate) return 'No deadline';
  return finalDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

const LinkStatusBadge = ({ status }) => {
  const map = {
    valid:      { label: 'Valid',      cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
    broken:     { label: '⚠ Broken',   cls: 'bg-red-100 text-red-700 border border-red-200' },
    suspicious: { label: '? Suspicious', cls: 'bg-amber-100 text-amber-700 border border-amber-200' },
  };
  const { label, cls } = map[status] || { label: status || 'Unknown', cls: 'bg-slate-100 text-slate-500 border border-slate-200' };
  return (
    <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${cls}`}>{label}</span>
  );
};

const OpportunityCard = ({ opportunity, onLinkStatusUpdate }) => {
  const [currentLinkStatus, setCurrentLinkStatus] = useState(opportunity.linkStatus);
  const [revalidating, setRevalidating] = useState(false);
  const [appStatus, setAppStatus] = useState(opportunity.applicationStatus || 'not_applied');
  const [actionLoading, setActionLoading] = useState(false);
  const [urgency, setUrgency] = useState(() => getDeadlineUrgency(getResolvedDeadline(opportunity.deadline, opportunity.description)));

  // Live countdown — recalculate urgency every minute
  useEffect(() => {
    const deadline = getResolvedDeadline(opportunity.deadline, opportunity.description);
    if (!deadline) return;
    const id = setInterval(() => setUrgency(getDeadlineUrgency(deadline)), 60000);
    return () => clearInterval(id);
  }, [opportunity.deadline, opportunity.description]);

  const {
    title,
    company,
    role,
    domain,
    deadline,
    eligibility,
    skills,
    riskLevel,
    confidenceScore,
    logo,
    applicationLink,
    description,
    _id,
  } = opportunity;

  const linkStatus = currentLinkStatus;
  const logoSrc = logo || getFaviconUrl(applicationLink);

  const handleApply = async () => {
    if (appStatus === 'applied') return;
    if (applicationLink) window.open(applicationLink, '_blank', 'noopener,noreferrer');
    if (appStatus !== 'applied' && opportunity._id) {
      setActionLoading(true);
      try {
        await clickApplyOpportunity(opportunity._id);
        setAppStatus('clicked_apply');
      } catch {
        // silently ignore — status still updates optimistically
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleMarkApplied = async () => {
    if (!opportunity._id || actionLoading) return;
    setActionLoading(true);
    try {
      await markOpportunityApplied(opportunity._id);
      setAppStatus('applied');
    } catch {
      // silently ignore
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevalidate = async () => {
    if (!_id || revalidating) return;
    setRevalidating(true);
    try {
      const data = await revalidateOpportunityLink(_id);
      setCurrentLinkStatus(data.linkStatus);
      onLinkStatusUpdate?.(_id, data.linkStatus);
    } catch {
      // silently ignore — user can retry
    } finally {
      setRevalidating(false);
    }
  };

  return (
    <div className={`bg-white border rounded-[32px] p-7 shadow-sm hover:shadow-lg transition-all relative group ${
      urgency?.level === 'critical' || urgency?.level === 'passed'
        ? 'border-red-300 shadow-red-100'
        : urgency?.level === 'high'
        ? 'border-red-200'
        : urgency?.level === 'medium'
        ? 'border-orange-200'
        : 'border-slate-200'
    }`}>
      {/* Deadline urgency banner */}
      {urgency && (
        <div className={`absolute top-0 left-0 right-0 rounded-t-[32px] px-5 py-1.5 flex items-center gap-2 text-[12px] font-bold ${urgency.cls}`}>
          {urgency.level === 'passed' || urgency.level === 'critical' || urgency.level === 'high'
            ? <AlertTriangle size={12} />
            : <Clock size={12} />}
          {urgency.label}
        </div>
      )}
      <div className={`flex items-start gap-6 w-full ${urgency ? 'pt-7' : ''}`}>
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
          <p className="text-slate-500 font-semibold">Deadline: <span className="text-slate-800 ml-1 font-bold">{formatDeadline(deadline, description)}</span></p>
          <p className="text-slate-500 font-semibold">Eligibility: <span className="text-slate-800 ml-1 font-bold">{renderValue(eligibility, 'Open to all')}</span></p>
          <p className="text-slate-500 font-semibold">Risk: <span className="text-slate-800 ml-1 font-bold uppercase">{renderValue(riskLevel, 'low')}</span></p>
          <p className="text-slate-500 font-semibold flex items-center gap-1.5">
            Link Status: <LinkStatusBadge status={linkStatus} />
            {(linkStatus === 'broken' || linkStatus === 'suspicious') && (
              <button
                onClick={handleRevalidate}
                disabled={revalidating}
                title="Re-check link"
                className="ml-1 text-slate-400 hover:text-blue-500 transition-colors disabled:opacity-40"
              >
                <RefreshCw size={13} className={revalidating ? 'animate-spin' : ''} />
              </button>
            )}
          </p>
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

          {/* Apply button — 3 states */}
          <button
            onClick={handleApply}
            disabled={!applicationLink || appStatus === 'applied' || actionLoading}
            className={`flex-1 py-3 text-white rounded-2xl font-bold text-sm active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 ${
              appStatus === 'applied'
                ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20 cursor-default'
                : appStatus === 'clicked_apply'
                ? 'bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20'
                : linkStatus === 'broken'
                ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20'
                : 'bg-[#3B82F6] hover:bg-blue-700 shadow-lg shadow-blue-500/20'
            }`}
            title={
              appStatus === 'applied' ? 'Application submitted'
              : appStatus === 'clicked_apply' ? 'Application in progress'
              : linkStatus === 'broken' ? 'Warning: This link returned 404 — page may not exist'
              : undefined
            }
          >
            {appStatus === 'applied' ? (
              <><CheckCircle size={14} /> Applied</>
            ) : appStatus === 'clicked_apply' ? (
              <>Application In Progress <ExternalLink size={13} /></>
            ) : (
              <>{linkStatus === 'broken' ? '⚠ Apply' : 'Apply Now'} <ExternalLink size={13} /></>
            )}
          </button>

          {/* Mark as Applied — only shown when in clicked_apply state */}
          {appStatus === 'clicked_apply' && (
            <button
              onClick={handleMarkApplied}
              disabled={actionLoading}
              className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-sm active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
              title="Confirm you submitted the application form"
            >
              <CheckCircle size={14} /> Mark as Applied
            </button>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default OpportunityCard;
