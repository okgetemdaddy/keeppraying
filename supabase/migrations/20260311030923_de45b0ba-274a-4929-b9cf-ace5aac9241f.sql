
-- site_logs table for tracking errors and events
CREATE TABLE public.site_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('error', 'event', 'warning', 'info')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_site_logs_type ON public.site_logs(type);
CREATE INDEX idx_site_logs_created_at ON public.site_logs(created_at DESC);
CREATE INDEX idx_site_logs_user_id ON public.site_logs(user_id);

ALTER TABLE public.site_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage site logs"
  ON public.site_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'::text));

CREATE POLICY "System can insert logs"
  ON public.site_logs FOR INSERT
  WITH CHECK (true);

-- ai_monitor_reports table for storing AI-generated analysis reports
CREATE TABLE public.ai_monitor_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  report_type TEXT NOT NULL DEFAULT 'weekly',
  report_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary TEXT,
  suggestions TEXT[] DEFAULT '{}'::TEXT[],
  anomalies TEXT[] DEFAULT '{}'::TEXT[],
  key_metrics JSONB DEFAULT '{}'::jsonb,
  triggered_by TEXT DEFAULT 'manual'
);

CREATE INDEX idx_ai_monitor_reports_generated_at ON public.ai_monitor_reports(generated_at DESC);
CREATE INDEX idx_ai_monitor_reports_report_type ON public.ai_monitor_reports(report_type);

ALTER TABLE public.ai_monitor_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage AI monitor reports"
  ON public.ai_monitor_reports FOR ALL
  USING (has_role(auth.uid(), 'admin'::text));
