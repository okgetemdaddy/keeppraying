/**
 * SVG filter definitions for brush textures.
 * Render once inside the InkOverlay <defs> block.
 * Each filter uses ≤3 primitives for 60fps performance.
 */
export function BrushTextures() {
  return (
    <>
      {/* Subtle paper grain for brush-highlighter */}
      <filter id="texture-grain-light" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="2" seed="1" result="grain" />
        <feComposite in="SourceGraphic" in2="grain" operator="in" />
      </filter>

      {/* Soft wet-edge watercolor effect */}
      <filter id="texture-watercolor" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" seed="2" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
      </filter>

      {/* Waxy crayon texture — high frequency noise */}
      <filter id="texture-crayon" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="turbulence" baseFrequency="0.8" numOctaves="4" seed="3" result="wax" />
        <feComposite in="SourceGraphic" in2="wax" operator="in" />
      </filter>

      {/* Graphite pencil grain */}
      <filter id="texture-graphite" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="2" seed="4" result="graphite" />
        <feComposite in="SourceGraphic" in2="graphite" operator="in" />
      </filter>

      {/* Dusty chalk effect */}
      <filter id="texture-chalk" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="turbulence" baseFrequency="0.35" numOctaves="3" seed="5" result="dust" />
        <feComposite in="SourceGraphic" in2="dust" operator="in" />
      </filter>
    </>
  );
}
