/**
 * The Tessarix mark: a hairline tesseract (a cube projected inside a cube, the
 * 2D shadow of a 4-cube). It ties the name (Tessarix ~ tesseract), the subject
 * (geometry / linear algebra, which the lessons actually teach), and the
 * technical-but-warm identity into one glyph. Drawn in `currentColor` so it
 * inherits the accent, and rotates on hover (see App.css; reduced-motion
 * disables it globally).
 */
export function TesseractMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      className="tesseract-mark"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
    >
      {/* outer cube face */}
      <rect x="2.5" y="2.5" width="19" height="19" stroke="currentColor" strokeWidth="1.1" />
      {/* inner cube face (the projected 4th dimension), offset and dimmer */}
      <rect x="11" y="11" width="19" height="19" stroke="currentColor" strokeWidth="1.1" opacity="0.62" />
      {/* the four edges joining corresponding corners */}
      <line x1="2.5" y1="2.5" x2="11" y2="11" stroke="currentColor" strokeWidth="1" opacity="0.42" />
      <line x1="21.5" y1="2.5" x2="30" y2="11" stroke="currentColor" strokeWidth="1" opacity="0.42" />
      <line x1="2.5" y1="21.5" x2="11" y2="30" stroke="currentColor" strokeWidth="1" opacity="0.42" />
      <line x1="21.5" y1="21.5" x2="30" y2="30" stroke="currentColor" strokeWidth="1" opacity="0.42" />
    </svg>
  );
}
