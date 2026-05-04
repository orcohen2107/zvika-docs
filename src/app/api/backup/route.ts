import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import nodemailer from 'nodemailer';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const authParam = url.searchParams.get('authorization');
  if (authParam !== `Bearer ${process.env.BACKUP_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: pdfEntries } = await supabase
    .from('pdf_entries')
    .select('*');

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*');

  const { data: comparisons } = await supabase
    .from('comparisons')
    .select('*');

  const { data: documents } = await supabase
    .from('documents')
    .select('*');

  const timestamp = new Date().toISOString().split('T')[0];

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT!),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const attachments = [
      {
        filename: `documents-${timestamp}.csv`,
        content: toCsv(documents || []),
      },
      {
        filename: `profiles-${timestamp}.csv`,
        content: toCsv(profiles || []),
      },
    ];

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.BACKUP_EMAIL,
      subject: `Backup - ${timestamp}`,
      text: `Daily backup attached.\ndocuments: ${documents?.length}\nprofiles: ${profiles?.length}`,
      attachments,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        documents: documents?.length,
        profiles: profiles?.length,
        timestamp,
      })
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
    });
  }
}

function toCsv(data: any[]): string {
  if (!data.length) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(obj =>
    headers.map(h => JSON.stringify(obj[h] ?? '')).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}
