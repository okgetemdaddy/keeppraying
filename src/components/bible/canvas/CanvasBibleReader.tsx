import React, { useState, useCallback, useRef, useEffect } from "react";
import ZoomPanWrapper from "./ZoomPanWrapper";
import InkCanvas, { type InkStroke } from "./InkCanvas";
import { GENESIS_1 } from "./genesisData";
import { Pen, Eraser, Type } from "lucide-react";

const CanvasBibleReader: React.FC = () => {
  const [strokes, setStrokes] = useState<InkStroke[]>([]);
  const [drawMode, setDrawMode] = useState(false);
  const [fontSize, setFontSize] = useState(20);
  const [ready, setReady] = useState(false);
  const currentStroke = useRef<[number, number][]>([]);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(t);
  }, []);

  const handleStrokeStart = useCallback(() => {
    currentStroke.current = [];
  }, []);

  const handleStrokePoint = useCallback((pt: [number, number]) => {
    currentStroke.current.push(pt);
    setStrokes((prev) => {
      const next = [...prev];
      if (currentStroke.current.length === 1) {
        next.push({ points: [pt] });
      } else {
        next[next.length - 1] = { points: [...currentStroke.current] };
      }
      return next;
    });
  }, []);

  const handleStrokeEnd = useCallback(() => {
    if (currentStroke.current.length > 1) {
      setStrokes((prev) => {
        const next = [...prev];
        next[next.length - 1] = { points: [...currentStroke.current] };
        return next;
      });
    }
    currentStroke.current = [];
  }, []);

  const clearStrokes = useCallback(() => setStrokes([]), []);
  const zoomPercent = Math.round((fontSize / 20) * 100);

  return (
    <>
      {/* Loading breath */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f0e8",
          zIndex: ready ? -1 : 10,
          opacity: ready ? 0 : 1,
          transition: "opacity 400ms ease-in",
          pointerEvents: ready ? "none" : "auto",
        }}
      >
        <p
          style={{
            fontFamily: "'EB Garamond', serif",
            fontSize: 16,
            color: "#8b7355",
            animation: "canvasLoadFadeIn 600ms ease-out forwards",
          }}
        >
          Full power canvas initializing…
        </p>
      </div>

      {/* Canvas + HUD — fades in when ready */}
      <div
        style={{
          opacity: ready ? 1 : 0,
          transition: "opacity 400ms ease-in",
        }}
      >
        <ZoomPanWrapper
          drawMode={drawMode}
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
          overlay={
            <InkCanvas
              strokes={strokes}
              drawMode={drawMode}
              onStrokeStart={handleStrokeStart}
              onStrokePoint={handleStrokePoint}
              onStrokeEnd={handleStrokeEnd}
            />
          }
        >
          <div style={{ maxWidth: 680, margin: "0 auto", position: "relative" }}>
            <header style={{ textAlign: "center", marginBottom: 40 }}>
              <h1
                style={{
                  fontFamily: "'EB Garamond', serif",
                  fontSize: "var(--canvas-font-size, 20px)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#8b7355",
                  fontWeight: 400,
                  transform: "scale(1.6)",
                  transformOrigin: "center",
                  marginBottom: 8,
                }}
              >
                Genesis
              </h1>
              <p
                style={{
                  fontFamily: "'EB Garamond', serif",
                  fontSize: "var(--canvas-font-size, 20px)",
                  color: "#8b7355",
                  fontStyle: "italic",
                  fontWeight: 400,
                  opacity: 0.7,
                }}
              >
                Chapter One
              </p>
              <hr
                style={{
                  border: "none",
                  borderTop: "1px solid #c4b393",
                  width: 120,
                  margin: "20px auto 0",
                }}
              />
            </header>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "48px 1fr",
                gap: "0 12px",
              }}
            >
              {GENESIS_1.map((v) => (
                <React.Fragment key={v.verse}>
                  <span
                    style={{
                      fontFamily: "'EB Garamond', serif",
                      fontSize: "var(--canvas-font-size, 20px)",
                      lineHeight: "var(--canvas-line-height, 32px)",
                      color: "#8b7355",
                      textAlign: "right",
                      userSelect: "none",
                      paddingTop: 1,
                      fontVariantNumeric: "oldstyle-nums",
                    }}
                  >
                    {v.verse}
                  </span>
                  <span
                    style={{
                      fontFamily: "'EB Garamond', serif",
                      fontSize: "var(--canvas-font-size, 20px)",
                      lineHeight: "var(--canvas-line-height, 32px)",
                      color: "#1a1410",
                    }}
                  >
                    {v.text}
                  </span>
                </React.Fragment>
              ))}
            </div>

            <div
              style={{
                textAlign: "center",
                marginTop: 48,
                color: "#c4b393",
                fontSize: 24,
                letterSpacing: "0.5em",
                userSelect: "none",
              }}
            >
              ✦ ✦ ✦
            </div>
          </div>
        </ZoomPanWrapper>

        {/* Hint */}
        <div
          style={{
            position: "fixed",
            top: 16,
            right: 20,
            fontSize: 11,
            color: "#8b7355",
            opacity: 0.6,
            fontFamily: "system-ui, sans-serif",
            textAlign: "right",
            lineHeight: 1.5,
            pointerEvents: "none",
            zIndex: 50,
          }}
        >
          pinch to zoom text · three fingers to pan
          <br />
          ctrl+scroll for semantic zoom
        </div>

        {/* HUD */}
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 20px",
            borderRadius: 16,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            color: "#e8e0d4",
            fontFamily: "system-ui, sans-serif",
            fontSize: 13,
            zIndex: 50,
            userSelect: "none",
          }}
        >
          <button
            onClick={() => setDrawMode((d) => !d)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              background: drawMode ? "rgba(220,60,60,0.3)" : "rgba(255,255,255,0.1)",
              color: drawMode ? "#ff6b6b" : "#e8e0d4",
              fontSize: 13,
              transition: "all 0.2s",
            }}
          >
            <Pen size={14} />
            {drawMode ? "Drawing" : "Draw"}
          </button>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Type size={13} style={{ opacity: 0.6 }} />
            <span>{fontSize}px</span>
          </div>
          <span style={{ opacity: 0.5 }}>{zoomPercent}%</span>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)" }} />
          <button
            onClick={clearStrokes}
            disabled={strokes.length === 0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              border: "none",
              cursor: strokes.length === 0 ? "not-allowed" : "pointer",
              background: "rgba(255,255,255,0.1)",
              color: strokes.length === 0 ? "rgba(255,255,255,0.25)" : "#e8e0d4",
              fontSize: 13,
              transition: "all 0.2s",
            }}
          >
            <Eraser size={14} />
            Clear
          </button>
        </div>
      </div>

      <style>{`
        @keyframes canvasLoadFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default CanvasBibleReader;
