export interface Profile {
  id: string;
  full_name: string;
  is_approved: boolean;
  role: 'user' | 'admin';
  created_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  document_number: string;
  document_number_short: string;
  client_name: string;
  created_at: string;
}

export interface PdfEntry {
  document_number: string;
  document_number_short: string;
  client_name: string;
  amount: number;
  date: string;
}

export type ComparisonStatus = 'matched' | 'missing_from_pdf' | 'extra_in_pdf';

export interface ComparisonItem {
  document_number: string;
  document_number_short: string;
  client_name: string;
  status: ComparisonStatus;
  source: 'user' | 'pdf';
  amount?: number;
  date?: string;
}

export interface ComparisonResult {
  id?: string;
  user_id?: string;
  pdf_filename: string;
  total_user_entries: number;
  total_pdf_entries: number;
  matched_count: number;
  missing_from_pdf_count: number;
  extra_in_pdf_count: number;
  results: ComparisonItem[];
  created_at?: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at'>;
        Update: Partial<Profile>;
      };
      documents: {
        Row: Document;
        Insert: Omit<Document, 'id' | 'created_at'>;
        Update: Partial<Document>;
      };
      comparisons: {
        Row: ComparisonResult & { id: string; user_id: string; created_at: string };
        Insert: Omit<ComparisonResult, 'id' | 'created_at'> & { user_id: string };
        Update: Partial<ComparisonResult>;
      };
    };
  };
}
