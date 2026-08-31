'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { PersonPhoto } from '@/components/person-photo';
import { previewMessages } from '@/lib/medlink-data';

export default function MessagesPage() {
  const [active, setActive] = useState(previewMessages[0].id);
  const thread = previewMessages.find((row) => row.id === active) ?? previewMessages[0];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="p-0">
        <ul className="divide-y divide-slate-100">
          {previewMessages.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => setActive(row.id)}
                className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${active === row.id ? 'bg-mint' : ''}`}
              >
                <PersonPhoto src={row.photo} name={row.name} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-navy-900">{row.name}</span>
                    <span className="text-xs text-slate-400">{row.time}</span>
                  </span>
                  <span className="block truncate text-xs text-slate-500">{row.preview}</span>
                </span>
                {row.unread > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-[8px] text-white">
                    {row.unread}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="lg:col-span-2">
        <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
          <PersonPhoto src={thread.photo} name={thread.name} />
          <div>
            <div className="font-semibold text-navy-900">{thread.name}</div>
            <div className="text-xs text-slate-400">Online</div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="max-w-md rounded-2xl rounded-tl-md bg-canvas px-4 py-3 text-sm text-slate-700">{thread.preview}</div>
          <div className="ml-auto max-w-md rounded-2xl rounded-tr-md bg-brand-500 px-4 py-3 text-sm text-white">
            Thanks — I’ll review this in the next round.
          </div>
        </div>
      </Card>
    </div>
  );
}
