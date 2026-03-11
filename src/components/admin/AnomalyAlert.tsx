import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle, X } from "lucide-react";

interface AnomalyAlertProps {
  anomalies: string[];
  onDismiss?: (idx: number) => void;
}

export default function AnomalyAlert({ anomalies, onDismiss }: AnomalyAlertProps) {
  if (anomalies.length === 0) {
    return (
      <div className="prayer-card p-4 flex items-center gap-3 text-sm text-muted-foreground">
        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        No anomalies detected — all metrics look healthy 🙏
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {anomalies.map((a, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.3, delay: i * 0.06 }}
            className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3"
          >
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-foreground flex-1">{a}</p>
            {onDismiss && (
              <button onClick={() => onDismiss(i)} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
