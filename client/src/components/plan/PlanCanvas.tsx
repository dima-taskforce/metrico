import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Group, Rect, Text, Circle } from 'react-konva';
import Konva from 'konva';
import type { FloorPlanRoom, FloorPlanWall } from '../../types/api';
import type { KonvaEventObject } from 'konva/lib/Node';

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

  // Simple polygon from room perimeter (approximation)
  const polygonPoints = [
    0, 0,
    300, 0,
    300, 200,
    0, 200,
  ];

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
      {/* Room background */}
      <Rect
        width={300}
        height={200}
        fill={getColorForRoom(index)}
        stroke={isSelected ? '#0066cc' : '#999'}
        strokeWidth={isSelected ? 3 : 1}
        cornerRadius={4}
      />

      {/* Room label */}
      <Text
        x={10}
        y={10}
        text={room.label}
        fontSize={16}
        fontFamily="Arial"
        fontStyle="bold"
        fill={isSelected ? '#0066cc' : '#333'}
      />

      {/* Perimeter info */}
      <Text
        x={10}
        y={35}
        text={`${(room.perimeter / 1000).toFixed(2)} м`}
        fontSize={12}
        fontFamily="Arial"
        fill="#666"
      />

      {/* Selection indicator */}
      {isSelected && (
        <>
          {/* Corner handles for rotation */}
          <Circle x={300} y={200} radius={6} fill="#0066cc" />
          <Circle x={0} y={0} radius={6} fill="#0066cc" />
        </>
      )}

      {/* Wall labels */}
      {room.walls.map((wall, idx) => {
        let labelX = 150;
        let labelY = -20;

        if (idx === 1) {
          labelX = 320;
          labelY = 100;
        } else if (idx === 2) {
          labelX = 150;
          labelY = 220;
        } else if (idx === 3) {
          labelX = -40;
          labelY = 100;
        }

        return (
          <Text
            key={wall.id}
            x={labelX}
            y={labelY}
            text={wall.label}
            fontSize={10}
            fontFamily="Arial"
            fill="#666"
            dataId={wall.id}
          />
        );
      })}
    </Group>
  );
}

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

    stage.on('contentTouchMove', handleTouchMove as any);
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
