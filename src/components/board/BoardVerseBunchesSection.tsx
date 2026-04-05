import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Package, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { useState } from "react";
import { useUserVerseBunches, type BunchWithCount } from "@/components/bible/VerseBunchStrip";

import { USFM_BOOK_NAMES as BOOK_NAMES } from "@/lib/usfmBooks";

function bookName(usfm: string | null): string {
  if (!usfm) return "";
  return BOOK_NAMES[usfm] ?? usfm;
}

interface BoardVerseBunchesSectionProps {
  textColor: string;
}

export function BoardVerseBunchesSection({ textColor }: BoardVerseBunchesSectionProps) {
  const { data: bunches, isLoading } = useUserVerseBunches();
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  if (isLoading || !bunches?.length) return null;

  const handleNavigate = (bunch: BunchWithCount) => {
    const params = new URLSearchParams();
    if (bunch.first_version_id) params.set("v", String(bunch.first_version_id));
    if (bunch.first_book_usfm) params.set("b", bunch.first_book_usfm);
    if (bunch.first_chapter !== null) params.set("c", String(bunch.first_chapter));
    navigate(`/bible?${params.toString()}`);
  };

  return (
    <div className="mb-6">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 mb-3 group"
      >
        <Package className="h-4 w-4 text-violet-400" />
        <span className="text-sm font-semibold" style={{ color: textColor }}>
          Verse Bunches
        </span>
        <span className="text-xs opacity-50" style={{ color: textColor }}>
          ({bunches.length})
        </span>
        {collapsed ? (
          <ChevronDown className="h-3.5 w-3.5 opacity-50" style={{ color: textColor }} />
        ) : (
          <ChevronUp className="h-3.5 w-3.5 opacity-50" style={{ color: textColor }} />
        )}
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {bunches.map((bunch) => (
              <motion.button
                key={bunch.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleNavigate(bunch)}
                className="text-left rounded-xl p-4 transition-all"
                style={{
                  background: "rgba(139, 92, 246, 0.12)",
                  border: "1px solid rgba(139, 92, 246, 0.2)",
                }}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: "rgba(139, 92, 246, 0.2)" }}
                  >
                    <BookOpen className="h-4 w-4 text-violet-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4
                      className="text-sm font-semibold truncate"
                      style={{ color: textColor }}
                    >
                      {bunch.bunch_name}
                    </h4>
                    {bunch.description && (
                      <p
                        className="text-xs mt-0.5 line-clamp-1 opacity-60"
                        style={{ color: textColor }}
                      >
                        {bunch.description}
                      </p>
                    )}
                    <p
                      className="text-[0.65rem] mt-1.5 opacity-50"
                      style={{ color: textColor }}
                    >
                      {bunch.item_count} verse{bunch.item_count !== 1 ? "s" : ""}
                      {bunch.first_book_usfm && (
                        <> · {bookName(bunch.first_book_usfm)} {bunch.first_chapter}</>
                      )}
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
