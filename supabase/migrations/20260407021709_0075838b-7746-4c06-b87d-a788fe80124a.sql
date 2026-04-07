
-- Storage bucket for encrypted files (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('secure_ingress', 'secure_ingress', false);

-- Allow anon uploads to secure_ingress (edge function provides signed URL, but direct upload also supported)
CREATE POLICY "Anon upload to secure_ingress" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'secure_ingress');
CREATE POLICY "Admin read secure_ingress" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'secure_ingress' AND public.has_role(auth.uid(), 'admin'));

-- Upload access tokens (burn-after-open single-use links)
CREATE TABLE public.upload_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  label text,
  used boolean DEFAULT false,
  used_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '48 hours'),
  created_at timestamptz DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.upload_access_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon validate token" ON public.upload_access_tokens
  FOR SELECT TO anon USING (used = false AND expires_at > now());

CREATE POLICY "Admin manage tokens" ON public.upload_access_tokens
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin submissions metadata
CREATE TABLE public.admin_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id uuid REFERENCES public.upload_access_tokens(id),
  original_filename text NOT NULL,
  stored_path text NOT NULL,
  file_size_bytes bigint,
  encrypted boolean DEFAULT true,
  encryption_iv text,
  encryption_salt text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.admin_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read submissions" ON public.admin_submissions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anon insert submissions" ON public.admin_submissions
  FOR INSERT TO anon WITH CHECK (true);
