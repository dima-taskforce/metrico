export type ObjectType = 'APARTMENT' | 'STUDIO' | 'APARTMENTS' | 'HOUSE';
export type ProjectStatus = 'DRAFT' | 'COMPLETED';
export type RoomType = 'KITCHEN' | 'BEDROOM' | 'BATHROOM' | 'CORRIDOR' | 'BALCONY' | 'STORAGE' | 'LIVING' | 'OTHER';
export type RoomShape = 'RECTANGLE' | 'L_SHAPE' | 'U_SHAPE' | 'CUSTOM';
export type WallMaterial = 'CONCRETE' | 'DRYWALL' | 'BRICK' | 'OTHER';
export type WallType = 'EXTERNAL' | 'INTERNAL' | 'ADJACENT';
export type SegmentType = 'PLAIN' | 'WINDOW' | 'DOOR' | 'PROTRUSION' | 'NICHE' | 'PARTITION';
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
  depth: number | null;
  sortOrder: number;
  windowOpeningId: string | null;
  doorOpeningId: string | null;
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

export interface ApiError {
  message: string;
  statusCode: number;
}
