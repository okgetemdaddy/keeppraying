import React from "react";
import { KeepReadingNav } from "@/components/keepreading/KeepReadingNav";

export default function Help() {
  return (
    <>
      <KeepReadingNav />
      <main className="max-w-2xl mx-auto px-5 py-12 text-foreground">
        <h1 className="text-3xl font-display font-bold tracking-tight mb-8">
          Help &amp; Guide
        </h1>

        {/* ── Study Sessions ── */}
        <section id="sessions" className="mb-12 scroll-mt-20">
          <h2 className="text-xl font-semibold mb-4">Study Sessions</h2>

          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            KeepRead.ing quietly tracks your Bible study in the background. Every time
            you read, highlight, or take notes, the app groups your activity into a
            session — a snapshot of that study sitting.
          </p>

          <div className="space-y-5">
            <div className="rounded-lg border border-border bg-card/50 p-4">
              <h3 className="text-sm font-semibold mb-1.5">Reading Sessions</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Start automatically when you begin reading or annotating. End when you
                leave or after a period of inactivity. You never have to think about them.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card/50 p-4">
              <h3 className="text-sm font-semibold mb-1.5">Canvas Study Sessions</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Created when you enter iPad Study Mode and choose specific verses to study
                on a focused canvas. These sessions save your ink, highlights, and canvas
                state so you can resume exactly where you left off.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card/50 p-4">
              <h3 className="text-sm font-semibold mb-1.5">Intelligent Summaries</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                After each session, KeepRead.ing generates an intelligent summary of your
                study — the themes you explored, the connections you made, and the verses
                that captured your attention. Multiple perspectives analyze your session:
                theological context, statistical patterns, and study behavior. Find these
                in your Bible Sleeve under Recent Sessions.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card/50 p-4">
              <h3 className="text-sm font-semibold mb-1.5">Apple Pencil &amp; Margin Mode</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When your Apple Pencil touches the screen, KeepRead.ing instantly enables
                writing alongside your scripture. Underline to highlight, circle a word for
                cross-references, and scratch to undo. Your finger still scrolls normally —
                the Pencil is the only drawing tool.
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground/70 mt-4 italic">
            Sessions are private and stored securely. Only you can see your study history.
          </p>
        </section>

        {/* ── Gesture Guide ── */}
        <section id="gestures" className="mb-12 scroll-mt-20">
          <h2 className="text-xl font-semibold mb-4">Gesture Guide</h2>

          <div className="space-y-5">
            <div className="rounded-lg border border-border bg-card/50 p-4">
              <h3 className="text-sm font-semibold mb-1.5">Touch Gestures</h3>
              <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
                <p><strong>1 finger:</strong> Tap a verse to select it. Long-press a word to look it up.</p>
                <p><strong>2 fingers:</strong> Pan or zoom the canvas (iPad Study Mode).</p>
                <p><strong>3 fingers:</strong> Rotate the canvas freely (iPad Study Mode).</p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card/50 p-4">
              <h3 className="text-sm font-semibold mb-1.5">Apple Pencil Gestures</h3>
              <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
                <p><strong>Draw freely:</strong> Write notes, diagrams, or annotations anywhere.</p>
                <p><strong>Underline:</strong> Draw a horizontal line under text to highlight it.</p>
                <p><strong>Circle:</strong> Draw a circle around 1–4 words for cross-reference insights.</p>
                <p><strong>Scratch (X):</strong> Scribble back and forth over ink or highlights to delete them.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
