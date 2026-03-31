/**
 * Client-side Bible reference parser.
 * Zero-latency parsing of references like "John 3:16", "Gen 1", "1 Cor 13:4-7", "Ps 23"
 */

export interface ParsedReference {
  bookName: string;       // Display name, e.g. "Genesis"
  bookUsfm: string;       // USFM code, e.g. "GEN"
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
  raw: string;            // Original matched text
}

/* ── Book abbreviation → USFM map ── */
const BOOK_ALIASES: Record<string, string> = {
  // Old Testament
  genesis: "GEN", gen: "GEN", ge: "GEN",
  exodus: "EXO", exod: "EXO", exo: "EXO", ex: "EXO",
  leviticus: "LEV", lev: "LEV", le: "LEV",
  numbers: "NUM", num: "NUM", nu: "NUM", nm: "NUM",
  deuteronomy: "DEU", deut: "DEU", deu: "DEU", dt: "DEU",
  joshua: "JOS", josh: "JOS", jos: "JOS",
  judges: "JDG", judg: "JDG", jdg: "JDG", jg: "JDG",
  ruth: "RUT", rut: "RUT", ru: "RUT",
  "1 samuel": "1SA", "1 sam": "1SA", "1sam": "1SA", "1sa": "1SA",
  "2 samuel": "2SA", "2 sam": "2SA", "2sam": "2SA", "2sa": "2SA",
  "1 kings": "1KI", "1 ki": "1KI", "1ki": "1KI", "1kgs": "1KI",
  "2 kings": "2KI", "2 ki": "2KI", "2ki": "2KI", "2kgs": "2KI",
  "1 chronicles": "1CH", "1 chr": "1CH", "1chr": "1CH", "1ch": "1CH",
  "2 chronicles": "2CH", "2 chr": "2CH", "2chr": "2CH", "2ch": "2CH",
  ezra: "EZR", ezr: "EZR",
  nehemiah: "NEH", neh: "NEH", ne: "NEH",
  esther: "EST", esth: "EST", est: "EST",
  job: "JOB",
  psalms: "PSA", psalm: "PSA", psa: "PSA", ps: "PSA", pss: "PSA",
  proverbs: "PRO", prov: "PRO", pro: "PRO", pr: "PRO",
  ecclesiastes: "ECC", eccl: "ECC", ecc: "ECC", ec: "ECC",
  "song of solomon": "SNG", "song of songs": "SNG", song: "SNG", sos: "SNG", sng: "SNG", "ss": "SNG",
  isaiah: "ISA", isa: "ISA", is: "ISA",
  jeremiah: "JER", jer: "JER", je: "JER",
  lamentations: "LAM", lam: "LAM", la: "LAM",
  ezekiel: "EZK", ezek: "EZK", ezk: "EZK", eze: "EZK",
  daniel: "DAN", dan: "DAN", da: "DAN",
  hosea: "HOS", hos: "HOS", ho: "HOS",
  joel: "JOL", jol: "JOL", joe: "JOL",
  amos: "AMO", amo: "AMO", am: "AMO",
  obadiah: "OBA", obad: "OBA", oba: "OBA", ob: "OBA",
  jonah: "JON", jon: "JON", jnh: "JON",
  micah: "MIC", mic: "MIC", mi: "MIC",
  nahum: "NAM", nah: "NAM", nam: "NAM", na: "NAM",
  habakkuk: "HAB", hab: "HAB",
  zephaniah: "ZEP", zeph: "ZEP", zep: "ZEP",
  haggai: "HAG", hag: "HAG", hg: "HAG",
  zechariah: "ZEC", zech: "ZEC", zec: "ZEC",
  malachi: "MAL", mal: "MAL",
  // New Testament
  matthew: "MAT", matt: "MAT", mat: "MAT", mt: "MAT",
  mark: "MRK", mrk: "MRK", mk: "MRK", mr: "MRK",
  luke: "LUK", luk: "LUK", lk: "LUK", lu: "LUK",
  john: "JHN", jhn: "JHN", jn: "JHN", joh: "JHN",
  acts: "ACT", act: "ACT", ac: "ACT",
  romans: "ROM", rom: "ROM", ro: "ROM", rm: "ROM",
  "1 corinthians": "1CO", "1 cor": "1CO", "1cor": "1CO", "1co": "1CO",
  "2 corinthians": "2CO", "2 cor": "2CO", "2cor": "2CO", "2co": "2CO",
  galatians: "GAL", gal: "GAL", ga: "GAL",
  ephesians: "EPH", eph: "EPH", ep: "EPH",
  philippians: "PHP", phil: "PHP", php: "PHP", pp: "PHP",
  colossians: "COL", col: "COL",
  "1 thessalonians": "1TH", "1 thess": "1TH", "1thess": "1TH", "1th": "1TH",
  "2 thessalonians": "2TH", "2 thess": "2TH", "2thess": "2TH", "2th": "2TH",
  "1 timothy": "1TI", "1 tim": "1TI", "1tim": "1TI", "1ti": "1TI",
  "2 timothy": "2TI", "2 tim": "2TI", "2tim": "2TI", "2ti": "2TI",
  titus: "TIT", tit: "TIT", ti: "TIT",
  philemon: "PHM", phlm: "PHM", phm: "PHM",
  hebrews: "HEB", heb: "HEB",
  james: "JAS", jas: "JAS", jm: "JAS",
  "1 peter": "1PE", "1 pet": "1PE", "1pet": "1PE", "1pe": "1PE", "1pt": "1PE",
  "2 peter": "2PE", "2 pet": "2PE", "2pet": "2PE", "2pe": "2PE", "2pt": "2PE",
  "1 john": "1JN", "1 jn": "1JN", "1jn": "1JN", "1jo": "1JN",
  "2 john": "2JN", "2 jn": "2JN", "2jn": "2JN", "2jo": "2JN",
  "3 john": "3JN", "3 jn": "3JN", "3jn": "3JN", "3jo": "3JN",
  jude: "JUD", jud: "JUD", jde: "JUD",
  revelation: "REV", rev: "REV", re: "REV", "the revelation": "REV",
  revelations: "REV",
};

/* USFM → display name */
const USFM_NAMES: Record<string, string> = {
  GEN: "Genesis", EXO: "Exodus", LEV: "Leviticus", NUM: "Numbers", DEU: "Deuteronomy",
  JOS: "Joshua", JDG: "Judges", RUT: "Ruth", "1SA": "1 Samuel", "2SA": "2 Samuel",
  "1KI": "1 Kings", "2KI": "2 Kings", "1CH": "1 Chronicles", "2CH": "2 Chronicles",
  EZR: "Ezra", NEH: "Nehemiah", EST: "Esther", JOB: "Job", PSA: "Psalms",
  PRO: "Proverbs", ECC: "Ecclesiastes", SNG: "Song of Solomon", ISA: "Isaiah",
  JER: "Jeremiah", LAM: "Lamentations", EZK: "Ezekiel", DAN: "Daniel",
  HOS: "Hosea", JOL: "Joel", AMO: "Amos", OBA: "Obadiah", JON: "Jonah",
  MIC: "Micah", NAM: "Nahum", HAB: "Habakkuk", ZEP: "Zephaniah", HAG: "Haggai",
  ZEC: "Zechariah", MAL: "Malachi",
  MAT: "Matthew", MRK: "Mark", LUK: "Luke", JHN: "John", ACT: "Acts",
  ROM: "Romans", "1CO": "1 Corinthians", "2CO": "2 Corinthians", GAL: "Galatians",
  EPH: "Ephesians", PHP: "Philippians", COL: "Colossians",
  "1TH": "1 Thessalonians", "2TH": "2 Thessalonians",
  "1TI": "1 Timothy", "2TI": "2 Timothy", TIT: "Titus", PHM: "Philemon",
  HEB: "Hebrews", JAS: "James", "1PE": "1 Peter", "2PE": "2 Peter",
  "1JN": "1 John", "2JN": "2 John", "3JN": "3 John", JUD: "Jude", REV: "Revelation",
};

/**
 * Try to resolve a book name/abbreviation to a USFM code.
 * Optionally cross-check against the loaded book list.
 */
function resolveBook(
  raw: string,
  availableBooks?: string[],
): { usfm: string; name: string } | null {
  const normalized = raw.trim().toLowerCase().replace(/\./g, "");
  const usfm = BOOK_ALIASES[normalized];
  if (!usfm) return null;
  if (availableBooks && !availableBooks.includes(usfm)) return null;
  return { usfm, name: USFM_NAMES[usfm] ?? raw };
}

/**
 * Parse a user query string for Bible references.
 * Returns all matches found.
 *
 * Patterns matched:
 *  - "John 3:16"
 *  - "1 Cor 13:4-7"
 *  - "Genesis 1"
 *  - "Ps 23:1"
 *  - "Rev 21:1-4"
 */
export function parseBibleReferences(
  query: string,
  availableBooks?: string[],
): ParsedReference[] {
  if (!query || query.length < 2) return [];

  const results: ParsedReference[] = [];

  // Pattern: optional number prefix + book name + chapter + optional verse or verse range
  // e.g. "1 Cor 13:4-7", "John 3:16", "Genesis 1", "Ps 23"
  const pattern =
    /(?:^|\s)((?:[123]\s*)?[a-z][a-z\s]*?)\.?\s+(\d{1,3})(?:\s*[:.]\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?)?/gi;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(query)) !== null) {
    const bookRaw = match[1].trim();
    const chapter = parseInt(match[2], 10);
    const verseStart = match[3] ? parseInt(match[3], 10) : undefined;
    const verseEnd = match[4] ? parseInt(match[4], 10) : undefined;

    const resolved = resolveBook(bookRaw, availableBooks);
    if (!resolved) continue;

    results.push({
      bookName: resolved.name,
      bookUsfm: resolved.usfm,
      chapter,
      verseStart,
      verseEnd,
      raw: match[0].trim(),
    });
  }

  // Deduplicate
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = `${r.bookUsfm}.${r.chapter}.${r.verseStart ?? ""}.${r.verseEnd ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Check if the query looks like it could be a reference (even partial).
 * Used to decide whether to skip AI search.
 */
export function looksLikeReference(query: string): boolean {
  const normalized = query.trim().toLowerCase().replace(/\./g, "");
  // Check if first word (with optional number prefix) matches a book alias
  const firstWordMatch = normalized.match(/^((?:[123]\s*)?[a-z][a-z\s]*?)(?:\s+\d|$)/);
  if (!firstWordMatch) return false;
  return BOOK_ALIASES[firstWordMatch[1].trim()] !== undefined;
}

export { USFM_NAMES, BOOK_ALIASES };
