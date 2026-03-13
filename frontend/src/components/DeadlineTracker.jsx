import React from 'react';
import { motion } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';

const calculateUpcomingDeadlines = (opportunities = []) => {
  const today = new Date();

  return opportunities
    .filter((opportunity) => Boolean(opportunity?.deadline))
    .map((opportunity) => {
      const deadline = new Date(opportunity.deadline);
      const diff = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

      return {
        ...opportunity,
        daysRemaining: diff,
      };
    })
    .filter((opportunity) => !Number.isNaN(opportunity.daysRemaining) && opportunity.daysRemaining >= 0)
    .sort((left, right) => left.daysRemaining - right.daysRemaining)
    .slice(0, 5);
};

const getBarColor = (days) => {
  if (days <= 2) return 'bg-red-400';
  if (days <= 5) return 'bg-orange-400';
  return 'bg-green-400';
};

const DeadlineTracker = ({ opportunities = [] }) => {
  const upcoming = calculateUpcomingDeadlines(opportunities);

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
          const days = item.daysRemaining;
          const progress = Math.min(100, Math.round((7 - days) / 7 * 100));
          const name = item.title || 'Opportunity';
          return (
            <div key={item._id || i} className="space-y-2.5">
              <div className="flex justify-between items-center px-0.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 bg-white border border-slate-100 rounded flex items-center justify-center p-0.5 overflow-hidden">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${(item.company || name).split(' ')[0].toLowerCase()}.com`}
                      alt=""
                      className="w-3.5 h-3.5"
                    />
                  </div>
                  <span className="text-[13px] font-bold text-slate-800 tracking-tight font-inter">{name}</span>
                </div>
                <span className="text-[11px] font-bold text-slate-400 font-inter">{days} day{days !== 1 ? 's' : ''} remaining</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={`h-full ${getBarColor(days)} rounded-full`}
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
