import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SlidersHorizontal, AlertTriangle, Clock } from 'lucide-react';

// Shared deadline resolver — same logic as OpportunityCard
const resolveDeadline = (opportunity) => {
  if (opportunity?.deadline) {
    const d = new Date(opportunity.deadline);
    if (!Number.isNaN(d.getTime())) return d;
  }
  // Fallback: parse from description
  const desc = opportunity?.description || '';
  const match = String(desc).match(
    /(?:last date(?:\s+to\s+register)?|deadline|apply by|register by)\s*[:\-]?\s*(\d{1,2}\s+[A-Za-z]+(?:\s+\d{4})?|[A-Za-z]+\s+\d{1,2}(?:,\s*\d{4})?|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})/i
  );
  if (!match?.[1]) return null;
  const candidate = match[1].trim();
  const nowYear = new Date().getFullYear();
  const patterns = [
    /^(\d{4})-(\d{2})-(\d{2})$/,
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/,
    /^(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?$/,
    /^([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?$/,
  ];
  for (const pattern of patterns) {
    const m = candidate.match(pattern);
    if (!m) continue;
    let parsed;
    if (pattern === patterns[0]) parsed = new Date(candidate);
    else if (pattern === patterns[1]) parsed = new Date(Number(m[3] < 100 ? 2000 + Number(m[3]) : m[3]), Number(m[2]) - 1, Number(m[1]));
    else if (pattern === patterns[2]) parsed = new Date(`${m[2]} ${m[1]}, ${m[3] || nowYear}`);
    else parsed = new Date(`${m[1]} ${m[2]}, ${m[3] || nowYear}`);
    if (parsed && !Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
};

const formatCountdown = (deadline) => {
  const ms = deadline.getTime() - Date.now();
  if (ms <= 0) return { text: 'Deadline passed', urgent: true };
  const totalMins = Math.floor(ms / 60000);
  const totalHours = Math.floor(totalMins / 60);
  const days = Math.floor(totalHours / 24);
  if (days >= 2) return { text: `${days} days`, urgent: false };
  if (days === 1) {
    const h = totalHours % 24;
    return { text: h ? `1 day ${h}h` : '1 day', urgent: true };
  }
  if (totalHours >= 1) {
    const m = totalMins % 60;
    return { text: m ? `${totalHours}h ${m}m` : `${totalHours}h`, urgent: true };
  }
  return { text: `${totalMins}m`, urgent: true };
};

const getBarColor = (ms) => {
  const hours = ms / 3600000;
  if (hours <= 24) return 'bg-red-500';
  if (hours <= 72) return 'bg-orange-400';
  return 'bg-emerald-400';
};

const DeadlineTracker = ({ opportunities = [] }) => {
  const [tick, setTick] = useState(0);

  // Live countdown — updates every minute
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const now = Date.now();
  const upcoming = opportunities
    .map((opp) => ({ ...opp, _resolvedDeadline: resolveDeadline(opp) }))
    .filter((opp) => opp._resolvedDeadline && opp._resolvedDeadline.getTime() >= now)
    .sort((a, b) => a._resolvedDeadline - b._resolvedDeadline)
    .slice(0, 5);

  return (
    <div className="bg-white border border-slate-200 rounded-[32px] p-7 shadow-sm mb-7">
      <div className="flex items-center justify-between mb-8">
        <h4 className="font-bold text-slate-800 text-[15px] font-outfit">Deadline Tracker</h4>
        <button className="text-slate-400 hover:text-blue-500"><SlidersHorizontal size={18}/></button>
      </div>
      <div className="space-y-7">
        {upcoming.length === 0 ? (
          <div className="text-center py-6 text-slate-400 font-medium text-sm">
            No upcoming deadlines.
          </div>
        ) : upcoming.map((item, i) => {
          const deadline = item._resolvedDeadline;
          const ms = deadline.getTime() - now;
          const { text: countdownText, urgent } = formatCountdown(deadline);
          const name = item.title || 'Opportunity';
          // Progress bar — 100% when deadline passed, 0 if > 7 days
          const maxMs = 7 * 24 * 3600000;
          const progress = Math.min(100, Math.round(((maxMs - ms) / maxMs) * 100));
          return (
            <div key={item._id || i} className="space-y-2.5">
              <div className="flex justify-between items-center px-0.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-5 h-5 bg-white border border-slate-100 rounded flex items-center justify-center p-0.5 overflow-hidden shrink-0">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${(item.company || name).split(' ')[0].toLowerCase()}.com`}
                      alt=""
                      className="w-3.5 h-3.5"
                    />
                  </div>
                  <span className="text-[13px] font-bold text-slate-800 tracking-tight font-inter truncate">{name}</span>
                </div>
                <div className={`flex items-center gap-1 shrink-0 ml-2 px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                  urgent ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
                }`}>
                  {urgent ? <AlertTriangle size={10} /> : <Clock size={10} />}
                  {countdownText}
                </div>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`h-full ${getBarColor(ms)} rounded-full`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DeadlineTracker;
