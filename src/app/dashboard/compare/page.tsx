'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { FileText, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Document, PdfEntry, ComparisonResult } from '@/types';
import { compareDocuments } from '@/lib/comparison';
import { cn } from '@/lib/utils';
import { ResultsTable } from '@/components/results-table';
import { usePersistedState } from '@/lib/use-persisted-state';

export default function ComparePage() {
  const supabase = useMemo(() => createClient(), []);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = usePersistedState<ComparisonResult | null>('compare:result', null);
  const [saved, setSaved] = usePersistedState('compare:saved', false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const timeoutId = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(timeoutId);
  }, [saved, setSaved]);

  // Month selector state
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = usePersistedState('compare:selectedMonth', now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = usePersistedState('compare:selectedYear', now.getFullYear());

  // Generate year options (2 years back to 1 year forward)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 4 }, (_, i) => currentYear - 2 + i);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
      setSaved(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === 'application/pdf') {
      setFile(dropped);
      setResult(null);
      setSaved(false);
    }
  }, [setResult, setSaved]);

  const handleCompare = async () => {
    if (!file) return;
    setLoading(true);

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

      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data?.user) {
        toast.error('אינך מחובר');
        return;
      }
      const user = data.user;

      const { data: userDocs } = await supabase.from('documents').select('*').eq('user_id', user.id);

      if (!userDocs || userDocs.length === 0) {
        toast.error('אין תעודות שהוזנו במערכת. הוסף תעודות בדשבורד קודם.');
        return;
      }

      const comparison = compareDocuments(
        userDocs as Document[],
        pdfEntries,
        file.name,
        { year: selectedYear, month: selectedMonth }
      );

      setResult(comparison);
      toast.success('השוואה בוצעה בהצלחה');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאה בהשוואה');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setIsSaving(true);

    try {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data?.user) {
        toast.error('אינך מחובר. אנא התחבר שוב');
        return;
      }
      const user = data.user;

      const { error } = await supabase.from('comparisons').insert({
        user_id: user.id,
        pdf_filename: result.pdf_filename,
        total_user_entries: result.total_user_entries,
        total_pdf_entries: result.total_pdf_entries,
        matched_count: result.matched_count,
        missing_from_pdf_count: result.missing_from_pdf_count,
        extra_in_pdf_count: result.extra_in_pdf_count,
        results: result.results,
      });

      if (error) {
        toast.error('שגיאה בשמירת התוצאות');
        return;
      }

      setSaved(true);
      toast.success('התוצאות נשמרו בהצלחה');
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error saving comparison:', error);
      }
      toast.error('שגיאה בשמירת התוצאות');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">השוואה עם PDF</h1>

      {/* Month selector */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <label htmlFor="month-select" className="block text-sm font-medium mb-3">בחר חודש להשוואה</label>
        <div className="flex gap-4 flex-col sm:flex-row">
          <select
            id="month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="w-full sm:w-auto px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 outline-none"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
              <option key={month} value={month}>
                {new Date(2024, month - 1).toLocaleString('he-IL', { month: 'long' })} ({month})
              </option>
            ))}
          </select>
          <label htmlFor="year-select" className="sr-only">שנה</label>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full sm:w-auto px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 outline-none"
          >
            {yearOptions.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <span className="text-sm text-gray-600 self-center">
            {new Date(selectedYear, selectedMonth - 1).toLocaleString('he-IL', { month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Upload area */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
        >
          <div className="mb-3 flex justify-center">
            <FileText className="w-10 h-10 text-gray-400" />
          </div>
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
              aria-busy={loading}
              aria-disabled={loading}
              className="bg-blue-600 text-white px-8 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {loading ? 'מעבד...' : 'בצע השוואה'}
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{result.total_user_entries}</div>
              <div className="text-sm text-gray-500 mt-1">תעודות שהוזנו</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{result.matched_count}</div>
              <div className="text-sm text-gray-500 mt-1">נמצאו</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4 text-center">
              <div className="text-3xl font-bold text-red-600">{result.missing_from_pdf_count}</div>
              <div className="text-sm text-gray-500 mt-1">חסרים ב-PDF</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4 text-center">
              <div className="text-3xl font-bold text-amber-600">{result.extra_in_pdf_count}</div>
              <div className="text-sm text-gray-500 mt-1">לא הוזנו</div>
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={handleSave}
              disabled={saved || isSaving}
              aria-busy={isSaving}
              aria-disabled={saved || isSaving}
              className={cn(
                'px-6 py-2 rounded-lg font-medium transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                saved
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {saved ? (
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>נשמר בהצלחה</span>
                </span>
              ) : (
                <span>{isSaving ? 'שומר...' : 'שמור תוצאות'}</span>
              )}
            </button>
          </div>

          {/* Results table */}
          <ResultsTable items={result.results} exportFilename={result.pdf_filename} />
        </div>
      )}
    </div>
  );
}
