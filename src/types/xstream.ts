export type Face = "character" | "author" | "designer";
export type Theme = "dark" | "light" | "cyber" | "soft";
export type Layout = "single" | "double" | "triple" | "auto";

export interface User {
  id: string;
  name: string;
  avatar?: string;
  color: string;
}

export interface VapourEntry {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
  isSelf?: boolean;
}

export interface LiquidCard {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
  isExpanded?: boolean;
}

export interface SolidBlock {
  id: string;
  title?: string;
  content: string;
  timestamp: number;
}

export interface Column {
  id: string;
  face: Face;
  frame: string;
  character?: string;
  solidBlocks: SolidBlock[];
  liquidCards: LiquidCard[];
  vapourEntries: VapourEntry[];
  stateCode: string;
  background?: string;
}

export interface AppState {
  theme: Theme;
  layout: Layout;
  showPresence: boolean;
  showVapourOthers: boolean;
  showDirectory: boolean;
  columns: Column[];
  presenceCount: number;
}
