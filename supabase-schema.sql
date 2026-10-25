-- CareLens AI - Supabase Database Schema
-- Run this whole file once in the Supabase SQL Editor of a new project.
-- It is safe to re-run: tables are only created if missing, and policies,
-- triggers and functions are replaced rather than duplicated.
--
-- Security model:
--   * Every table has Row Level Security (RLS) enabled.
--   * Only signed-in users (the `authenticated` role) get table privileges,
--     and policies limit each user to rows where user_id = their own id.
--   * Anonymous visitors (`anon`) get no access to any table.
--   * Explicit GRANTs are required: Supabase projects created after
--     30 May 2026 no longer expose new public tables to the Data API by default.

-- =====================================================================
-- Tables
-- =====================================================================

-- Profiles (one row per auth user, created by the trigger at the bottom)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  emergency_contacts JSONB DEFAULT '[]'::jsonb,
  accessibility_preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saved skin, voice, medication and video analyses
CREATE TABLE IF NOT EXISTS public.health_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('skin_analysis', 'voice_log', 'medication_scan', 'chat_session')),
  title TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  analysis_result JSONB,
  confidence_level TEXT CHECK (confidence_level IN ('Low', 'Medium', 'High')),
  urgency_level TEXT CHECK (urgency_level IN ('Routine', 'Monitor', 'Seek Care')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat history
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Medication tracking (reserved for planned reminder features; not yet used by the app)
CREATE TABLE IF NOT EXISTS public.medications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  instructions TEXT,
  side_effects TEXT[],
  interactions JSONB DEFAULT '[]'::jsonb,
  image_url TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Medication intake log (reserved for planned reminder features; not yet used by the app)
CREATE TABLE IF NOT EXISTS public.medication_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  taken_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- Indexes (RLS filters on user_id; the app sorts by date)
-- =====================================================================

CREATE INDEX IF NOT EXISTS health_records_user_id_created_at_idx
  ON public.health_records (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS conversations_user_id_updated_at_idx
  ON public.conversations (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS medications_user_id_idx
  ON public.medications (user_id);
CREATE INDEX IF NOT EXISTS medication_logs_user_id_idx
  ON public.medication_logs (user_id);
CREATE INDEX IF NOT EXISTS medication_logs_medication_id_idx
  ON public.medication_logs (medication_id);

-- =====================================================================
-- Privileges: signed-in users only, never anonymous visitors
-- =====================================================================

REVOKE ALL ON public.profiles, public.health_records, public.conversations,
  public.medications, public.medication_logs FROM anon;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medication_logs TO authenticated;

-- =====================================================================
-- Row Level Security
-- =====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only see and edit their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = id);

-- Health records: users can only see and edit their own records
DROP POLICY IF EXISTS "Users can view own health records" ON public.health_records;
CREATE POLICY "Users can view own health records" ON public.health_records
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own health records" ON public.health_records;
CREATE POLICY "Users can insert own health records" ON public.health_records
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own health records" ON public.health_records;
CREATE POLICY "Users can update own health records" ON public.health_records
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own health records" ON public.health_records;
CREATE POLICY "Users can delete own health records" ON public.health_records
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Conversations: users can only see and edit their own conversations
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
CREATE POLICY "Users can view own conversations" ON public.conversations
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own conversations" ON public.conversations;
CREATE POLICY "Users can insert own conversations" ON public.conversations
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
CREATE POLICY "Users can update own conversations" ON public.conversations
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own conversations" ON public.conversations;
CREATE POLICY "Users can delete own conversations" ON public.conversations
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Medications: users can only see and edit their own medications
DROP POLICY IF EXISTS "Users can view own medications" ON public.medications;
CREATE POLICY "Users can view own medications" ON public.medications
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own medications" ON public.medications;
CREATE POLICY "Users can insert own medications" ON public.medications
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own medications" ON public.medications;
CREATE POLICY "Users can update own medications" ON public.medications
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own medications" ON public.medications;
CREATE POLICY "Users can delete own medications" ON public.medications
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Medication logs: users can only use their own logs, and only for their own medications
DROP POLICY IF EXISTS "Users can view own medication logs" ON public.medication_logs;
CREATE POLICY "Users can view own medication logs" ON public.medication_logs
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own medication logs" ON public.medication_logs;
CREATE POLICY "Users can insert own medication logs" ON public.medication_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.medications m
      WHERE m.id = medication_id AND m.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own medication logs" ON public.medication_logs;
CREATE POLICY "Users can update own medication logs" ON public.medication_logs
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.medications m
      WHERE m.id = medication_id AND m.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own medication logs" ON public.medication_logs;
CREATE POLICY "Users can delete own medication logs" ON public.medication_logs
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- =====================================================================
-- Triggers
-- =====================================================================

-- Keep updated_at current
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_health_records_updated_at ON public.health_records;
CREATE TRIGGER update_health_records_updated_at BEFORE UPDATE ON public.health_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_medications_updated_at ON public.medications;
CREATE TRIGGER update_medications_updated_at BEFORE UPDATE ON public.medications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create a profile for every new auth user. SECURITY DEFINER lets it write to
-- public.profiles from the auth schema; the empty search_path prevents
-- search-path hijacking, so every object is schema-qualified.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Only the auth trigger should run this function
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
