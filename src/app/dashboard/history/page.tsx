'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { ComparisonResult, ComparisonItem } from '@/types';
import { formatDate } from '@/lib/utils';
import { ResultsTable } from '@/components/results-table';
import { HistoryCardSkeleton } from '@/components/skeleton';
import { ChevronRight } from 'lucide-react';

interface StoredComparison extends ComparisonResult {
  id: string;
  created_at: string;
}

export default function HistoryPage() {
  const supabase = useMemo(() => createClient(), []);
  const [comparisons, setComparisons] = useState<StoredComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StoredComparison | null>(null);

  useEffect(() => {
    const fetchComparisons = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('comparisons')
          .select('*')
          .order('created_at', { ascending: false });
        if (data) setComparisons(data as StoredComparison[]);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching comparisons:', error);
        }
        toast.error('שגיאה בטעינת ההשוואות');
      } finally {
        setLoading(false);
      }
    };
    fetchComparisons();
  }, [supabase]);

  if (selected) {
    return (
      <div>
        <button
          onClick={() => setSelected(null)}
          className="text-blue-600 hover:underline mb-4 text-sm flex items-center gap-1 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
        >
          <ChevronRight className="w-4 h-4" /> חזרה לרשימה
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

        <ResultsTable items={selected.results as ComparisonItem[]} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">היסטוריית השוואות</h1>

      {loading ? (
        <div className="space-y-4" aria-busy="true" aria-label="טוען היסטוריה...">
          {[1, 2, 3].map((i) => (
            <HistoryCardSkeleton key={i} />
          ))}
        </div>
      ) : comparisons.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-400">
          <p className="text-lg">אין השוואות קודמות</p>
          <p className="text-sm mt-1">בצע השוואה ושמור את התוצאות</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comparisons.map((comp) => (
            <button
              key={comp.id}
              onClick={() => setSelected(comp)}
              className="w-full bg-white rounded-xl shadow-sm border p-6 cursor-pointer hover:border-blue-300 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-right"
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
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
