'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Profile } from '@/types';

export const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(() => {
    if (typeof window === 'undefined') return null;
    const cached = localStorage.getItem('user_profile');
    return cached ? JSON.parse(cached) : null;
  });

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (data) {
          setProfile(data);
          localStorage.setItem('user_profile', JSON.stringify(data));
        }
      } else {
        localStorage.removeItem('user_profile');
      }
    };
    getProfile();
  }, [supabase]);

  const handleLogout = async () => {
    localStorage.removeItem('user_profile');
    await supabase.auth.signOut();
    router.push('/login');
  };

  const links = [
    { href: '/dashboard', label: 'דשבורד', icon: '📊' },
    { href: '/dashboard/compare', label: 'השוואה', icon: '⚖️' },
    { href: '/dashboard/history', label: 'היסטוריה', icon: '📜' },
  ];

  if (profile?.role === 'admin') {
    links.push({ href: '/admin', label: 'ניהול משתמשים', icon: '👥' });
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-xl font-bold text-blue-600">
              מערכת אימות תעודות
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    pathname === link.href
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <span>{link.icon}</span>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {profile && (
              <span className="text-sm text-gray-600 font-medium">
                {profile.full_name}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <span>🚪</span>
              התנתק
            </button>
          </div>
        </div>
      </div>
      <div className="md:hidden border-t border-gray-200 px-4 py-2 flex gap-2 overflow-x-auto bg-gray-50">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap font-medium transition-colors',
              pathname === link.href
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-200'
            )}
          >
            <span>{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
};
