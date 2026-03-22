import VerseLink from "@/components/VerseLink";

// Matches references like "John 3:16", "1 Corinthians 13:4-7", "Psalm 23", "Matthew 6:9-13" etc.
export const VERSE_REGEX = /\b((?:\d\s)?[A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s(\d+)(?::(\d+)(?:[-–](\d+))?)?\b/g;

export function renderWithVerseLinks(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  VERSE_REGEX.lastIndex = 0;
  while ((match = VERSE_REGEX.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const ref = match[0];
    parts.push(<VerseLink key={`${ref}-${match.index}`} reference={ref} />);
    last = match.index + ref.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
