import { useEffect, useState, type CSSProperties } from "react";
import type { SpecimenVisual as SpecimenVisualData } from "../../content/encyclopediaEntries";

type SpecimenVisualProps = {
  visual: SpecimenVisualData;
};

type SpriteStyle = CSSProperties & {
  "--specimen-aspect": string;
};

export function SpecimenVisual({ visual }: SpecimenVisualProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (visual.kind !== "sprite") {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches || visual.frames <= 1) {
      setFrame(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setFrame((current) => (current + 1) % visual.frames);
    }, 1000 / visual.frameRate);

    return () => window.clearInterval(intervalId);
  }, [visual]);

  if (visual.kind === "image") {
    return <img alt={visual.alt} className="specimen-static-image" src={visual.src} />;
  }

  if (visual.kind === "procedural") {
    return (
      <div
        aria-label={visual.alt}
        className={`procedural-specimen procedural-specimen-${visual.shape}`}
        role="img"
        style={{ "--procedural-color": visual.color } as CSSProperties}
      >
        <span>{visual.symbol}</span>
        <i aria-hidden="true" />
      </div>
    );
  }

  const x = visual.columns <= 1 ? 0 : (frame / (visual.columns - 1)) * 100;
  const y = visual.rows <= 1 ? 0 : (visual.row / (visual.rows - 1)) * 100;
  const style: SpriteStyle = {
    "--specimen-aspect": `${visual.frameWidth} / ${visual.frameHeight}`,
    backgroundImage: `url("${visual.src}")`,
    backgroundPosition: `${x}% ${y}%`,
    backgroundSize: `${visual.columns * 100}% ${visual.rows * 100}%`,
  };

  return (
    <div
      aria-label={visual.alt}
      className="animated-specimen-sprite"
      role="img"
      style={style}
    />
  );
}
