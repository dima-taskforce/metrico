import {
  Armchair,
  Bed,
  CookingPot,
  Shower,
  Door,
  PottedPlant,
  Package,
  House,
} from '@phosphor-icons/react';
import type { RoomType } from '../types/api';

const ICONS: Record<RoomType, React.ElementType> = {
  LIVING: Armchair,
  BEDROOM: Bed,
  KITCHEN: CookingPot,
  BATHROOM: Shower,
  CORRIDOR: Door,
  BALCONY: PottedPlant,
  STORAGE: Package,
  OTHER: House,
};

interface RoomTypeIconProps {
  type: RoomType;
  size?: number;
  className?: string;
}

export function RoomTypeIcon({ type, size = 24, className }: RoomTypeIconProps) {
  const Icon = ICONS[type] ?? House;
  return <Icon size={size} className={className} />;
}
