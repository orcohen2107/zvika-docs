import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/navbar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      user = null;
    } else {
      user = data.user;
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Dashboard layout auth error:', error);
    }
    user = null;
  }

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_approved')
    .eq('id', user.id)
    .single();

  if (!profile?.is_approved) {
    redirect('/pending-approval');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {children}
      </main>
    </div>
  );
}
