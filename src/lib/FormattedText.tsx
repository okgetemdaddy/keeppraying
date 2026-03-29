import React from "react";

/**
 * Renders text with proper paragraph breaks and optional first-line indentation.
 * - Double newlines (\n\n) become separate <p> elements (paragraph breaks).
 * - Single newlines (\n) become <br /> (line breaks within a paragraph).
 * - Optional indent adds a subtle text-indent to each paragraph after the first.
 */
interface FormattedTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  indent?: boolean;
  /** Max characters before truncation. Pass 0 or undefined to disable. */
  truncateAt?: number;
  /** Called when "read more" is clicked */
  onExpand?: () => void;
  /** If true, show full text even when truncateAt is set */
  expanded?: boolean;
  expandButtonColor?: string;
}

export function FormattedText({
  text,
  className = "",
  style,
  indent = true,
  truncateAt,
  onExpand,
  expanded,
  expandButtonColor = "hsl(42 75% 42%)",
}: FormattedTextProps) {
  const shouldTruncate = truncateAt && truncateAt > 0 && text.length > truncateAt && !expanded;
  const displayText = shouldTruncate
    ? text.slice(0, truncateAt).trimEnd()
    : text;

  // Split on double newlines for paragraphs
  const paragraphs = displayText.split(/\n\s*\n/);

  return (
    <div className={className} style={style}>
      {paragraphs.map((para, i) => {
        // Split single newlines within a paragraph
        const lines = para.split(/\n/);
        return (
          <p
            key={i}
            className={i > 0 ? "mt-3" : ""}
            style={indent && i > 0 ? { textIndent: "1.5em" } : undefined}
          >
            {lines.map((line, j) => (
              <React.Fragment key={j}>
                {j > 0 && <br />}
                {line}
              </React.Fragment>
            ))}
            {/* Add truncation indicator and expand button on the last paragraph */}
            {shouldTruncate && i === paragraphs.length - 1 && (
              <>
                {"… "}
                {onExpand && (
                  <button
                    onClick={onExpand}
                    className="text-sm font-medium hover:underline underline-offset-2 transition-colors inline"
                    style={{ color: expandButtonColor }}
                  >
                    read more
                  </button>
                )}
              </>
            )}
          </p>
        );
      })}
      {expanded && truncateAt && text.length > truncateAt && onExpand && (
        <button
          onClick={onExpand}
          className="text-sm font-medium hover:underline underline-offset-2 transition-colors mt-1"
          style={{ color: expandButtonColor }}
        >
          show less
        </button>
      )}
    </div>
  );
}
