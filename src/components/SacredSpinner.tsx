import { motion } from "framer-motion";

interface SacredSpinnerProps {
  /** Full-page mode takes min-h-screen; inline mode is compact */
  fullPage?: boolean;
  text?: string;
}

export default function SacredSpinner({ fullPage = false, text = "Be still and know…" }: SacredSpinnerProps) {
  const wrapper = fullPage
    ? "flex min-h-screen items-center justify-center bg-background"
    : "flex items-center justify-center py-16";

  return (
    <div className={wrapper}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="text-center space-y-4"
      >
        {/* Sacred spiral */}
        <div className="relative w-12 h-12 mx-auto">
          {/* Outer ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary/30"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
          {/* Inner glowing ring */}
          <motion.div
            className="absolute inset-1 rounded-full border-2 border-t-primary border-r-transparent border-b-primary/20 border-l-transparent"
            animate={{ rotate: -360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
          {/* Center dot */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="w-2 h-2 rounded-full bg-primary/60" />
          </motion.div>
        </div>

        {/* Scripture text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="font-display text-sm italic text-muted-foreground"
        >
          {text}
        </motion.p>
      </motion.div>
    </div>
  );
}
