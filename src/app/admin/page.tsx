'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';
import { formatDate } from '@/lib/utils';

export default function AdminPage() {
  const supabase = useMemo(() => createClient(), []);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        if (data) setProfiles(data as Profile[]);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching profiles:', error);
        }
        toast.error('שגיאה בטעינת הפרופילים');
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, [supabase]);

  const handleApprove = async (userId: string) => {
    try {
      const { error: updateError } = await supabase.from('profiles').update({ is_approved: true }).eq('id', userId);
      if (updateError) {
        toast.error('שגיאה בהאשרה');
        return;
      }
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, is_approved: true } : p));
      toast.success('המשתמש אושר בהצלחה');
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error approving user:', error);
      }
      toast.error('שגיאה בהאשרה');
    }
  };

  const handleRevoke = async (userId: string) => {
    try {
      const { error: updateError } = await supabase.from('profiles').update({ is_approved: false }).eq('id', userId);
      if (updateError) {
        toast.error('שגיאה בביטול ההרשאה');
        return;
      }
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, is_approved: false } : p));
      toast.success('ההרשאה בוטלה');
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error revoking approval:', error);
      }
      toast.error('שגיאה בביטול ההרשאה');
    }
  };

  const handleMakeAdmin = async (userId: string) => {
    try {
      const { error: updateError } = await supabase.from('profiles').update({ role: 'admin', is_approved: true }).eq('id', userId);
      if (updateError) {
        toast.error('שגיאה בהעלאת הרשאה');
        return;
      }
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: 'admin' as const, is_approved: true } : p));
      toast.success('המשתמש הוא עכשיו מנהל');
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error making admin:', error);
      }
      toast.error('שגיאה בהעלאת הרשאה');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">טוען...</div>
      </div>
    );
  }

  const pending = profiles.filter(p => !p.is_approved);
  const approved = profiles.filter(p => p.is_approved);

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">ניהול משתמשים</h1>

      {/* Pending users */}
      {pending.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-8">
          <div className="px-6 py-4 border-b bg-amber-50">
            <h2 className="font-semibold text-amber-800">
              ממתינים לאישור ({pending.length})
            </h2>
          </div>
          <div className="divide-y">
            {pending.map((profile) => (
              <div key={profile.id} className="px-6 py-4 flex justify-between items-center">
                <div>
                  <div className="font-medium">{profile.full_name}</div>
                  <div className="text-sm text-gray-500">נרשם: {formatDate(profile.created_at)}</div>
                </div>
                <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                  <button
                    onClick={() => handleApprove(profile.id)}
                    className="w-full sm:w-auto bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    אשר
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-8 text-green-700 text-sm">
          אין משתמשים ממתינים לאישור
        </div>
      )}

      {/* Approved users */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold">משתמשים מאושרים ({approved.length})</h2>
        </div>
        {approved.length === 0 ? (
          <div className="p-8 text-center text-gray-400">אין משתמשים מאושרים</div>
        ) : (
          <div className="divide-y">
            {approved.map((profile) => (
              <div key={profile.id} className="px-6 py-4 flex justify-between items-center">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {profile.full_name}
                    {profile.role === 'admin' && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        מנהל
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">נרשם: {formatDate(profile.created_at)}</div>
                </div>
                {profile.role !== 'admin' && (
                  <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                    <button
                      onClick={() => handleMakeAdmin(profile.id)}
                      className="w-full sm:w-auto text-blue-600 hover:text-blue-800 text-sm border border-blue-200 px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      הפוך למנהל
                    </button>
                    <button
                      onClick={() => handleRevoke(profile.id)}
                      className="w-full sm:w-auto text-red-500 hover:text-red-700 text-sm border border-red-200 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      בטל גישה
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
