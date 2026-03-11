import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, CheckCircle2, XCircle, RotateCcw, Trophy, ChevronLeft, ChevronRight } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Verse flashcard data from PrayerAssist system prompt
const VERSE_CARDS = [
  { ref: "Matthew 6:6", verse: "But when you pray, go into your room, close the door and pray to your Father, who is unseen. Then your Father, who sees what is done in secret, will reward you." },
  { ref: "Matthew 7:7-8", verse: "Ask and it will be given to you; seek and you will find; knock and the door will be opened to you. For everyone who asks receives; the one who seeks finds; and to the one who knocks, the door will be opened." },
  { ref: "Mark 11:24", verse: "Therefore I tell you, whatever you ask in prayer, believe that you have received it, and it will be yours." },
  { ref: "Luke 18:1", verse: "Then Jesus told his disciples a parable to show them that they should always pray and not give up." },
  { ref: "Philippians 4:6-7", verse: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus." },
  { ref: "1 Thessalonians 5:16-18", verse: "Rejoice always, pray continually, give thanks in all circumstances; for this is God's will for you in Christ Jesus." },
  { ref: "Ephesians 6:18", verse: "And pray in the Spirit on all occasions with all kinds of prayers and requests. With this in mind, be alert and always keep on praying for all the Lord's people." },
  { ref: "Colossians 4:2", verse: "Devote yourselves to prayer, being watchful and thankful." },
  { ref: "James 5:16", verse: "Therefore confess your sins to each other and pray for each other so that you may be healed. The prayer of a righteous person is powerful and effective." },
  { ref: "1 John 5:14-15", verse: "This is the confidence we have in approaching God: that if we ask anything according to his will, he hears us. And if we know that he hears us—whatever we ask—we know that we have what we asked of him." },
  { ref: "Romans 8:26-27", verse: "In the same way, the Spirit helps us in our weakness. We do not know what we ought to pray for, but the Spirit himself intercedes for us through wordless groans." },
];

// Memory match pairs
const MATCH_PAIRS = [
  { term: "Lord's Prayer", def: "Matthew 6:9-13" },
  { term: "Pray continually", def: "1 Thess 5:17" },
  { term: "Righteous prayer is powerful", def: "James 5:16" },
  { term: "Ask, seek, knock", def: "Matthew 7:7-8" },
  { term: "Pray without ceasing", def: "1 Thess 5:17" },
  { term: "Peace beyond understanding", def: "Phil 4:6-7" },
  { term: "Spirit intercedes for us", def: "Romans 8:26" },
  { term: "Believe you receive it", def: "Mark 11:24" },
];

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

// ──────────────────── TRIVIA TAB ────────────────────
function TriviaTab() {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const startQuiz = async () => {
    setLoading(true);
    setQuestions([]);
    setQIndex(0);
    setScore(0);
    setSelected(null);
    setDone(false);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/bible-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({}),
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Failed to generate quiz");
      }
      const { questions: qs } = await resp.json();
      setQuestions(qs);
    } catch (e) {
      toast({ title: "Quiz unavailable", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const choose = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    if (i === questions[qIndex].correct) setScore(s => s + 1);
  };

  const next = () => {
    if (qIndex < questions.length - 1) { setQIndex(i => i + 1); setSelected(null); }
    else setDone(true);
  };

  const current = questions[qIndex];

  if (loading) return (
    <div className="flex flex-col items-center gap-4 py-20">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <p className="verse-text">Generating your quiz with AI…</p>
    </div>
  );

  if (questions.length === 0) return (
    <div className="text-center py-16 space-y-5">
      <span className="text-6xl">✝️</span>
      <h2 className="font-display text-2xl font-bold">Bible Trivia</h2>
      <p className="text-muted-foreground max-w-sm mx-auto">Test your knowledge of prayer and Scripture with 10 AI-generated questions.</p>
      <Button onClick={startQuiz} className="btn-gold rounded-xl px-8 gap-2">Start Quiz</Button>
    </div>
  );

  if (done) return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16 space-y-5">
      <Trophy className="w-14 h-14 text-primary mx-auto" />
      <h2 className="font-display text-3xl font-bold">Quiz Complete!</h2>
      <div className="text-5xl font-display font-bold text-primary">{score}/{questions.length}</div>
      <p className="verse-text">
        {score === 10 ? "Perfect score! You know God's Word well. 🎉" :
         score >= 7 ? "Well done! Keep studying the Word. 📖" :
         score >= 5 ? "Good effort! Keep seeking Scripture. 🙏" :
         "Keep reading your Bible — every verse is a treasure! ✨"}
      </p>
      <Button onClick={startQuiz} className="btn-gold rounded-xl px-8 gap-2"><RotateCcw className="w-4 h-4" />New Quiz</Button>
    </motion.div>
  );

  return (
    <div className="max-w-xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Question {qIndex + 1} of {questions.length}</span>
        <span>Score: {score}</span>
      </div>
      <div className="w-full bg-muted h-2 rounded-full">
        <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${((qIndex + 1) / questions.length) * 100}%` }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={qIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <div className="prayer-card p-6 space-y-4">
            <p className="font-display text-lg font-semibold">{current.question}</p>
            <div className="space-y-2">
              {current.options.map((opt, i) => {
                const isSelected = selected === i;
                const isCorrect = i === current.correct;
                const showResult = selected !== null;
                return (
                  <button
                    key={i}
                    onClick={() => choose(i)}
                    disabled={selected !== null}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm ${
                      showResult
                        ? isCorrect ? "border-green-500 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                          : isSelected ? "border-red-400 bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                          : "border-border opacity-50"
                        : "border-border hover:border-primary hover:bg-accent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-xs opacity-60">{String.fromCharCode(65 + i)}.</span>
                      <span>{opt}</span>
                      {showResult && isCorrect && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />}
                      {showResult && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-400 ml-auto" />}
                    </div>
                  </button>
                );
              })}
            </div>
            {selected !== null && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm verse-text">
                {current.explanation}
              </motion.p>
            )}
          </div>
          {selected !== null && (
            <Button onClick={next} className="btn-gold rounded-xl w-full mt-4">
              {qIndex < questions.length - 1 ? "Next Question →" : "See Results →"}
            </Button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ──────────────────── FLASHCARDS TAB ────────────────────
function FlashcardsTab() {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const goNext = () => { setFlipped(false); setTimeout(() => setIndex(i => (i + 1) % VERSE_CARDS.length), 150); };
  const goPrev = () => { setFlipped(false); setTimeout(() => setIndex(i => (i - 1 + VERSE_CARDS.length) % VERSE_CARDS.length), 150); };

  const card = VERSE_CARDS[index];

  return (
    <div className="max-w-lg mx-auto py-8 space-y-6">
      <div className="text-center text-sm text-muted-foreground">{index + 1} / {VERSE_CARDS.length}</div>

      <div className="relative h-64 cursor-pointer" style={{ perspective: "1000px" }} onClick={() => setFlipped(f => !f)}>
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
          style={{ transformStyle: "preserve-3d", width: "100%", height: "100%", position: "relative" }}
        >
          {/* Front */}
          <div className="prayer-card p-8 flex flex-col items-center justify-center text-center absolute inset-0" style={{ backfaceVisibility: "hidden" }}>
            <p className="text-xs text-muted-foreground mb-3">Scripture Reference</p>
            <p className="font-display text-3xl font-bold text-foreground">{card.ref}</p>
            <p className="text-xs text-muted-foreground mt-4">Tap to reveal verse</p>
          </div>
          {/* Back */}
          <div className="prayer-card p-6 flex flex-col items-center justify-center text-center absolute inset-0" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
            <p className="text-xs text-muted-foreground mb-3">{card.ref}</p>
            <p className="font-display italic leading-relaxed text-foreground">"{card.verse}"</p>
          </div>
        </motion.div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="sm" onClick={goPrev} className="rounded-xl gap-1"><ChevronLeft className="w-4 h-4" />Prev</Button>
        <Button variant="outline" size="sm" onClick={() => setFlipped(f => !f)} className="rounded-xl">Flip Card</Button>
        <Button variant="outline" size="sm" onClick={goNext} className="rounded-xl gap-1">Next<ChevronRight className="w-4 h-4" /></Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">Tap or click card to flip</p>
    </div>
  );
}

// ──────────────────── MEMORY MATCH TAB ────────────────────
function MemoryMatchTab() {
  const allPairs = MATCH_PAIRS.slice(0, 8);
  const [cards, setCards] = useState<{ id: string; content: string; pairId: number; flipped: boolean; matched: boolean }[]>([]);
  const [flippedIds, setFlippedIds] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [checking, setChecking] = useState(false);

  const init = () => {
    const deck = allPairs.flatMap((p, i) => [
      { id: `t${i}`, content: p.term, pairId: i, flipped: false, matched: false },
      { id: `d${i}`, content: p.def, pairId: i, flipped: false, matched: false },
    ]);
    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    setCards(deck);
    setFlippedIds([]);
    setMoves(0);
    setWon(false);
  };

  useEffect(() => { init(); }, []);

  const handleFlip = (id: string) => {
    if (checking || flippedIds.length === 2) return;
    const card = cards.find(c => c.id === id);
    if (!card || card.flipped || card.matched) return;

    const newFlipped = [...flippedIds, id];
    setFlippedIds(newFlipped);
    setCards(prev => prev.map(c => c.id === id ? { ...c, flipped: true } : c));

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      setChecking(true);
      const [a, b] = newFlipped.map(fid => cards.find(c => c.id === fid)!);
      setTimeout(() => {
        if (a.pairId === b.pairId) {
          setCards(prev => prev.map(c => newFlipped.includes(c.id) ? { ...c, matched: true } : c));
          const updated = cards.map(c => newFlipped.includes(c.id) ? { ...c, matched: true } : c);
          if (updated.every(c => c.matched)) setWon(true);
        } else {
          setCards(prev => prev.map(c => newFlipped.includes(c.id) ? { ...c, flipped: false } : c));
        }
        setFlippedIds([]);
        setChecking(false);
      }, 900);
    }
  };

  if (won) return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-5">
      <span className="text-6xl">🏆</span>
      <h2 className="font-display text-2xl font-bold">You matched them all!</h2>
      <p className="text-muted-foreground">Completed in {moves} moves</p>
      <Button onClick={init} className="btn-gold rounded-xl gap-2"><RotateCcw className="w-4 h-4" />Play Again</Button>
    </motion.div>
  );

  return (
    <div className="max-w-xl mx-auto py-6 space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Moves: {moves}</span>
        <Button size="sm" variant="outline" onClick={init} className="rounded-xl gap-1"><RotateCcw className="w-3 h-3" />Reset</Button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {cards.map(card => (
          <motion.button
            key={card.id}
            onClick={() => handleFlip(card.id)}
            whileHover={!card.flipped && !card.matched ? { scale: 1.03 } : {}}
            whileTap={{ scale: 0.97 }}
            className={`h-20 rounded-xl text-xs font-medium p-2 transition-all border ${
              card.matched ? "bg-primary/20 border-primary text-primary" :
              card.flipped ? "bg-accent border-border text-foreground" :
              "bg-card border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            {(card.flipped || card.matched) ? card.content : "✝"}
          </motion.button>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground">Match each prayer term with its Scripture reference</p>
    </div>
  );
}

export default function Games() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
          <span className="font-display font-bold text-xl">Bible Games</span>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold mb-2">Bible Games</h1>
          <p className="text-muted-foreground">Strengthen your knowledge of God's Word through play</p>
        </div>

        <Tabs defaultValue="trivia">
          <TabsList className="w-full rounded-xl mb-6">
            <TabsTrigger value="trivia" className="flex-1 rounded-lg">📖 Trivia</TabsTrigger>
            <TabsTrigger value="flashcards" className="flex-1 rounded-lg">🃏 Flashcards</TabsTrigger>
            <TabsTrigger value="memory" className="flex-1 rounded-lg">🧠 Memory</TabsTrigger>
          </TabsList>
          <TabsContent value="trivia"><TriviaTab /></TabsContent>
          <TabsContent value="flashcards"><FlashcardsTab /></TabsContent>
          <TabsContent value="memory"><MemoryMatchTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
