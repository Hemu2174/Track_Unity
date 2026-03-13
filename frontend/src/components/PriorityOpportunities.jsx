import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import { getPriorityOpportunities } from '../services/opportunityApi';

const MS_PER_HOUR = 1000 * 60 * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;

const formatTimeRemaining = (deadline) => {
  if (!deadline) return { label: 'No deadline', urgency: 'none' };

  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return { label: 'Deadline passed', urgency: 'critical' };

  if (ms <= MS_PER_HOUR) {
    const mins = Math.floor(ms / (1000 * 60));
    return { label: `${mins} min${mins === 1 ? '' : 's'} left`, urgency: 'critical' };
  }

  if (ms < MS_PER_DAY) {
    const h = Math.floor(ms / MS_PER_HOUR);
    return { label: `${h} hour${h === 1 ? '' : 's'} left`, urgency: 'high' };
  }

  if (ms < 2 * MS_PER_DAY) {
    return { label: 'Tomorrow', urgency: 'medium' };
  }

  const days = Math.floor(ms / MS_PER_DAY);
  return { label: `${days} days left`, urgency: 'low' };
};

const urgencyConfig = {
  critical: { bar: 'bg-red-500', badge: 'bg-red-100 text-red-700', icon: AlertTriangle },
  high:     { bar: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700', icon: Clock },
  medium:   { bar: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700', icon: Clock },
  low:      { bar: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700', icon: Clock },
  none:     { bar: 'bg-slate-300', badge: 'bg-slate-100 text-slate-500', icon: Clock },
};

const statusLabel = {
  not_applied: { text: 'Not Applied', cls: 'bg-slate-100 text-slate-600' },
  clicked_apply: { text: 'In Progress', cls: 'bg-orange-100 text-orange-700' },
  applied: { text: 'Applied', cls: 'bg-emerald-100 text-emerald-700' },
};

const PriorityOpportunities = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await getPriorityOpportunities();
      setItems(res?.data || []);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center">
            <AlertTriangle size={16} className="text-orange-600" />
          </div>
          <h3 className="font-bold text-slate-900 text-[15px]">Priority Opportunities</h3>
        </div>
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">By Deadline</span>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 size={32} className="text-emerald-400 mb-2" />
          <p className="text-sm font-semibold text-slate-600">All caught up!</p>
          <p className="text-xs text-slate-400 mt-1">No pending opportunities with upcoming deadlines.</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-3">
          {items.map((opp, index) => {
            const { label, urgency } = formatTimeRemaining(opp.deadline);
            const { bar, badge, icon: UrgencyIcon } = urgencyConfig[urgency] || urgencyConfig.none;
            const appStatus = statusLabel[opp.applicationStatus] || statusLabel.not_applied;

            return (
              <motion.div
                key={opp._id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors group"
              >
                {/* Priority rank indicator */}
                <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-slate-500">#{index + 1}</span>
                </div>

                {/* Left color bar */}
                <div className={`w-1 h-10 rounded-full shrink-0 ${bar}`} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-slate-800 truncate">{opp.title}</p>
                  <p className="text-[11px] text-slate-500 truncate">{opp.company}</p>
                </div>

                {/* Right side badges */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg ${badge}`}>
                    <UrgencyIcon size={9} />
                    {label}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${appStatus.cls}`}>
                    {appStatus.text}
                  </span>
                </div>

                <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PriorityOpportunities;
