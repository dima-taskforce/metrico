import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Group, Rect, Text, Circle, Line, Arc, Shape } from 'react-konva';
import Konva from 'konva';
import type { FloorPlanRoom, FloorPlanWall, FloorPlanElement, FloorPlanSegment } from '../../types/api';
import type { KonvaEventObject } from 'konva/lib/Node';

/** 1 pixel = 10 mm at scale=1 */
export const MM_TO_PX = 0.1;

/** Minimum rendered room dimensions in pixels */
const MIN_W = 80;
const MIN_H = 60;

interface RoomCanvasProps {
  rooms: FloorPlanRoom[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  roomPositions: Record<string, { x: number; y: number; rotation: number }>;
  onUpdateRoomPosition: (
    roomId: string,
    position: { x: number; y: number; rotation: number }
  ) => void;
  scale: number;
  onScaleChange: (scale: number) => void;
}

const ROOM_COLORS = [
  '#E8F4F8', '#F0E8F8', '#F8F4E8', '#E8F8F0',
  '#F8E8E8', '#E8F8E8', '#F8F0E8', '#E8E8F8',
];

function getColorForRoom(index: number): string {
  return ROOM_COLORS[index % ROOM_COLORS.length] ?? '#E8F4F8';
}

/** Compute room rect dimensions in px from walls */
export function computeRoomDimensions(walls: FloorPlanWall[]): { w: number; h: number } {
  if (walls.length === 0) return { w: 200, h: 150 };
  const w = Math.max(MIN_W, Math.round((walls[0]?.length ?? 2000) * MM_TO_PX));
  const h = Math.max(MIN_H, Math.round((walls[1]?.length ?? 1500) * MM_TO_PX));
  return { w, h };
}

/**
 * Compute cumulative segment start offsets along a wall (in px).
 * Returns array of length segments.length + 1 (start offsets + end).
 */
export function computeSegmentOffsets(segments: FloorPlanSegment[]): number[] {
  const offsets: number[] = [0];
  for (const seg of segments) {
    offsets.push(offsets[offsets.length - 1]! + seg.length * MM_TO_PX);
  }
  return offsets;
}

// ──────────────────────────────────────────────────────────────────────────────
// Segment rendering on walls
// ──────────────────────────────────────────────────────────────────────────────

interface WallSegmentsProps {
  wall: FloorPlanWall;
  wallIndex: number;
  roomW: number;
  roomH: number;
}

/**
 * Renders visual markers for wall segments (door arc, window double line).
 * Walls are laid out clockwise:
 *   0 = top (left→right, y=0)
 *   1 = right (top→bottom, x=w)
 *   2 = bottom (right→left, y=h)
 *   3 = left (bottom→top, x=0)
 */
function WallSegments({ wall, wallIndex, roomW, roomH }: WallSegmentsProps) {
  const offsets = computeSegmentOffsets(wall.segments);
  const isHorizontal = wallIndex % 2 === 0;
  const wallLen = wall.length * MM_TO_PX;

  return (
    <>
      {wall.segments.map((seg, i) => {
        const startOffset = offsets[i] ?? 0;
        const endOffset = offsets[i + 1] ?? 0;
        const segLenPx = endOffset - startOffset;
        const midOffset = startOffset + segLenPx / 2;

        // Map wall index to actual coordinates
        const getCoords = (offset: number) => {
          switch (wallIndex % 4) {
            case 0: return { x: offset, y: 0 };
            case 1: return { x: roomW, y: offset };
            case 2: return { x: roomW - offset, y: roomH };
            case 3: return { x: 0, y: roomH - offset };
            default: return { x: 0, y: 0 };
          }
        };

        const start = getCoords(startOffset);
        const end = getCoords(endOffset);
        const mid = getCoords(midOffset);

        if (seg.segmentType === 'WINDOW') {
          // Double line indicator — two parallel lines across the opening
          const OFFSET = isHorizontal ? { dx: 0, dy: -4 } : { dx: 4, dy: 0 };
          const OFFSET2 = isHorizontal ? { dx: 0, dy: -8 } : { dx: 8, dy: 0 };
          return (
            <Group key={seg.id}>
              <Line
                points={[
                  start.x + OFFSET.dx, start.y + OFFSET.dy,
                  end.x + OFFSET.dx, end.y + OFFSET.dy,
                ]}
                stroke="#3b82f6"
                strokeWidth={1.5}
              />
              <Line
                points={[
                  start.x + OFFSET2.dx, start.y + OFFSET2.dy,
                  end.x + OFFSET2.dx, end.y + OFFSET2.dy,
                ]}
                stroke="#3b82f6"
                strokeWidth={1.5}
              />
            </Group>
          );
        }

        if (seg.segmentType === 'DOOR') {
          // Dashed opening line + arc sweep indicator
          const arcRadius = segLenPx;
          const hingeX = start.x;
          const hingeY = start.y;
          const angleDeg = isHorizontal
            ? (wallIndex === 0 ? -90 : 90)
            : (wallIndex === 1 ? 0 : 180);

          return (
            <Group key={seg.id}>
              {/* Opening width dashed line */}
              <Line
                points={[start.x, start.y, end.x, end.y]}
                stroke="#6b7280"
                strokeWidth={1}
                dash={[3, 2]}
              />
              {/* Door leaf arc */}
              <Arc
                x={hingeX}
                y={hingeY}
                innerRadius={0}
                outerRadius={arcRadius}
                angle={90}
                rotation={angleDeg}
                stroke="#374151"
                strokeWidth={1}
                fill="transparent"
              />
              {/* Door leaf line */}
              <Line
                points={[
                  hingeX, hingeY,
                  hingeX + (isHorizontal ? 0 : arcRadius * Math.cos((angleDeg * Math.PI) / 180)),
                  hingeY + (isHorizontal ? arcRadius * (wallIndex === 0 ? -1 : 1) : 0),
                ]}
                stroke="#374151"
                strokeWidth={1.5}
              />
            </Group>
          );
        }

        // PROTRUSION / NICHE — subtle marker
        if (seg.segmentType === 'PROTRUSION' || seg.segmentType === 'NICHE') {
          const sign = seg.segmentType === 'PROTRUSION' ? -1 : 1;
          const depthPx = (seg as FloorPlanSegment & { depth?: number }).depth
            ? ((seg as FloorPlanSegment & { depth?: number }).depth ?? 0) * MM_TO_PX
            : 6;
          return (
            <Group key={seg.id}>
              <Line
                points={isHorizontal
                  ? [start.x, start.y, start.x, start.y + sign * depthPx, end.x, end.y + sign * depthPx, end.x, end.y]
                  : [start.x, start.y, start.x + sign * depthPx, start.y, end.x + sign * depthPx, end.y, end.x, end.y]
                }
                stroke="#9ca3af"
                strokeWidth={1}
              />
            </Group>
          );
        }

        // Avoid unused vars warning
        void mid;
        void wallLen;
        return null;
      })}
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Element rendering
// ──────────────────────────────────────────────────────────────────────────────

interface ElementIconProps {
  element: FloorPlanElement;
  roomW: number;
  roomH: number;
}

/**
 * Renders a single floor-plan element icon at its (x, y) position (in mm).
 */
function ElementIcon({ element, roomW, roomH }: ElementIconProps) {
  const px = Math.min(element.x * MM_TO_PX, roomW);
  const py = Math.min(element.y * MM_TO_PX, roomH);
  const SIZE = 14;

  switch (element.elementType) {
    case 'COLUMN':
      return (
        <Group x={px} y={py}>
          <Rect
            x={-SIZE / 2} y={-SIZE / 2}
            width={SIZE} height={SIZE}
            fill="#94a3b8"
            stroke="#475569"
            strokeWidth={1}
          />
        </Group>
      );

    case 'VENT_SHAFT':
      // Hatched square
      return (
        <Group x={px} y={py}>
          <Rect
            x={-SIZE / 2} y={-SIZE / 2}
            width={SIZE} height={SIZE}
            fill="white"
            stroke="#6b7280"
            strokeWidth={1}
          />
          <Shape
            sceneFunc={(ctx, shape) => {
              ctx.beginPath();
              for (let i = -SIZE; i <= SIZE; i += 4) {
                ctx.moveTo(-SIZE / 2 + i, -SIZE / 2);
                ctx.lineTo(-SIZE / 2 + i + SIZE, SIZE / 2);
              }
              ctx.strokeShape(shape);
            }}
            stroke="#6b7280"
            strokeWidth={0.75}
            listening={false}
          />
        </Group>
      );

    case 'RADIATOR':
      // Horizontal lines (grill)
      return (
        <Group x={px} y={py}>
          <Rect
            x={-SIZE / 2} y={-SIZE / 4}
            width={SIZE} height={SIZE / 2}
            fill="white"
            stroke="#6b7280"
            strokeWidth={1}
          />
          {[-2, 0, 2].map((offset) => (
            <Line
              key={offset}
              points={[-SIZE / 2 + 2, offset, SIZE / 2 - 2, offset]}
              stroke="#6b7280"
              strokeWidth={0.75}
            />
          ))}
        </Group>
      );

    case 'ELECTRICAL_PANEL':
      // Square with X
      return (
        <Group x={px} y={py}>
          <Rect
            x={-SIZE / 2} y={-SIZE / 2}
            width={SIZE} height={SIZE}
            fill="white"
            stroke="#374151"
            strokeWidth={1}
          />
          <Line points={[-SIZE / 2, -SIZE / 2, SIZE / 2, SIZE / 2]} stroke="#374151" strokeWidth={1} />
          <Line points={[SIZE / 2, -SIZE / 2, -SIZE / 2, SIZE / 2]} stroke="#374151" strokeWidth={1} />
        </Group>
      );

    case 'LOW_VOLTAGE_PANEL':
      // Square with horizontal lines
      return (
        <Group x={px} y={py}>
          <Rect
            x={-SIZE / 2} y={-SIZE / 2}
            width={SIZE} height={SIZE}
            fill="white"
            stroke="#374151"
            strokeWidth={1}
          />
          {[-4, 0, 4].map((offset) => (
            <Line
              key={offset}
              points={[-SIZE / 2 + 2, offset, SIZE / 2 - 2, offset]}
              stroke="#374151"
              strokeWidth={1}
            />
          ))}
        </Group>
      );

    case 'PIPE':
      // Circle with D label
      return (
        <Group x={px} y={py}>
          <Circle radius={SIZE / 2} fill="white" stroke="#374151" strokeWidth={1} />
          <Text
            text="D"
            x={-SIZE / 4}
            y={-SIZE / 4}
            fontSize={7}
            fill="#374151"
            fontFamily="Arial"
          />
        </Group>
      );

    default:
      return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Dimension line component
// ──────────────────────────────────────────────────────────────────────────────

interface DimLineProps {
  x1: number; y1: number;
  x2: number; y2: number;
  label: string;
  offset?: number; // pixels away from wall
  horizontal?: boolean;
}

/** Professional dimension line with tick marks */
function DimLine({ x1, y1, x2, y2, label, offset = -18, horizontal = true }: DimLineProps) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const ox = horizontal ? 0 : offset;
  const oy = horizontal ? offset : 0;

  return (
    <Group>
      {/* Extension lines */}
      <Line points={[x1, y1, x1 + ox, y1 + oy]} stroke="#374151" strokeWidth={0.5} />
      <Line points={[x2, y2, x2 + ox, y2 + oy]} stroke="#374151" strokeWidth={0.5} />
      {/* Dimension line */}
      <Line
        points={[x1 + ox, y1 + oy, x2 + ox, y2 + oy]}
        stroke="#374151"
        strokeWidth={0.5}
      />
      {/* Tick marks at ends */}
      <Line
        points={horizontal
          ? [x1 + ox - 3, y1 + oy - 3, x1 + ox + 3, y1 + oy + 3]
          : [x1 + ox - 3, y1 + oy - 3, x1 + ox + 3, y1 + oy + 3]}
        stroke="#374151"
        strokeWidth={1}
      />
      <Line
        points={horizontal
          ? [x2 + ox - 3, y2 + oy - 3, x2 + ox + 3, y2 + oy + 3]
          : [x2 + ox - 3, y2 + oy - 3, x2 + ox + 3, y2 + oy + 3]}
        stroke="#374151"
        strokeWidth={1}
      />
      {/* Dimension label */}
      <Text
        x={mx + ox - 20}
        y={my + oy - 7}
        text={label}
        fontSize={9}
        fontFamily="Arial"
        fill="#1e3a5f"
        width={40}
        align="center"
      />
    </Group>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Room group — main renderable unit
// ──────────────────────────────────────────────────────────────────────────────

interface RoomGroupProps {
  room: FloorPlanRoom;
  index: number;
  position: { x: number; y: number; rotation: number };
  isSelected: boolean;
  onSelect: (roomId: string) => void;
  onPositionChange: (pos: { x: number; y: number; rotation: number }) => void;
}

function RoomGroup({
  room,
  index,
  position,
  isSelected,
  onSelect,
  onPositionChange,
}: RoomGroupProps) {
  const groupRef = useRef<Konva.Group>(null);
  const isDragging = useRef(false);

  const { w, h } = computeRoomDimensions(room.walls);

  const handleDragStart = () => {
    isDragging.current = true;
    onSelect(room.id);
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    isDragging.current = false;
    onPositionChange({
      x: e.target.x(),
      y: e.target.y(),
      rotation: position.rotation,
    });
  };

  const handleClick = () => {
    onSelect(room.id);
  };

  // Dimension labels in meters
  const wallLabels = room.walls.slice(0, 4).map((wall) =>
    (wall.length / 1000).toFixed(2) + ' м'
  );

  return (
    <Group
      ref={groupRef}
      x={position.x}
      y={position.y}
      rotation={position.rotation}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTap={handleClick}
    >
      {/* Room fill */}
      <Rect
        width={w}
        height={h}
        fill={getColorForRoom(index)}
        stroke={isSelected ? '#1d4ed8' : '#6b7280'}
        strokeWidth={isSelected ? 2 : 1.5}
      />

      {/* Room label */}
      <Text
        x={8}
        y={8}
        text={room.label}
        fontSize={12}
        fontFamily="Arial"
        fontStyle="bold"
        fill={isSelected ? '#1d4ed8' : '#1f2937'}
      />

      {/* Area label */}
      {room.area != null && (
        <Text
          x={8}
          y={24}
          text={`${room.area.toFixed(1)} м²`}
          fontSize={9}
          fontFamily="Arial"
          fill="#6b7280"
        />
      )}

      {/* Wall segments overlay */}
      {room.walls.slice(0, 4).map((wall, wallIdx) => (
        <WallSegments
          key={wall.id}
          wall={wall}
          wallIndex={wallIdx}
          roomW={w}
          roomH={h}
        />
      ))}

      {/* Room elements */}
      {room.elements.map((el) => (
        <ElementIcon key={el.id} element={el} roomW={w} roomH={h} />
      ))}

      {/* Selection handles */}
      {isSelected && (
        <>
          <Circle x={w} y={h} radius={5} fill="#1d4ed8" />
          <Circle x={0} y={0} radius={5} fill="#1d4ed8" />
        </>
      )}

      {/* ── Dimension lines (professional style) ── */}

      {/* Top wall dimension */}
      {room.walls[0] && (
        <DimLine
          x1={0} y1={0} x2={w} y2={0}
          label={wallLabels[0] ?? ''}
          offset={-18}
          horizontal
        />
      )}

      {/* Right wall dimension */}
      {room.walls[1] && (
        <DimLine
          x1={w} y1={0} x2={w} y2={h}
          label={wallLabels[1] ?? ''}
          offset={18}
          horizontal={false}
        />
      )}

      {/* Bottom wall dimension */}
      {room.walls[2] && (
        <DimLine
          x1={0} y1={h} x2={w} y2={h}
          label={wallLabels[2] ?? ''}
          offset={18}
          horizontal
        />
      )}

      {/* Left wall dimension */}
      {room.walls[3] && (
        <DimLine
          x1={0} y1={0} x2={0} y2={h}
          label={wallLabels[3] ?? ''}
          offset={-18}
          horizontal={false}
        />
      )}
    </Group>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// PlanCanvas
// ──────────────────────────────────────────────────────────────────────────────

export function PlanCanvas({
  rooms,
  selectedRoomId,
  onSelectRoom,
  roomPositions,
  onUpdateRoomPosition,
  scale,
  onScaleChange,
}: RoomCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Pinch-to-zoom on mobile
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let lastDistance = 0;

    const handleTouchMove = (e: KonvaEventObject<TouchEvent>) => {
      const touches = e.evt.touches;
      if (touches.length !== 2) return;

      const touch1 = touches[0]!;
      const touch2 = touches[1]!;

      const currentDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );

      if (lastDistance === 0) {
        lastDistance = currentDistance;
        return;
      }

      const scaleDelta = currentDistance / lastDistance;
      const newScale = Math.max(0.5, Math.min(3, scale * scaleDelta));

      if (newScale !== scale) {
        onScaleChange(newScale);
      }

      lastDistance = currentDistance;
    };

    const handleTouchEnd = () => {
      lastDistance = 0;
    };

    stage.on('contentTouchMove', handleTouchMove as unknown as (e: KonvaEventObject<TouchEvent>) => void);
    stage.on('contentTouchEnd', handleTouchEnd);

    return () => {
      stage.off('contentTouchMove', handleTouchMove);
      stage.off('contentTouchEnd', handleTouchEnd);
    };
  }, [scale, onScaleChange]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-white border border-gray-200 rounded-lg overflow-hidden"
    >
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={scale}
        scaleY={scale}
        draggable
      >
        <Layer>
          {/* Grid background */}
          {Array.from({ length: 20 }).map((_, i) => (
            <Rect
              key={`h-${i}`}
              x={0}
              y={i * 100}
              width={stageSize.width * 10}
              height={1}
              stroke="#f0f0f0"
              strokeWidth={0.5}
            />
          ))}
          {Array.from({ length: 20 }).map((_, i) => (
            <Rect
              key={`v-${i}`}
              x={i * 100}
              y={0}
              width={1}
              height={stageSize.height * 10}
              stroke="#f0f0f0"
              strokeWidth={0.5}
            />
          ))}

          {/* Rooms */}
          {rooms.map((room, idx) => {
            const pos = roomPositions[room.id] ?? { x: 0, y: 0, rotation: 0 };
            return (
              <RoomGroup
                key={room.id}
                room={room}
                index={idx}
                position={pos}
                isSelected={selectedRoomId === room.id}
                onSelect={onSelectRoom}
                onPositionChange={(newPos) => onUpdateRoomPosition(room.id, newPos)}
              />
            );
          })}
        </Layer>
      </Stage>

      {/* Controls */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          aria-label="Уменьшить"
          className="px-3 py-2 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50"
          onClick={() => onScaleChange(Math.max(0.5, scale - 0.1))}
          title="Уменьшить"
        >
          −
        </button>
        <span className="px-3 py-2 bg-gray-100 text-sm rounded">
          {(scale * 100).toFixed(0)}%
        </span>
        <button
          aria-label="Увеличить"
          className="px-3 py-2 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50"
          onClick={() => onScaleChange(Math.min(3, scale + 0.1))}
          title="Увеличить"
        >
          +
        </button>
      </div>
    </div>
  );
}
