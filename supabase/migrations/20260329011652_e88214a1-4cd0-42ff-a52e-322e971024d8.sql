
-- Add new columns to testimonies table
ALTER TABLE public.testimonies
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS verses jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS praise_count integer NOT NULL DEFAULT 0;

-- Create testimony_praises table
CREATE TABLE public.testimony_praises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  testimony_id uuid NOT NULL REFERENCES public.testimonies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(testimony_id, user_id)
);
ALTER TABLE public.testimony_praises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view praises" ON public.testimony_praises FOR SELECT USING (true);
CREATE POLICY "Auth users insert own praises" ON public.testimony_praises FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth users delete own praises" ON public.testimony_praises FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create user_saved_testimonies table
CREATE TABLE public.user_saved_testimonies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  testimony_id uuid NOT NULL REFERENCES public.testimonies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, testimony_id)
);
ALTER TABLE public.user_saved_testimonies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved testimonies" ON public.user_saved_testimonies
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger to auto-increment/decrement praise_count
CREATE OR REPLACE FUNCTION public.update_testimony_praise_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE testimonies SET praise_count = praise_count + 1 WHERE id = NEW.testimony_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE testimonies SET praise_count = GREATEST(0, praise_count - 1) WHERE id = OLD.testimony_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER trg_testimony_praise_count
AFTER INSERT OR DELETE ON public.testimony_praises
FOR EACH ROW EXECUTE FUNCTION public.update_testimony_praise_count();
