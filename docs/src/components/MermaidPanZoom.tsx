import React, { useEffect, useRef } from "react";

type MermaidPanZoomProps = {
  id: string;
  chart: string;
  className?: string;
};

type PanzoomInstance = {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  destroy: () => void;
  zoomWithWheel: (event: WheelEvent) => void;
};

export default function MermaidPanZoom({ id, chart, className }: MermaidPanZoomProps): React.JSX.Element {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pzRef = useRef<PanzoomInstance | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async (): Promise<void> => {
      const mermaid = (await import("mermaid")).default;
      const Panzoom = (await import("@panzoom/panzoom")).default;

      if (cancelled || !wrapperRef.current) return;

      const isDark = document.documentElement.getAttribute("data-theme") === "dark";

      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "loose",
        theme: isDark ? "dark" : "default",
      });

      const { svg } = await mermaid.render(`configarr-mermaid-${id}`, chart);
      if (cancelled || !wrapperRef.current) return;

      wrapperRef.current.innerHTML = svg;
      const svgEl = wrapperRef.current.querySelector("svg");
      if (!svgEl) return;

      svgEl.style.transformOrigin = "0 0";

      pzRef.current?.destroy();
      pzRef.current = Panzoom(svgEl, {
        maxScale: 10,
        minScale: 0.1,
        startScale: 1,
        cursor: "grab",
      });

      wrapperRef.current.addEventListener("wheel", pzRef.current.zoomWithWheel);
    };

    void init();

    return () => {
      cancelled = true;
      if (wrapperRef.current) {
        wrapperRef.current.removeEventListener("wheel", pzRef.current?.zoomWithWheel as EventListener);
      }
      pzRef.current?.destroy();
      pzRef.current = null;
    };
  }, [id, chart]);

  return (
    <div className={`cf-group-panzoom ${className ?? ""}`.trim()}>
      <div className="cf-group-panzoom__controls">
        <button type="button" onClick={() => pzRef.current?.zoomIn()} title="Zoom in">
          +
        </button>
        <button type="button" onClick={() => pzRef.current?.zoomOut()} title="Zoom out">
          &minus;
        </button>
        <button type="button" onClick={() => pzRef.current?.reset()} title="Reset">
          Reset
        </button>
      </div>
      <div className="cf-group-panzoom__canvas" ref={wrapperRef} />
    </div>
  );
}
