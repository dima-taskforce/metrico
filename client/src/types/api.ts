export type ObjectType = 'APARTMENT' | 'STUDIO' | 'APARTMENTS' | 'HOUSE';
export type ProjectStatus = 'DRAFT' | 'COMPLETED';
export type RoomType = 'KITCHEN' | 'BEDROOM' | 'BATHROOM' | 'CORRIDOR' | 'BALCONY' | 'STORAGE' | 'LIVING' | 'OTHER' | 'KITCHEN_LIVING' | 'LAUNDRY' | 'OFFICE' | 'LIBRARY';
export type RoomShape = 'RECTANGLE' | 'L_SHAPE' | 'U_SHAPE' | 'T_SHAPE' | 'CUSTOM';
export type WallMaterial = 'CONCRETE' | 'DRYWALL' | 'BRICK' | 'OTHER';
export type WallType = 'EXTERNAL' | 'INTERNAL' | 'ADJACENT';
export type SegmentType = 'PLAIN' | 'WINDOW' | 'DOOR' | 'PASSAGE' | 'PROTRUSION' | 'NICHE' | 'PARTITION' | 'STEP';
export type ElementType = 'COLUMN' | 'VENT_SHAFT' | 'RADIATOR' | 'ELECTRICAL_PANEL' | 'LOW_VOLTAGE_PANEL' | 'PIPE';
export type PhotoType = 'OVERVIEW_BEFORE' | 'OVERVIEW_AFTER' | 'DETAIL';

export interface User {
  userId: string;
  email: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  address: string | null;
  objectType: ObjectType;
  defaultCeilingHeight: number | null;
  status: ProjectStatus;
  blueprintPhotoPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  id: string;
  projectId: string;
  name: string;
  type: RoomType;
  shape: RoomShape;
  ceilingHeight1: number | null;
  ceilingHeight2: number | null;
  sortOrder: number;
  isMeasured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Wall {
  id: string;
  roomId: string;
  label: string;
  cornerFrom: string;
  cornerTo: string;
  length: number;
  material: WallMaterial;
  wallType: WallType;
  curvatureBottom: number | null;
  curvatureMiddle: number | null;
  curvatureTop: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface WindowOpening {
  id: string;
  wallId: string;
  width: number;
  height: number;
  sillHeightFromScreed: number;
  revealWidthLeft: number | null;
  revealWidthRight: number | null;
  isFrenchDoor: boolean;
  photoPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DoorOpening {
  id: string;
  wallId: string;
  width: number;
  heightFromScreed: number;
  revealLeft: number | null;
  revealRight: number | null;
  isFrenchDoor: boolean;
  photoPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WallSegment {
  id: string;
  wallId: string;
  segmentType: SegmentType;
  length: number;
  offsetFromPrev: number | null;
  depth: number | null;
  isInner: boolean | null;
  sortOrder: number;
  windowOpeningId: string | null;
  doorOpeningId: string | null;
  leadsToRoomId: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoomElement {
  id: string;
  roomId: string;
  wallId: string | null;
  elementType: ElementType;
  width: number | null;
  height: number | null;
  depth: number | null;
  offsetFromWall: number | null;
  offsetFromFloor: number | null;
  positionX: number | null;
  cornerLabel: string | null;
  description: string | null;
  photoPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Angle {
  id: string;
  roomId: string;
  cornerLabel: string;
  wallAId: string;
  wallBId: string;
  isRightAngle: boolean;
  angleDegrees: number | null;
  photoPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Photo {
  id: string;
  userId: string;
  roomId: string;
  photoType: PhotoType;
  originalPath: string;
  thumbPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ValidateSegmentsResult {
  wallLength: number;
  segmentsSum: number;
  difference: number;
  isValid: boolean;
}

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

export interface FloorPlanSegment {
  id: string;
  label: string;
  length: number;
  segmentType: string;
  leadsToRoomId?: string | null;
}

export interface FloorPlanOpening {
  id: string;
  label: string;
  type: string;
  width: number;
  height: number;
}

export interface FloorPlanWall {
  id: string;
  roomId: string;
  label: string;
  length: number;
  material: string;
  wallType: string;
  sortOrder: number;
  segments: FloorPlanSegment[];
  openings: FloorPlanOpening[];
}

export interface FloorPlanElement {
  id: string;
  label: string;
  elementType: string;
  depth: number;
  x: number;
  y: number;
}

export interface FloorPlanRoom {
  id: string;
  label: string;
  perimeter: number;
  area: number | null;
  volume: number | null;
  ceilingHeight: number | null;
  walls: FloorPlanWall[];
  elements: FloorPlanElement[];
  curvatureMean: number | null;
  curvatureStdDev: number | null;
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

export interface ApiError {
  message: string;
  statusCode: number;
}
