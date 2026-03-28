export const extractShortNumber = (docNumber: string): string => {
  const digitsOnly = docNumber.replace(/\D/g, '');
  return digitsOnly.slice(-4);
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const cn = (...classes: (string | undefined | false)[]) =>
  classes.filter(Boolean).join(' ');

export const exportComparisonToCsv = (
  items: Array<{
    status: string;
    document_number: string;
    document_number_short: string;
    client_name: string;
    source: string;
    amount?: number;
    date?: string;
  }>,
  filename: string
): void => {
  const statusLabels: Record<string, string> = {
    matched: 'נמצא',
    missing_from_pdf: 'חסר ב-PDF',
    extra_in_pdf: 'לא הוזן',
  };

  const headers = ['סטטוס', 'מספר תעודה', '4 ספרות', 'שם לקוח', 'מקור', 'סכום', 'תאריך'];
  const rows = items.map(item => [
    statusLabels[item.status] ?? item.status,
    item.document_number,
    item.document_number_short,
    item.client_name,
    item.source === 'user' ? 'הוזן ידנית' : 'מה-PDF',
    item.amount != null ? item.amount.toString() : '',
    item.date ?? '',
  ]);

  // BOM prefix for Excel to correctly detect UTF-8 Hebrew
  const bom = '\uFEFF';
  const csvContent = bom + [headers, ...rows]
    .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename.replace('.pdf', '')}_comparison.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
