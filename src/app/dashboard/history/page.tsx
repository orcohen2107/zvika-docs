'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ComparisonResult, ComparisonItem } from '@/types';
import { formatDate, cn } from '@/lib/utils';

interface StoredComparison extends ComparisonResult {
  id: string;
  created_at: string;
}

export default function HistoryPage() {
  const supabase = createClient();
  const [comparisons, setComparisons] = useState<StoredComparison[]>([]);
  const [selected, setSelected] = useState<StoredComparison | null>(null);

  useEffect(() => {
    const fetchComparisons = async () => {
      const { data } = await supabase
        .from('comparisons')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setComparisons(data as StoredComparison[]);
    };
    fetchComparisons();
  }, [supabase]);

  const statusConfig: Record<string, { label: string; rowBg: string; badgeBg: string; badgeText: string }> = {
    matched: { label: 'נמצא', rowBg: 'bg-green-50', badgeBg: 'bg-green-100', badgeText: 'text-green-700' },
    missing_from_pdf: { label: 'חסר ב-PDF', rowBg: 'bg-red-50', badgeBg: 'bg-red-100', badgeText: 'text-red-700' },
    extra_in_pdf: { label: 'לא הוזן', rowBg: 'bg-amber-50', badgeBg: 'bg-amber-100', badgeText: 'text-amber-700' },
  };

  if (selected) {
    return (
      <div>
        <button
          onClick={() => setSelected(null)}
          className="text-blue-600 hover:underline mb-4 text-sm flex items-center gap-1"
        >
          ← חזרה לרשימה
        </button>

        <h1 className="text-2xl font-bold mb-2">תוצאות השוואה</h1>
        <p className="text-gray-500 mb-6">
          קובץ: {selected.pdf_filename} | תאריך: {formatDate(selected.created_at)}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{selected.total_user_entries}</div>
            <div className="text-sm text-gray-500 mt-1">תעודות שהוזנו</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{selected.matched_count}</div>
            <div className="text-sm text-gray-500 mt-1">נמצאו</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
            <div className="text-3xl font-bold text-red-600">{selected.missing_from_pdf_count}</div>
            <div className="text-sm text-gray-500 mt-1">חסרים ב-PDF</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
            <div className="text-3xl font-bold text-amber-600">{selected.extra_in_pdf_count}</div>
            <div className="text-sm text-gray-500 mt-1">לא הוזנו</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">סטטוס</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">מספר תעודה</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">4 אחרונות</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">שם לקוח</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">מקור</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(selected.results as ComparisonItem[]).map((item, idx) => {
                  const config = statusConfig[item.status];
                  return (
                    <tr key={idx} className={config.rowBg}>
                      <td className="px-6 py-3">
                        <span className={cn('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium', config.badgeBg, config.badgeText)}>
                          {config.label}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm font-mono" dir="ltr">{item.document_number}</td>
                      <td className="px-6 py-3 text-sm font-mono font-bold" dir="ltr">{item.document_number_short}</td>
                      <td className="px-6 py-3 text-sm">{item.client_name}</td>
                      <td className="px-6 py-3 text-sm text-gray-500">
                        {item.source === 'user' ? 'הוזן ידנית' : 'מה-PDF'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">היסטוריית השוואות</h1>

      {comparisons.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-400">
          <p className="text-lg">אין השוואות קודמות</p>
          <p className="text-sm mt-1">בצע השוואה ושמור את התוצאות</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comparisons.map((comp) => (
            <div
              key={comp.id}
              onClick={() => setSelected(comp)}
              className="bg-white rounded-xl shadow-sm border p-6 cursor-pointer hover:border-blue-300 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{comp.pdf_filename}</h3>
                  <p className="text-sm text-gray-500 mt-1">{formatDate(comp.created_at)}</p>
                </div>
                <div className="flex gap-6 text-center">
                  <div>
                    <div className="text-xl font-bold text-green-600">{comp.matched_count}</div>
                    <div className="text-xs text-gray-500">נמצאו</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-red-600">{comp.missing_from_pdf_count}</div>
                    <div className="text-xs text-gray-500">חסרים</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-amber-600">{comp.extra_in_pdf_count}</div>
                    <div className="text-xs text-gray-500">לא הוזנו</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
