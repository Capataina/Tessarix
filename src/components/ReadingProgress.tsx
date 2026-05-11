import { useEffect, useState } from "react";
import "./ReadingProgress.css";

/**
 * Thin neon progress bar at the very top of the viewport that fills as
 * the reader scrolls the page.
 */
export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const scrollTop =
        window.scrollY || document.documentElement.scrollTop || 0;
      const docHeight =
        (document.documentElement.scrollHeight || 0) - window.innerHeight;
      const ratio = docHeight > 0 ? scrollTop / docHeight : 0;
      setProgress(Math.max(0, Math.min(1, ratio)));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div className="reading-progress" aria-hidden>
      <div
        className="reading-progress__fill"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}
