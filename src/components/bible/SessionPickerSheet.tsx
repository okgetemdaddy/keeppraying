import React, { useMemo } from "react";
import { Plus, Clock, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveSheet,
  ResponsiveSheetContent,
  ResponsiveSheetHeader,
  ResponsiveSheetTitle,
  ResponsiveSheetDescription,
} from "@/components/ui/responsive-sheet";
import type { CanvasSessionConfig } from "@/components/bible/CanvasCreationDrawer";

/* ── Saved session shape ── */
export interface SavedSession {
  id: string;
  createdAt: string;
  verseRange: string;
  bookUsfm: string;
  chapterIdx: number;
  config: CanvasSessionConfig;
}

const LS_KEY = "bible_canvas_sessions";

export function loadSessions(): SavedSession[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function persistSessions(sessions: SavedSession[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(sessions));
  } catch {}
}

export function saveNewSession(session: SavedSession) {
  const all = loadSessions();
  all.unshift(session);
  // Keep max 20
  if (all.length > 20) all.length = 20;
  persistSessions(all);
}

export function deleteSession(id: string) {
  const all = loadSessions().filter((s) => s.id !== id);
  persistSessions(all);
}

/* ── Component ── */
interface SessionPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewSession: () => void;
  onResumeSession: (session: SavedSession) => void;
}

export function SessionPickerSheet({
  open,
  onOpenChange,
  onNewSession,
  onResumeSession,
}: SessionPickerSheetProps) {
  const sessions = useMemo(() => (open ? loadSessions() : []), [open]);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSession(id);
    setDeletingId(id);
    // Force re-render by toggling — sessions are re-read on open
    setTimeout(() => setDeletingId(null), 300);
  };

  const activeSessions = sessions.filter((s) => s.id !== deletingId);

  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange}>
      <ResponsiveSheetContent side="bottom" className="max-h-[80vh]">
        <ResponsiveSheetHeader className="pb-2">
          <ResponsiveSheetTitle className="text-lg font-semibold">
            Canvas Sessions
          </ResponsiveSheetTitle>
          <ResponsiveSheetDescription className="text-sm text-muted-foreground">
            Resume a previous study session or start a new one.
          </ResponsiveSheetDescription>
        </ResponsiveSheetHeader>

        <div className="px-4 pb-6 space-y-4 overflow-y-auto max-h-[55vh]">
          {/* New Session CTA */}
          <Button
            onClick={() => {
              onOpenChange(false);
              onNewSession();
            }}
            className="w-full gap-2"
            size="lg"
          >
            <Plus className="h-4 w-4" />
            New Canvas Session
          </Button>

          {/* Session list */}
          {activeSessions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Recent Sessions
              </p>
              {activeSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => {
                    onOpenChange(false);
                    onResumeSession(session);
                  }}
                  className="w-full flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-left hover:bg-accent/50 transition-colors group"
                >
                  <div className="flex-shrink-0 mt-0.5 rounded-md bg-primary/10 p-2">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-card-foreground truncate">
                      {session.verseRange}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(session.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      <span className="text-muted-foreground/60">·</span>
                      <span>
                        {session.config.paper.widthIn}×{session.config.paper.heightIn}"
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(session.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-opacity"
                    title="Delete session"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </button>
              ))}
            </div>
          )}

          {activeSessions.length === 0 && (
            <div className="text-center py-6 space-y-2">
              <p className="text-sm text-muted-foreground">
                No saved sessions yet. Create your first canvas session to begin studying.
              </p>
            </div>
          )}
        </div>
      </ResponsiveSheetContent>
    </ResponsiveSheet>
  );
}
