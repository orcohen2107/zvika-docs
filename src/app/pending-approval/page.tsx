'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export default function PendingApprovalPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('אינך מחובר');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_approved')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.is_approved) {
        toast.success('הגישה אושרה! מוביל אותך...');
        router.push('/dashboard');
      } else {
        toast.info('הבקשה שלך עדיין בהמתנה');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error checking status:', error);
      }
      toast.error('שגיאה בבדיקת הסטטוס');
    } finally {
      setIsChecking(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h1 className="text-2xl font-bold mb-2">ממתין לאישור</h1>
          <p className="text-gray-500 mb-8">
            החשבון שלך נוצר בהצלחה ומחכה לאישור מנהל.
            <br />
            תקבל גישה ברגע שהמנהל יאשר את החשבון.
          </p>
          <div className="space-y-3">
            <button
              onClick={handleCheckStatus}
              disabled={isChecking}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isChecking ? 'בודק...' : 'בדוק סטטוס'}
            </button>
            <button
              onClick={handleLogout}
              className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              התנתק
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
