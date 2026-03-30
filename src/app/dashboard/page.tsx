'use client';

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { toast } from 'sonner';
import { BookOpen, Plus, Trash2, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Document } from '@/types';
import { extractShortNumber, formatDate, DEBOUNCE_DELAY_MS } from '@/lib/utils';
import { DocumentCardSkeleton } from '@/components/skeleton';

const LazyLineChart = lazy(() =>
  import('recharts').then((mod) => ({
    default: function MatchRateChart({ data }: { data: { date: string; rate: number }[] }) {
      return (
        <mod.ResponsiveContainer width="100%" height={300}>
          <mod.LineChart data={data}>
            <mod.XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <mod.YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
            <mod.Tooltip formatter={(v) => [`${v}%`, 'התאמה']} />
            <mod.Line
              type="monotone"
              dataKey="rate"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 4, fill: '#2563eb' }}
              activeDot={{ r: 6 }}
            />
          </mod.LineChart>
        </mod.ResponsiveContainer>
      );
    },
  }))
);

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docNumber, setDocNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [comparisons, setComparisons] = useState<Array<{
    matched_count: number;
    total_user_entries: number;
    created_at: string;
  }>>([]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);

    try {
      const { data: docs } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });
      if (docs) setDocuments(docs);

      // Fetch comparisons for analytics
      const { data: comps } = await supabase
        .from('comparisons')
        .select('matched_count, total_user_entries, created_at')
        .order('created_at', { ascending: true })
        .limit(10);
      if (comps) setComparisons(comps as Array<{ matched_count: number; total_user_entries: number; created_at: string }>);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching documents:', error);
      }
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, DEBOUNCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredDocuments = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return documents;
    const q = debouncedSearchQuery.trim().toLowerCase();
    return documents.filter(doc =>
      doc.document_number.toLowerCase().includes(q) ||
      doc.document_number_short.includes(q) ||
      doc.client_name.toLowerCase().includes(q)
    );
  }, [documents, debouncedSearchQuery]);

  const chartData = useMemo(() => {
    return comparisons.map(c => ({
      date: formatDate(c.created_at),
      rate: c.total_user_entries > 0
        ? Math.round((c.matched_count / c.total_user_entries) * 100)
        : 0,
    }));
  }, [comparisons]);

  const stats = useMemo(() => {
    if (comparisons.length === 0) {
      return { totalComps: 0, latestRate: 0, avgRate: 0 };
    }
    const lastComp = comparisons[comparisons.length - 1];
    const latestRate = lastComp.total_user_entries > 0
      ? Math.round((lastComp.matched_count / lastComp.total_user_entries) * 100)
      : 0;
    const avgRate = Math.round(
      comparisons.reduce((sum, c) => sum + (c.total_user_entries > 0 ? (c.matched_count / c.total_user_entries) * 100 : 0), 0) / comparisons.length
    );
    return { totalComps: comparisons.length, latestRate, avgRate };
  }, [comparisons]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedDoc = docNumber.trim();
    const trimmedName = clientName.trim();

    if (!trimmedDoc || !trimmedName) {
      toast.error('יש למלא את כל השדות');
      return;
    }

    if (trimmedDoc.replace(/\D/g, '').length < 4) {
      toast.error('מספר תעודה חייב להכיל לפחות 4 ספרות');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('אינך מחובר. אנא התחבר שוב');
        return;
      }

      const shortNumber = extractShortNumber(trimmedDoc);

      const { error: insertError } = await supabase.from('documents').insert({
        user_id: user.id,
        document_number: trimmedDoc,
        document_number_short: shortNumber,
        client_name: trimmedName,
      });

      if (insertError) {
        toast.error('שגיאה בשמירת הנתונים');
        return;
      }

      setDocNumber('');
      setClientName('');
      toast.success('תעודה נוספה בהצלחה');
      await fetchDocuments();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error adding document:', error);
      }
      toast.error('שגיאה בהוספת תעודה');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      toast('וודא מחיקה - לחץ שוב כדי למחוק', { description: 'הפעולה אינה ניתנת לשחזור' });
      return;
    }

    try {
      const { error: deleteError } = await supabase.from('documents').delete().eq('id', id);
      if (deleteError) {
        toast.error('שגיאה במחיקה');
        return;
      }
      toast.success('הרשומה נמחקה בהצלחה');
      setDeleteConfirm(null);
      await fetchDocuments();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error deleting document:', error);
      }
      toast.error('שגיאה במחיקה');
    }
  };

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-4 pt-8">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight">
          הזנת תעודות
        </h1>
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto opacity-90">
          ניהול ועדכון תעודות משלוח בקלות וביעילות
        </p>
      </section>

      {/* Input Form Card */}
      <section className="max-w-4xl mx-auto w-full">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label htmlFor="document-number" className="block text-sm font-bold text-gray-900">
                  מספר תעודה
                </label>
                <input
                  id="document-number"
                  type="text"
                  dir="ltr"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  className="w-full px-5 py-3 md:py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:bg-white outline-none text-left text-base hover:border-gray-300 transition-all placeholder:text-gray-400 text-right"
                  placeholder="SH26001292 או 1292"
                />
              </div>
              <div className="space-y-3">
                <label htmlFor="client-name" className="block text-sm font-bold text-gray-900">
                  שם לקוח
                </label>
                <input
                  id="client-name"
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-5 py-3 md:py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:bg-white outline-none text-base hover:border-gray-300 transition-all placeholder:text-gray-400"
                  placeholder="שם הלקוח"
                />
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                aria-disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-10 py-5 rounded-2xl font-bold text-lg flex items-center gap-3 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 group"
              >
                <Plus className="w-5 h-5" />
                <span>{loading ? 'שומר...' : 'הוסף תעודה חדשה'}</span>
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Documents Section */}
      <section className="space-y-8">
        <div className="flex items-center justify-between border-b-2 border-gray-200 pb-4 mb-6">
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-gray-700" />
            תעודות שהוזנו
            <span className="text-blue-600 ml-2">({debouncedSearchQuery ? `${filteredDocuments.length} / ${documents.length}` : documents.length})</span>
          </h2>
        </div>

        {/* Search Input */}
        <div className="mb-6">
          <label htmlFor="search-query" className="sr-only">חיפוש תעודות</label>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="search-query"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש לפי מספר תעודה, לקוח..."
              className="w-full pr-10 pl-4 py-3 md:py-2.5 bg-white border border-gray-200 rounded-lg text-base md:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 outline-none transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4" aria-busy="true" aria-label="טוען תעודות...">
            {[1, 2, 3].map((i) => (
              <DocumentCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredDocuments.length === 0 && documents.length === 0 ? (
          <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl py-20 px-8 border-2 border-dashed border-gray-300 flex flex-col items-center text-center">
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-100 rounded-full blur-3xl opacity-30"></div>
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-gray-200 rounded-full blur-3xl opacity-20"></div>

            <h3 className="text-2xl font-bold text-gray-900 mb-3 relative z-10">
              אין תעודות עדיין
            </h3>
            <p className="text-gray-600 max-w-sm leading-relaxed text-base relative z-10">
              הוסף תעודות חדשות באמצעות הטופס למעלה כדי להתחיל לנהל את המערכת שלך בצורה חכמה
            </p>
          </div>
        ) : filteredDocuments.length === 0 && debouncedSearchQuery ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
            <p className="text-lg">לא נמצאו תעודות תואמות</p>
            <p className="text-sm mt-1">נסה חיפוש אחר</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-blue-200 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex-1">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                          מספר תעודה
                        </p>
                        <p className="text-lg font-mono font-bold text-gray-900" dir="ltr">
                          {doc.document_number}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                          4 ספרות
                        </p>
                        <p className="text-lg font-mono font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg" dir="ltr">
                          {doc.document_number_short}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 md:text-right">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                      שם לקוח
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {doc.client_name}
                    </p>
                  </div>
                  <div className="flex items-end gap-3">
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                        תאריך
                      </p>
                      <p className="text-gray-700 font-medium">
                        {formatDate(doc.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      aria-label={`מחק תעודה ${doc.document_number}`}
                      className={`px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        deleteConfirm === doc.id
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-800'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                      {deleteConfirm === doc.id ? 'אשר מחיקה' : 'מחוק'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Stats Section */}
      <section className="space-y-6 pt-8 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="text-3xl font-bold text-blue-600 mb-1">{documents.length}</div>
            <div className="text-xs text-gray-600 font-medium uppercase">תעודות</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="text-3xl font-bold text-green-600 mb-1">{stats.totalComps}</div>
            <div className="text-xs text-gray-600 font-medium uppercase">השוואות</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="text-3xl font-bold text-purple-600 mb-1">{stats.latestRate}%</div>
            <div className="text-xs text-gray-600 font-medium uppercase">התאמה אחרונה</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="text-3xl font-bold text-orange-600 mb-1">{stats.avgRate}%</div>
            <div className="text-xs text-gray-600 font-medium uppercase">ממוצע התאמה</div>
          </div>
        </div>

        {comparisons.length >= 2 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">אחוז התאמה לאורך זמן</h3>
            <Suspense fallback={<div className="h-[300px] bg-gray-50 animate-pulse rounded-lg" aria-busy="true" aria-label="טוען גרף..." />}>
              <LazyLineChart data={chartData} />
            </Suspense>
          </div>
        )}
      </section>
    </div>
  );
}
