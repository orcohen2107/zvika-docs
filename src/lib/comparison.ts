import { ComparisonItem, ComparisonResult, Document, PdfEntry } from '@/types';
import { extractShortNumber, formatDate } from './utils';

const digitsOf = (value: string): string => value.replace(/\D/g, '');

const groupBy = <T>(items: T[], keyOf: (item: T) => string): Map<string, T[]> => {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return groups;
};

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

  // Group by last-4-digits. A group can hold several docs (collision or double entry),
  // so every entered document gets its own result row and the totals always add up.
  const userGroups = groupBy(
    [...filteredUserDocs].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    doc => doc.document_number_short
  );
  const pdfGroups = groupBy(pdfEntries, entry => extractShortNumber(entry.document_number));

  let matchedCount = 0;
  let missingFromPdfCount = 0;
  let extraInPdfCount = 0;
  let duplicateCount = 0;

  userGroups.forEach((docs, short) => {
    const unusedPdf = [...(pdfGroups.get(short) ?? [])];
    const seenNumbers = new Set<string>();

    // First entry of each distinct number is compared to the PDF; repeats are duplicates.
    const candidates: Document[] = [];
    for (const doc of docs) {
      const userDigits = digitsOf(doc.document_number);
      if (seenNumbers.has(userDigits)) {
        results.push({
          document_number: doc.document_number,
          document_number_short: short,
          client_name: doc.client_name,
          source: 'user',
          status: 'duplicate_entry',
          date: formatDate(doc.created_at),
        });
        duplicateCount++;
      } else {
        seenNumbers.add(userDigits);
        candidates.push(doc);
      }
    }

    const pushMatched = (doc: Document, pdfEntry: PdfEntry) => {
      results.push({
        document_number: doc.document_number,
        document_number_short: short,
        client_name: doc.client_name,
        source: 'user',
        status: 'matched',
        amount: pdfEntry.amount || undefined,
        date: pdfEntry.date || undefined,
      });
      matchedCount++;
    };

    // Pass 1: PDF entry whose full number ends with the entered number (exact match wins).
    const unmatched: Document[] = [];
    for (const doc of candidates) {
      const userDigits = digitsOf(doc.document_number);
      const index = unusedPdf.findIndex(entry => digitsOf(entry.document_number).endsWith(userDigits));
      if (index === -1) {
        unmatched.push(doc);
      } else {
        pushMatched(doc, unusedPdf.splice(index, 1)[0]);
      }
    }

    // Pass 2: leftover docs fall back to any remaining PDF entry with the same last 4 digits.
    for (const doc of unmatched) {
      if (unusedPdf.length > 0) {
        pushMatched(doc, unusedPdf.shift()!);
      } else {
        results.push({
          document_number: doc.document_number,
          document_number_short: short,
          client_name: doc.client_name,
          source: 'user',
          status: 'missing_from_pdf',
          date: formatDate(doc.created_at),
        });
        missingFromPdfCount++;
      }
    }

    // PDF entries in this group nobody claimed
    for (const entry of unusedPdf) {
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

  // PDF groups with no user documents at all
  pdfGroups.forEach((entries, short) => {
    if (userGroups.has(short)) return;
    for (const entry of entries) {
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
    duplicate_entry: 1,
    extra_in_pdf: 2,
    matched: 3,
  };
  results.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  return {
    pdf_filename: pdfFilename,
    total_user_entries: filteredUserDocs.length,
    total_pdf_entries: pdfEntries.length,
    matched_count: matchedCount,
    missing_from_pdf_count: missingFromPdfCount,
    extra_in_pdf_count: extraInPdfCount,
    duplicate_count: duplicateCount,
    results,
  };
};
