// supabase/functions/machus-agent/types.ts
// Shared type definitions for machus-agent modules

export type AddLog = (msg: string) => void;

// deno-lint-ignore no-explicit-any
export type SupabaseClient = any;

export interface MoltbookPost {
  id: string;
  title?: string;
  content?: string;
  created_at?: string;
  author?: { name?: string };
  submolt?: { name?: string };
}

export interface StoredPost {
  id: string;
  moltbook_post_id: string;
  author_name: string;
  submolt: string;
  title: string;
  content: string;
  analysed: boolean;
  created_at: string;
  moltbook_created_at: string;
}

export interface ResonanceMatch {
  post_a_id: string;
  post_b_id: string;
  shared_question: string;
  confidence: number;
}

export interface AuthorPost {
  author: string;
  postId: string;
  title: string;
  content: string;
}

export interface CommentQuestion {
  postId: string;
  commentId: string;
  author: string;
  content: string;
  postTitle: string;
  postAuthor: string;
  sharedQuestion: string;
}
