
-- This file contains the SQL needed to set up the database schema
-- Run this in Supabase SQL editor if tables do not exist

-- Call Transcripts table
CREATE TABLE IF NOT EXISTS public.call_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  filename TEXT,
  text TEXT NOT NULL,
  duration INTEGER DEFAULT 0,
  call_score INTEGER DEFAULT 50,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  keywords TEXT[] DEFAULT '{}',
  transcript_segments JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Calls table for metrics storage
CREATE TABLE IF NOT EXISTS public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT, -- Changed from UUID to TEXT to allow 'anonymous' and other string values
  duration INTEGER DEFAULT 0,
  sentiment_agent NUMERIC DEFAULT 0.5,
  sentiment_customer NUMERIC DEFAULT 0.5,
  talk_ratio_agent NUMERIC DEFAULT 50,
  talk_ratio_customer NUMERIC DEFAULT 50,
  key_phrases TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Keyword trends table
CREATE TABLE IF NOT EXISTS public.keyword_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  category TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  last_used TIMESTAMPTZ DEFAULT now()
);

-- Sentiment trends table
CREATE TABLE IF NOT EXISTS public.sentiment_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT, -- Changed from UUID to TEXT
  sentiment_label TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.call_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentiment_trends ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access (for development)
CREATE POLICY IF NOT EXISTS "Allow public access to call_transcripts" 
  ON public.call_transcripts 
  FOR ALL 
  TO anon
  USING (true);

CREATE POLICY IF NOT EXISTS "Allow public access to calls" 
  ON public.calls 
  FOR ALL 
  TO anon
  USING (true);

CREATE POLICY IF NOT EXISTS "Allow public access to keyword_trends" 
  ON public.keyword_trends 
  FOR ALL 
  TO anon
  USING (true);

CREATE POLICY IF NOT EXISTS "Allow public access to sentiment_trends" 
  ON public.sentiment_trends 
  FOR ALL 
  TO anon
  USING (true);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS call_transcripts_user_id_idx ON public.call_transcripts (user_id);
CREATE INDEX IF NOT EXISTS call_transcripts_created_at_idx ON public.call_transcripts (created_at);
CREATE INDEX IF NOT EXISTS calls_user_id_idx ON public.calls (user_id);
CREATE INDEX IF NOT EXISTS calls_created_at_idx ON public.calls (created_at);
CREATE INDEX IF NOT EXISTS keyword_trends_keyword_idx ON public.keyword_trends (keyword);
CREATE INDEX IF NOT EXISTS sentiment_trends_user_id_idx ON public.sentiment_trends (user_id);
