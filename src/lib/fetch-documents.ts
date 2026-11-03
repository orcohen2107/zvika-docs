import type { SupabaseClient } from '@supabase/supabase-js';
import { Document } from '@/types';

// Supabase caps every select at 1000 rows by default — page through to get everything.
const PAGE_SIZE = 1000;

interface FetchDocumentsOptions {
  userId?: string;
  month?: { year: number; month: number };
}

export const fetchAllDocuments = async (
  supabase: SupabaseClient,
  { userId, month }: FetchDocumentsOptions = {}
): Promise<Document[]> => {
  const all: Document[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (userId) query = query.eq('user_id', userId);
    if (month) {
      // Local-time month boundaries, matching how the month is shown to the user
      const start = new Date(month.year, month.month - 1, 1);
      const end = new Date(month.year, month.month, 1);
      query = query.gte('created_at', start.toISOString()).lt('created_at', end.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    all.push(...((data ?? []) as Document[]));
    if (!data || data.length < PAGE_SIZE) break;
  }

  return all;
};

export const DOCUMENTS_PAGE_SIZE = 50;

interface FetchPageOptions {
  offset: number;
  search?: string;
  limit?: number;
}

export interface DocumentsPage {
  documents: Document[];
  total: number;
}

// Strip characters that have meaning inside a PostgREST .or() filter or an ilike pattern.
const sanitizeSearch = (value: string): string => value.replace(/[,()%*\\_]/g, ' ').trim();

export const fetchDocumentsPage = async (
  supabase: SupabaseClient,
  { offset, search = '', limit = DOCUMENTS_PAGE_SIZE }: FetchPageOptions
): Promise<DocumentsPage> => {
  let query = supabase
    .from('documents')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1);

  const term = sanitizeSearch(search);
  if (term) {
    const pattern = `%${term}%`;
    query = query.or(
      `document_number.ilike.${pattern},document_number_short.ilike.${pattern},client_name.ilike.${pattern}`
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return { documents: (data ?? []) as Document[], total: count ?? 0 };
};
