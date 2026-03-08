export type ToolType = 'algebra-tiles' | 'base-ten-blocks' | 'clock' | 'color-tiles';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface ManipulativeItem {
  id: string;
  type: string;
  position: Position;
  rotation: number;
  color: string;
  width?: number;
  height?: number;
  isNegative?: boolean;
  value?: number;
  isLocked?: boolean;
}

export interface WorkspaceState {
  items: ManipulativeItem[];
  zoom: number;
  pan: Position;
}
