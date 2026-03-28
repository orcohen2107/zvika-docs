'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Document, PdfEntry, ComparisonResult, ComparisonItem } from '@/types';
import { compareDocuments } from '@/lib/comparison';
import { cn } from '@/lib/utils';

export default function ComparePage() {
  const supabase = createClient();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
      setSaved(false);
      setError('');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === 'application/pdf') {
      setFile(dropped);
      setResult(null);
      setSaved(false);
      setError('');
    }
  }, []);

  const handleCompare = async () => {
    if (!file) return;
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'שגיאה בקריאת ה-PDF');
      }

      const { entries: pdfEntries }: { entries: PdfEntry[] } = await response.json();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('אינך מחובר');
        setLoading(false);
        return;
      }

      const { data: userDocs } = await supabase.from('documents').select('*').eq('user_id', user.id);

      if (!userDocs || userDocs.length === 0) {
        setError('אין תעודות שהוזנו במערכת. הוסף תעודות בדשבורד קודם.');
        setLoading(false);
        return;
      }

      const comparison = compareDocuments(
        userDocs as Document[],
        pdfEntries,
        file.name
      );

      setResult(comparison);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהשוואה');
    }

    setLoading(false);
  };

  const handleSave = async () => {
    if (!result) return;
    setIsSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('אינך מחובר');
      setIsSaving(false);
      return;
    }

    const { error: saveError } = await supabase.from('comparisons').insert({
      user_id: user.id,
      pdf_filename: result.pdf_filename,
      total_user_entries: result.total_user_entries,
      total_pdf_entries: result.total_pdf_entries,
      matched_count: result.matched_count,
      missing_from_pdf_count: result.missing_from_pdf_count,
      extra_in_pdf_count: result.extra_in_pdf_count,
      results: result.results,
    });

    if (saveError) {
      setError('שגיאה בשמירת התוצאות');
    } else {
      setSaved(true);
    }
    setIsSaving(false);
  };

  const statusConfig: Record<string, { label: string; rowBg: string; badgeBg: string; badgeText: string }> = {
    matched: { label: 'נמצא', rowBg: 'bg-green-50', badgeBg: 'bg-green-100', badgeText: 'text-green-700' },
    missing_from_pdf: { label: 'חסר ב-PDF', rowBg: 'bg-red-50', badgeBg: 'bg-red-100', badgeText: 'text-red-700' },
    extra_in_pdf: { label: 'לא הוזן', rowBg: 'bg-amber-50', badgeBg: 'bg-amber-100', badgeText: 'text-amber-700' },
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">השוואה עם PDF</h1>

      {/* Upload area */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
        >
          <div className="text-4xl mb-3">📄</div>
          <p className="text-gray-600 mb-2">
            {file ? file.name : 'גרור קובץ PDF לכאן או לחץ לבחירה'}
          </p>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
            id="pdf-upload"
          />
          <label
            htmlFor="pdf-upload"
            className="inline-block bg-gray-100 text-gray-700 px-4 py-2 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors text-sm"
          >
            בחר קובץ
          </label>
        </div>

        {file && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleCompare}
              disabled={loading}
              className="bg-blue-600 text-white px-8 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'מעבד...' : 'בצע השוואה'}
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mt-4">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{result.total_user_entries}</div>
              <div className="text-sm text-gray-500 mt-1">תעודות שהוזנו</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{result.matched_count}</div>
              <div className="text-sm text-gray-500 mt-1">נמצאו</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
              <div className="text-3xl font-bold text-red-600">{result.missing_from_pdf_count}</div>
              <div className="text-sm text-gray-500 mt-1">חסרים ב-PDF</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
              <div className="text-3xl font-bold text-amber-600">{result.extra_in_pdf_count}</div>
              <div className="text-sm text-gray-500 mt-1">לא הוזנו</div>
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={handleSave}
              disabled={saved || isSaving}
              className={cn(
                'px-6 py-2 rounded-lg font-medium transition-colors',
                saved
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {saved ? '✓ נשמר בהצלחה' : isSaving ? 'שומר...' : 'שמור תוצאות'}
            </button>
          </div>

          {/* Results table */}
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
                  {result.results.map((item: ComparisonItem, idx: number) => {
                    const config = statusConfig[item.status];
                    return (
                      <tr key={idx} className={config.rowBg}>
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
