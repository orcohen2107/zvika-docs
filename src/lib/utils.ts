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
