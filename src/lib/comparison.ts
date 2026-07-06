import { ComparisonItem, ComparisonResult, Document, PdfEntry } from '@/types';
import { extractShortNumber, formatDate } from './utils';

export const compareDocuments = (
  userDocuments: Document[],
  pdfEntries: PdfEntry[],
  pdfFilename: string,
  filterMonth?: { year: number; month: number }
): ComparisonResult => {
  const results: ComparisonItem[] = [];

  // Filter documents by month if specified
  let filteredUserDocs = userDocuments;
  if (filterMonth) {
    filteredUserDocs = userDocuments.filter(doc => {
      const docDate = new Date(doc.created_at);
      return docDate.getFullYear() === filterMonth.year &&
             docDate.getMonth() + 1 === filterMonth.month;
    });
  }

  const userByShort = new Map<string, Document>();
  for (const doc of filteredUserDocs) {
    if (userByShort.has(doc.document_number_short) && process.env.NODE_ENV === 'development') {
      console.warn(`Short number collision in user documents: ${doc.document_number_short}`);
    }
    userByShort.set(doc.document_number_short, doc);
  }

  const pdfByShort = new Map<string, PdfEntry>();
  for (const entry of pdfEntries) {
    const short = extractShortNumber(entry.document_number);
    if (pdfByShort.has(short) && process.env.NODE_ENV === 'development') {
      console.warn(`Short number collision in PDF entries: ${short}`);
    }
    pdfByShort.set(short, entry);
  }

  let matchedCount = 0;
  let missingFromPdfCount = 0;
  let extraInPdfCount = 0;

  userByShort.forEach((doc, short) => {
    if (pdfByShort.has(short)) {
      const pdfEntry = pdfByShort.get(short)!;
      results.push({
        document_number: doc.document_number,
        document_number_short: short,
        client_name: doc.client_name,
        status: 'matched',
        source: 'user',
        amount: pdfEntry.amount || undefined,
        date: pdfEntry.date || undefined,
      });
      matchedCount++;
    } else {
      results.push({
        document_number: doc.document_number,
        document_number_short: short,
        client_name: doc.client_name,
        status: 'missing_from_pdf',
        source: 'user',
        date: formatDate(doc.created_at),
      });
      missingFromPdfCount++;
    }
  });

  pdfByShort.forEach((entry, short) => {
    if (!userByShort.has(short)) {
      results.push({
        document_number: entry.document_number,
        document_number_short: short,
        client_name: entry.client_name,
        status: 'extra_in_pdf',
        source: 'pdf',
        amount: entry.amount || undefined,
        date: entry.date || undefined,
      });
      extraInPdfCount++;
    }
  });

  const statusOrder: Record<string, number> = {
    missing_from_pdf: 0,
    extra_in_pdf: 1,
    matched: 2,
  };
  results.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  return {
    pdf_filename: pdfFilename,
    total_user_entries: filteredUserDocs.length,
    total_pdf_entries: pdfEntries.length,
    matched_count: matchedCount,
    missing_from_pdf_count: missingFromPdfCount,
    extra_in_pdf_count: extraInPdfCount,
    results,
  };
};
