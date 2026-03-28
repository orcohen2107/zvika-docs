'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';
import { formatDate } from '@/lib/utils';
import { Navbar } from '@/components/navbar';

export default function AdminPage() {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (allProfiles) setProfiles(allProfiles);
      setLoading(false);
    };
    fetchProfiles();
  }, [supabase]);

  const handleApprove = async (userId: string) => {
    const { error: updateError } = await supabase.from('profiles').update({ is_approved: true }).eq('id', userId);
    if (updateError) {
      setError('שגיאה בעדכון המשתמש');
      return;
    }
    setProfiles(prev => prev.map(p => p.id === userId ? { ...p, is_approved: true } : p));
  };

  const handleRevoke = async (userId: string) => {
    const { error: updateError } = await supabase.from('profiles').update({ is_approved: false }).eq('id', userId);
    if (updateError) {
      setError('שגיאה בעדכון המשתמש');
      return;
    }
    setProfiles(prev => prev.map(p => p.id === userId ? { ...p, is_approved: false } : p));
  };

  const handleMakeAdmin = async (userId: string) => {
    const { error: updateError } = await supabase.from('profiles').update({ role: 'admin', is_approved: true }).eq('id', userId);
    if (updateError) {
      setError('שגיאה בעדכון המשתמש');
      return;
    }
    setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: 'admin' as const, is_approved: true } : p));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">טוען...</div>
      </div>
    );
  }

  const pending = profiles.filter(p => !p.is_approved);
  const approved = profiles.filter(p => p.is_approved);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">ניהול משתמשים</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700 text-sm">
            {error}
          </div>
        )}

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
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(profile.id)}
                      className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-700 transition-colors"
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMakeAdmin(profile.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm border border-blue-200 px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        הפוך למנהל
                      </button>
                      <button
                        onClick={() => handleRevoke(profile.id)}
                        className="text-red-500 hover:text-red-700 text-sm border border-red-200 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
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
      </main>
    </div>
  );
}
