
CREATE OR REPLACE FUNCTION public.check_prayer_similarity(input_text text)
RETURNS TABLE(match_score real, match_id uuid, match_status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT similarity(prayer_text, input_text) AS match_score, 
         id AS match_id,
         status AS match_status
  FROM prayer_cards
  WHERE status = 'approved'
    AND similarity(prayer_text, input_text) > 0.55
  ORDER BY match_score DESC
  LIMIT 1;
$$;
