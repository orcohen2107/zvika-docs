import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'מערכת אימות תעודות',
  description: 'מערכת לניהול ואימות תעודות משלוח',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-slate-50 antialiased">
        <Toaster position="top-center" richColors dir="rtl" />
        {children}
      </body>
    </html>
  );
}
