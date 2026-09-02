import React from 'react';
import { EmailStatus } from '../../types';
import { Clock, Send, AlertTriangle, XCircle, RefreshCw, Layers } from 'lucide-react';

interface StatusBadgeProps {
  status: EmailStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'SCHEDULED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#F4D35E]/10 text-[#F4D35E] border border-[#F4D35E]/30">
          <Clock className="w-3.5 h-3.5 text-[#F4D35E]" />
          Scheduled
        </span>
      );
    case 'QUEUED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#457B9D]/10 text-[#457B9D] border border-[#457B9D]/30">
          <Layers className="w-3.5 h-3.5 text-[#457B9D]" />
          Queued
        </span>
      );
    case 'PROCESSING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#457B9D]/20 text-[#457B9D] border border-[#457B9D]/40 animate-pulse">
          <RefreshCw className="w-3.5 h-3.5 text-[#457B9D] animate-spin" />
          Processing
        </span>
      );
    case 'SENT':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#66BB6A]/15 text-[#66BB6A] border border-[#66BB6A]/30">
          <Send className="w-3.5 h-3.5 text-[#66BB6A]" />
          Sent
        </span>
      );
    case 'RATE_LIMITED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#E63946]/10 text-[#E63946] border border-[#E63946]/30">
          <AlertTriangle className="w-3.5 h-3.5 text-[#E63946]" />
          Rate Limited (Rescheduled)
        </span>
      );
    case 'FAILED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#8B1E2D]/20 text-[#E63946] border border-[#E63946]/40">
          <XCircle className="w-3.5 h-3.5 text-[#E63946]" />
          Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-400">
          {status}
        </span>
      );
  }
};
