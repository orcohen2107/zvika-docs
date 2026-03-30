'use client';

import { memo, useMemo } from 'react';
import { Download } from 'lucide-react';
import { ComparisonItem } from '@/types';
import { cn, exportComparisonToCsv } from '@/lib/utils';

interface ResultsTableProps {
  items: ComparisonItem[];
  exportFilename?: string;
}

function ResultsTableComponent({ items, exportFilename }: ResultsTableProps) {
  const statusConfig = useMemo<Record<string, { label: string; rowBg: string; badgeBg: string; badgeText: string }>>(
    () => ({
      matched: { label: 'נמצא', rowBg: 'bg-green-50', badgeBg: 'bg-green-100', badgeText: 'text-green-700' },
      missing_from_pdf: { label: 'חסר ב-PDF', rowBg: 'bg-red-50', badgeBg: 'bg-red-100', badgeText: 'text-red-700' },
      extra_in_pdf: { label: 'לא הוזן', rowBg: 'bg-amber-50', badgeBg: 'bg-amber-100', badgeText: 'text-amber-700' },
    }),
    []
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      {exportFilename && (
        <div className="px-6 py-3 border-b border-gray-100 flex justify-end">
          <button
            onClick={() => exportComparisonToCsv(items, exportFilename)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            ייצוא CSV
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">סטטוס</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">מספר תעודה</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">4 אחרונות</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">שם לקוח</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">מקור</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">סכום</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">תאריך</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item: ComparisonItem) => {
              const config = statusConfig[item.status];
              return (
                <tr key={`${item.document_number}-${item.status}`} className={config.rowBg}>
                  <td className="px-6 py-3">
                    <span className={cn(
                      'inline-block px-2.5 py-0.5 rounded-full text-xs font-medium',
                      config.badgeBg, config.badgeText
                    )}>
                      {config.label}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm font-mono" dir="ltr">{item.document_number}</td>
                  <td className="px-6 py-3 text-sm font-mono font-bold" dir="ltr">{item.document_number_short}</td>
                  <td className="px-6 py-3 text-sm">{item.client_name}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">
                    {item.source === 'user' ? 'הוזן ידנית' : 'מה-PDF'}
                  </td>
                  <td className="px-6 py-3 text-sm" dir="ltr">
                    {item.amount != null ? `₪${item.amount.toLocaleString('he-IL')}` : '—'}
                  </td>
                  <td className="px-6 py-3 text-sm" dir="ltr">
                    {item.date ?? '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

ResultsTableComponent.displayName = 'ResultsTable';

export const ResultsTable = memo(ResultsTableComponent);
