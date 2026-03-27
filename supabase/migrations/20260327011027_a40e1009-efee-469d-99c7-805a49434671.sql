-- 1. Rename tags column to labels
ALTER TABLE public.prayer_cards RENAME COLUMN tags TO labels;

-- 2. Clean labels: remove any label that contains a hyphen, keep only clean ones
UPDATE public.prayer_cards
SET labels = (
  SELECT array_agg(elem)
  FROM unnest(labels) AS elem
  WHERE elem NOT LIKE '%-%'
)
WHERE labels IS NOT NULL AND array_length(labels, 1) > 0;

-- 3. Enable realtime for comments table
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;