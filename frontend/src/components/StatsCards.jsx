import React from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, Clock, CheckCircle2 } from 'lucide-react';

const StatsCards = ({ stats }) => {
  const safeStats = stats || { total: 0, upcoming: 0, applied: 0 };

  const cards = [
    { 
      title: 'Total Opportunities', 
      count: Number(safeStats.total ?? 0), 
      icon: <LayoutGrid size={18} />, 
      color: 'bg-blue-600'
    },
    { 
      title: 'Upcoming Deadlines', 
      count: Number(safeStats.upcoming ?? 0), 
      icon: <Clock size={18} />, 
      color: 'bg-orange-500'
    },
    { 
      title: 'Applied', 
      count: Number(safeStats.applied ?? 0), 
      icon: <CheckCircle2 size={18} />, 
      color: 'bg-green-600'
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {cards.map((card, i) => (
        <motion.div 
          key={i} 
          whileHover={{ scale: 1.05 }}
          className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-md transition-all group cursor-pointer"
        >
          <div className={`w-14 h-10 rounded-xl ${card.color} flex items-center justify-center text-white mb-5 shadow-inner`}>
             {card.icon}
          </div>
          <div className="space-y-1">
             <p className="text-[14px] font-bold text-slate-500 leading-tight uppercase tracking-wider">{card.title}</p>
             <h2 className="text-4xl font-black text-slate-900 leading-tight font-outfit">{card.count}</h2>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default StatsCards;
