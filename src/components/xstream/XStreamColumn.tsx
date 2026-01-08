import { useState, useCallback } from "react";
import { Column, Face } from "@/types/xstream";
import { ColumnHeader } from "./ColumnHeader";
import { FilterDrawer } from "./FilterDrawer";
import { SolidZone } from "./SolidZone";
import { LiquidZone } from "./LiquidZone";
import { VapourZone } from "./VapourZone";
import { ZoneSeparator } from "./ZoneSeparator";

interface XStreamColumnProps {
  column: Column;
  presenceCount: number;
  showVapourOthers: boolean;
  showDirectory: boolean;
  onFaceChange: (columnId: string, face: Face) => void;
  onVapourSubmit: (columnId: string, text: string) => void;
  onShowVapourOthersChange: (value: boolean) => void;
  onShowDirectoryChange: (value: boolean) => void;
  onBackgroundChange?: (columnId: string, background: string) => void;
}

export function XStreamColumn({
  column,
  presenceCount,
  showVapourOthers,
  showDirectory,
  onFaceChange,
  onVapourSubmit,
  onShowVapourOthersChange,
  onShowDirectoryChange,
  onBackgroundChange,
}: XStreamColumnProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Zone heights (in pixels)
  const [solidHeight, setSolidHeight] = useState(180);
  const [liquidHeight, setLiquidHeight] = useState(200);
  
  const handleSolidSeparatorDrag = useCallback((delta: number) => {
    setSolidHeight((h) => Math.max(80, Math.min(400, h + delta)));
    setLiquidHeight((h) => Math.max(100, h - delta));
  }, []);
  
  const handleLiquidSeparatorDrag = useCallback((delta: number) => {
    setLiquidHeight((h) => Math.max(100, Math.min(500, h + delta)));
  }, []);

  const handleSubmit = (text: string) => {
    onVapourSubmit(column.id, text);
  };

  const handleBackgroundChange = (background: string) => {
    onBackgroundChange?.(column.id, background);
  };

  const filteredVapourEntries = showVapourOthers 
    ? column.vapourEntries 
    : column.vapourEntries.filter(e => e.isSelf);

  const columnBgStyle: React.CSSProperties | undefined = column.background
    ? ({ ["--xstream-column-bg" as any]: column.background } as React.CSSProperties)
    : undefined;

  return (
    <div
      className="xstream-column flex flex-col h-full border-r border-border/30 last:border-r-0"
      data-face={column.face}
      data-column-bg={column.background ? "true" : "false"}
      style={columnBgStyle}
    >
      <ColumnHeader
        face={column.face}
        frame={column.frame}
        character={column.character}
        stateCode={column.stateCode}
        presenceCount={presenceCount}
        onFaceChange={(face) => onFaceChange(column.id, face)}
        onFilterToggle={() => setFilterOpen(!filterOpen)}
        onDetailsToggle={() => setDetailsOpen(!detailsOpen)}
      />
      
      <FilterDrawer
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        showVapourOthers={showVapourOthers}
        onShowVapourOthersChange={onShowVapourOthersChange}
        showDirectory={showDirectory}
        onShowDirectoryChange={onShowDirectoryChange}
        columnBackground={column.background}
        onBackgroundChange={handleBackgroundChange}
      />
      
      {/* Solid Zone */}
      <SolidZone blocks={column.solidBlocks} height={solidHeight} />
      
      {/* Separator */}
      <ZoneSeparator onDrag={handleSolidSeparatorDrag} />
      
      {/* Liquid Zone */}
      <LiquidZone cards={column.liquidCards} height={liquidHeight} />
      
      {/* Separator */}
      <ZoneSeparator onDrag={handleLiquidSeparatorDrag} />
      
      {/* Vapour Zone - fills remaining space (display only) */}
      <VapourZone
        entries={filteredVapourEntries}
      />
    </div>
  );
}
