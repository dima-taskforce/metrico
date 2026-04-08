export type ObjectType = 'APARTMENT' | 'STUDIO' | 'APARTMENTS' | 'HOUSE';
export type ProjectStatus = 'DRAFT' | 'COMPLETED';
export type RoomType = 'KITCHEN' | 'BEDROOM' | 'BATHROOM' | 'CORRIDOR' | 'BALCONY' | 'STORAGE' | 'LIVING' | 'OTHER';
export type RoomShape = 'RECTANGLE' | 'L_SHAPE' | 'U_SHAPE' | 'CUSTOM';

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

export interface ApiError {
  message: string;
  statusCode: number;
}
