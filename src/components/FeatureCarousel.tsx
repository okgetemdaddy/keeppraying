import { motion } from "framer-motion";

export default function FeatureCarousel() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32 md:py-40">
      {/* Soft radial backdrop */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage:
          "radial-gradient(ellipse at 50% 0%, hsl(42 85% 46% / 0.06) 0%, transparent 55%), radial-gradient(ellipse at 50% 100%, hsl(150 38% 26% / 0.04) 0%, transparent 55%)",
      }} />

      {/* Thin decorative gold line top */}
      <motion.div
        className="absolute top-12 left-1/2 -translate-x-1/2 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        initial={{ width: 0 }}
        whileInView={{ width: "60%" }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />

      <div className="container mx-auto px-6 sm:px-8 max-w-5xl relative z-10">
        {/* Kicker */}
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center text-[10px] sm:text-xs font-bold uppercase tracking-[0.35em] text-primary/60 mb-8 sm:mb-10"
        >
          ✦&ensp;Built for believers&ensp;✦
        </motion.p>

        {/* Main declaration — large typographic hero */}
        <div className="text-center space-y-2 sm:space-y-3">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight text-foreground"
          >
            Everything your
          </motion.h2>

          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight"
          >
            <span className="bg-gradient-to-r from-primary via-[hsl(35_82%_54%)] to-primary bg-clip-text text-transparent">
              prayer life
            </span>{" "}
            <span className="text-foreground">needs</span>
          </motion.h2>
        </div>

        {/* Decorative cross divider */}
        <motion.div
          className="flex items-center justify-center gap-4 my-10 sm:my-14"
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.25 }}
        >
          <div className="h-px flex-1 max-w-[80px] sm:max-w-[120px] bg-gradient-to-r from-transparent to-border" />
          <motion.span
            className="text-primary/40 text-lg"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            ✟
          </motion.span>
          <div className="h-px flex-1 max-w-[80px] sm:max-w-[120px] bg-gradient-to-l from-transparent to-border" />
        </motion.div>

        {/* Sub-declaration — the mission statement */}
        <motion.div
          className="max-w-3xl mx-auto text-center space-y-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <p className="font-serif text-lg sm:text-xl md:text-2xl leading-relaxed text-foreground/80 italic">
            The adversities every Christian shares are battles{" "}
            <span className="not-italic font-semibold text-foreground">
              to keep reading the Word
            </span>{" "}
            and{" "}
            <span className="not-italic font-semibold text-foreground">
              to keep praying.
            </span>
          </p>

          <motion.p
            className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground tracking-tight"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.45 }}
          >
            Here, we aim to make{" "}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-[hsl(150_38%_26%)] to-[hsl(150_32%_42%)] bg-clip-text text-transparent">
                both
              </span>
              {/* Underline accent */}
              <motion.span
                className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-gradient-to-r from-primary/60 to-[hsl(150_38%_26%_/_0.5)]"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.7, ease: "easeOut" }}
                style={{ transformOrigin: "left" }}
              />
            </span>{" "}
            the fabric of your day.
          </motion.p>
        </motion.div>
      </div>

      {/* Thin decorative gold line bottom */}
      <motion.div
        className="absolute bottom-12 left-1/2 -translate-x-1/2 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"
        initial={{ width: 0 }}
        whileInView={{ width: "40%" }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
      />
    </section>
  );
}
