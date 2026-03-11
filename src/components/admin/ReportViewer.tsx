import { motion } from "framer-motion";
import { FileText, Download, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface Report {
  id: string;
  generated_at: string;
  report_type: string;
  summary: string | null;
  suggestions: string[] | null;
  anomalies: string[] | null;
  triggered_by: string | null;
  key_metrics: Record<string, unknown> | null;
}

interface ReportViewerProps {
  reports: Report[];
}

function downloadReport(report: Report) {
  const lines = [
    `# PrayerWatch Report — ${new Date(report.generated_at).toLocaleDateString()}`,
    `**Type:** ${report.report_type} | **Triggered by:** ${report.triggered_by || "manual"}`,
    "",
    "## Summary",
    report.summary || "N/A",
    "",
    "## Anomalies",
    ...(report.anomalies || []).map((a, i) => `${i + 1}. ${a}`),
    "",
    "## Suggestions",
    ...(report.suggestions || []).map((s, i) => `${i + 1}. ${s}`),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `prayerwatch-report-${report.id.slice(0, 8)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportViewer({ reports }: ReportViewerProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (reports.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">No reports yet — click "Generate Report" to create the first one.</p>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((r, i) => {
        const isOpen = expanded === r.id;
        return (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="prayer-card overflow-hidden"
          >
            <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(isOpen ? null : r.id)}>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  PrayerWatch Report · {new Date(r.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
                <p className="text-xs text-muted-foreground truncate">{r.summary?.slice(0, 90) || "No summary"}…</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="secondary" className="text-xs capitalize">{r.report_type}</Badge>
                <Button size="sm" variant="ghost" className="rounded-lg w-8 h-8 p-0" onClick={e => { e.stopPropagation(); downloadReport(r); }}>
                  <Download className="w-3.5 h-3.5" />
                </Button>
                {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>

            {isOpen && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="border-t border-border px-4 pb-4 pt-3 space-y-4"
              >
                {r.summary && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Summary</p>
                    <p className="text-sm text-foreground/80">{r.summary}</p>
                  </div>
                )}
                {(r.anomalies || []).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Anomalies</p>
                    <ul className="space-y-1">
                      {(r.anomalies || []).map((a, i) => (
                        <li key={i} className="text-sm text-foreground/80 flex gap-2">
                          <span className="text-amber-500 flex-shrink-0">⚠</span>{a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(r.suggestions || []).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Suggestions</p>
                    <ul className="space-y-1">
                      {(r.suggestions || []).map((s, i) => (
                        <li key={i} className="text-sm text-foreground/80 flex gap-2">
                          <span className="text-primary flex-shrink-0">✦</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
