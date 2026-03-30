import { PdfEntry } from '@/types';

const DOC_NUMBER_REGEX = /SH\d{8}/g;

export const parsePdfText = (text: string): PdfEntry[] => {
  const entries: PdfEntry[] = [];
  const lines = text.split('\n');
  const seen = new Set<string>();

  for (const line of lines) {
    const matches = line.match(DOC_NUMBER_REGEX);
    if (!matches) continue;

    for (const docNumber of matches) {
      if (seen.has(docNumber)) continue;
      seen.add(docNumber);

      const lineWithoutDocNumber = line.replace(docNumber, '');
      const amountMatch = lineWithoutDocNumber.match(/\b[\d,]+\.\d{2}\b/);
      const amount = amountMatch ? parseFloat(amountMatch[0].replace(/,/g, '')) : 0;

      const dateMatch = line.match(/\d{2}\/\d{2}\/\d{4}/);
      const date = dateMatch ? dateMatch[0] : '';

      // Extract Hebrew text: match continuous sequences of Hebrew letters, spaces, and common punctuation
      // Use word boundary approach to avoid fragmentation
      const hebrewMatch = line.match(/[\u0590-\u05FF][\u0590-\u05FF\s"().,-]*/g);
      const clientName = hebrewMatch
        ? hebrewMatch
            .map(match => match.trim()) // Trim each match
            .filter(match => /[\u0590-\u05FF]{2,}/.test(match)) // Keep only matches with 2+ Hebrew letters
            .join(' ') // Join with space
            .replace(/\s+/g, ' ') // Normalize spaces
        : '';

      entries.push({
        document_number: docNumber,
        document_number_short: docNumber.slice(-4),
        client_name: clientName,
        amount,
        date,
      });
    }
  }

  return entries;
};
