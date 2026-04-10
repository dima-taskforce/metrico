import type { RoomType } from './api';

export interface SketchNode {
  id: string;
  x: number;
  y: number;
}

export interface SketchEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  wallId?: string;
  lengthM?: number;
}

export interface SketchRoom {
  id: string;
  label: string;
  type: RoomType;
  edgeIds: string[];
  nodeIds: string[];
  roomId?: string;
}

export interface SketchData {
  nodes: SketchNode[];
  edges: SketchEdge[];
  rooms: SketchRoom[];
}
