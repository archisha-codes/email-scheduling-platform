import React from 'react';
import { Email } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { Calendar, User, Clock, Inbox } from 'lucide-react';

interface ScheduledTableProps {
  emails: Email[];
  loading: boolean;
}

export const ScheduledTable: React.FC<ScheduledTableProps> = ({ emails, loading }) => {
  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 bg-slate-900/60 rounded-xl animate-pulse border border-slate-800" />
        ))}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
          <Inbox className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-300">No scheduled emails in queue</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Click "Compose Email" to upload contacts and schedule delayed outreach sequences.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="bg-[#151D2A] text-slate-400 font-medium uppercase tracking-wider border-b border-[#232E42]">
          <tr>
            <th className="px-6 py-3.5">Recipient</th>
            <th className="px-6 py-3.5">Subject</th>
            <th className="px-6 py-3.5">Scheduled Send Time</th>
            <th className="px-6 py-3.5">Sender</th>
            <th className="px-6 py-3.5">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#232E42]/60">
          {emails.map((email) => {
            const formattedDate = new Date(email.scheduledAt).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <tr key={email.id} className="hover:bg-slate-800/40 transition-colors group">
                <td className="px-6 py-4 font-medium text-slate-200">
                  <span className="font-mono text-slate-300">{email.recipient}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="max-w-xs truncate text-slate-200 font-medium" title={email.subject}>
                    {email.subject}
                  </div>
                  <div className="max-w-xs truncate text-[11px] text-slate-500" title={email.body}>
                    {email.body}
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-400">
                  <div className="inline-flex items-center gap-1.5 font-mono text-[11px] bg-slate-900/60 px-2.5 py-1 rounded border border-slate-800">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{formattedDate}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>{email.sender?.email || 'Default Sender'}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={email.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
