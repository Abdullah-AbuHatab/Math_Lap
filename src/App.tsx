import React, { useState } from "react";
import Shell, { AlgebraMode, BaseTenMode } from "./components/layout/Shell";
import AlgebraTiles from "./components/tools/AlgebraTiles/AlgebraTiles";
import BaseTenBlocks from "./components/tools/BaseTenBlocks/BaseTenBlocks";
import Clock from "./components/tools/Clock/Clock";
import ColorTiles from "./components/tools/ColorTiles/ColorTiles";
import { ToolType } from "./types";

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolType>("algebra-tiles");
  const [interactionMode, setInteractionMode] = useState<
    "select" | "pen" | "eraser"
  >("select");
  const [clearTrigger, setClearTrigger] = useState(0);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [algebraMode, setAlgebraMode] = useState<AlgebraMode>("basic");
  const [baseTenMode, setBaseTenMode] = useState<BaseTenMode>("basic");

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 0.5));
  const handleZoomReset = () => setZoom(1);

  const sharedProps = { interactionMode, clearTrigger, resetTrigger, zoom };

  return (
    <Shell
      activeTool={activeTool}
      onToolChange={setActiveTool}
      interactionMode={interactionMode}
      onInteractionModeChange={setInteractionMode}
      onClearCanvas={() => setClearTrigger((p) => p + 1)}
      onReset={() => {
        setResetTrigger((p) => p + 1);
        setClearTrigger((p) => p + 1);
        setZoom(1);
      }}
      onZoomIn={handleZoomIn}
      onZoomOut={handleZoomOut}
      onZoomReset={handleZoomReset}
      algebraMode={algebraMode}
      onAlgebraModeChange={setAlgebraMode}
      baseTenMode={baseTenMode}
      onBaseTenModeChange={setBaseTenMode}
    >
      {activeTool === "algebra-tiles" && (
        <AlgebraTiles {...sharedProps} mode={algebraMode} />
      )}
      {activeTool === "base-ten-blocks" && (
        <BaseTenBlocks {...sharedProps} mode={baseTenMode} />
      )}
      {activeTool === "clock" && <Clock {...sharedProps} />}
      {activeTool === "color-tiles" && <ColorTiles {...sharedProps} />}
    </Shell>
  );
}
