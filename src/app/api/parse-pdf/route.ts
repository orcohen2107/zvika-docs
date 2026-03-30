import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse';
import { parsePdfText } from '@/lib/pdf-parser';
import { createClient } from '@/lib/supabase/server';

const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'לא מחובר' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'לא נבחר קובץ' },
        { status: 400 }
      );
    }

    // File size check (before reading into memory)
    if (file.size > MAX_PDF_SIZE) {
      return NextResponse.json(
        { error: 'הקובץ גדול מדי (מקסימום 10MB)' },
        { status: 413 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'הקובץ חייב להיות PDF' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Magic bytes check: PDF starts with %PDF (0x25 0x50 0x44 0x46)
    if (buffer[0] !== 0x25 || buffer[1] !== 0x50 || buffer[2] !== 0x44 || buffer[3] !== 0x46) {
      return NextResponse.json(
        { error: 'הקובץ אינו PDF תקין' },
        { status: 400 }
      );
    }

    const pdfData = await pdf(buffer);
    const entries = parsePdfText(pdfData.text);

    return NextResponse.json({
      entries,
      totalPages: pdfData.numpages,
      filename: file.name,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('PDF parsing error:', error);
    }
    return NextResponse.json(
      { error: 'שגיאה בקריאת הקובץ' },
      { status: 500 }
    );
  }
}
