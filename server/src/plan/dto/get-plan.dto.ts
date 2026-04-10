// Assembled floor plan structure returned from GET /api/projects/:id/plan

export interface Point {
  x: number;
  y: number;
}

export interface RoomPlacement {
  roomId: string;
  /** Global x of room local origin, mm */
  x: number;
  /** Global y of room local origin, mm */
  y: number;
  /** Rotation in degrees (CW, screen coords) */
  rotation: number;
  /** Global polygon vertices in mm */
  polygon: Point[];
}

export interface AssemblyError {
  roomId: string;
  message: string;
}

export interface FloorPlanRoom {
  id: string;
  label: string;
  perimeter: number; // mm
  area: number | null; // mm²
  volume: number | null; // mm³
  ceilingHeight: number | null; // metres
  walls: FloorPlanWall[];
  elements: FloorPlanElement[];
  curvatureMean: number | null;
  curvatureStdDev: number | null;
}

export interface FloorPlanWall {
  id: string;
  roomId: string;
  label: string;
  length: number; // mm
  material: string;
  wallType: string;
  sortOrder: number;
  segments: FloorPlanSegment[];
  openings: FloorPlanOpening[];
}

export interface FloorPlanSegment {
  id: string;
  label: string;
  length: number; // metres
  segmentType: string; // PLAIN, WINDOW, DOOR, PASSAGE, PROTRUSION, NICHE, PARTITION
  leadsToRoomId?: string | null;
}

export interface FloorPlanOpening {
  id: string;
  label: string;
  type: string; // WINDOW or DOOR
  width: number; // mm
  height: number; // mm
}

export interface FloorPlanElement {
  id: string;
  label: string;
  elementType: string; // COLUMN, VENT_SHAFT, RADIATOR, ELECTRICAL_PANEL, LOW_VOLTAGE_PANEL, PIPE
  depth: number; // mm
  x: number; // relative to room, mm
  y: number; // relative to room, mm
}

export interface FloorPlanAdjacency {
  id: string;
  wallAId: string;
  wallBId: string;
  wallALabel: string;
  wallBLabel: string;
  hasDoor: boolean;
  doorLabel?: string;
}

export interface GetPlanDto {
  projectId: string;
  projectLabel: string;
  rooms: FloorPlanRoom[];
  adjacencies: FloorPlanAdjacency[];
  generatedAt: Date;
  layoutJson?: string | null;
  placements?: RoomPlacement[];
  assemblyErrors?: AssemblyError[];
}
