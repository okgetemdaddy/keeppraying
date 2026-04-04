
CREATE TYPE session_event_type AS ENUM (
  'verse_view','highlight_added','highlight_removed','note_written','note_edited',
  'ink_stroke','ink_erased','circle_select','cross_ref_nav','chapter_nav',
  'bookmark_added','bookmark_removed','session_start','session_end'
);

CREATE TABLE session_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type session_event_type NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_session_events_session ON session_events(session_id, created_at);
CREATE INDEX idx_session_events_user ON session_events(user_id);

ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their events" ON session_events
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE study_sessions ADD COLUMN session_summary JSONB DEFAULT NULL;
ALTER TABLE study_sessions ADD COLUMN session_type TEXT DEFAULT 'canvas';
