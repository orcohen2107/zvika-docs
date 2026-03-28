'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Document } from '@/types';
import { extractShortNumber, formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const supabase = createClient();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docNumber, setDocNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDocuments = useCallback(async () => {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setDocuments(data);
  }, [supabase]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedDoc = docNumber.trim();
    const trimmedName = clientName.trim();

    if (!trimmedDoc || !trimmedName) {
      setError('יש למלא את כל השדות');
      return;
    }

    if (trimmedDoc.replace(/\D/g, '').length < 4) {
      setError('מספר תעודה חייב להכיל לפחות 4 ספרות');
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
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
      setError('שגיאה בשמירת הנתונים');
      setLoading(false);
      return;
    }

    setDocNumber('');
    setClientName('');
    setLoading(false);
    fetchDocuments();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('למחוק רשומה זו?')) return;
    const { error: deleteError } = await supabase.from('documents').delete().eq('id', id);
    if (deleteError) {
      setError('שגיאה במחיקה');
      return;
    }
    fetchDocuments();
  };

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-4 pt-8">
        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight">
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
                <label className="block text-sm font-bold text-gray-900">
                  מספר תעודה
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-0 focus:bg-white outline-none text-left text-base hover:border-gray-300 transition-all placeholder:text-gray-400"
                  placeholder="SH26001292 או 1292"
                />
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-bold text-gray-900">
                  שם לקוח
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-0 focus:bg-white outline-none text-base hover:border-gray-300 transition-all placeholder:text-gray-400"
                  placeholder="שם הלקוח"
                />
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-10 py-5 rounded-2xl font-bold text-lg flex items-center gap-3 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 group"
              >
                <span>{loading ? '⏳ שומר...' : '✨ הוסף תעודה חדשה'}</span>
              </button>
            </div>
          </form>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 text-sm p-4 rounded-2xl mt-8 flex items-center gap-3">
              <span className="text-lg">⚠️</span>
              {error}
            </div>
          )}
        </div>
      </section>

      {/* Documents Section */}
      <section className="space-y-8">
        <div className="flex items-center justify-between border-b-2 border-gray-200 pb-4">
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-4xl">📚</span>
            תעודות שהוזנו
            <span className="text-blue-600 ml-2">({documents.length})</span>
          </h2>
        </div>

        {documents.length === 0 ? (
          <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl py-20 px-8 border-2 border-dashed border-gray-300 flex flex-col items-center text-center">
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-100 rounded-full blur-3xl opacity-30"></div>
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-gray-200 rounded-full blur-3xl opacity-20"></div>

            <div className="relative z-10 mb-8">
              <div className="text-6xl">📭</div>
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-3 relative z-10">
              אין תעודות עדיין
            </h3>
            <p className="text-gray-600 max-w-sm leading-relaxed text-base relative z-10">
              הוסף תעודות חדשות באמצעות הטופס למעלה כדי להתחיל לנהל את המערכת שלך בצורה חכמה
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 hover:shadow-lg hover:border-blue-200 transition-all hover:-translate-y-1"
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
                      className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-800 px-4 py-2 rounded-xl font-bold transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Stats Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 pb-8">
        <div className="bg-white p-8 rounded-2xl shadow-md border border-gray-100 flex flex-col justify-between">
          <span className="text-4xl mb-4">📊</span>
          <div>
            <div className="text-4xl font-bold text-blue-600 mb-2">{documents.length}</div>
            <div className="text-sm text-gray-600 font-medium">תעודות מנוהלות</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-8 rounded-2xl shadow-lg md:col-span-2 relative overflow-hidden">
          <div className="absolute -left-20 -bottom-20 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10 space-y-3">
            <h3 className="text-xl font-bold">מערכת חכמה לניהול תעודות</h3>
            <p className="text-white/80 text-sm max-w-md">
              המערכת מאפשרת ניהול יעיל של תעודות משלוח עם אישור וניטור בזמן אמת
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
