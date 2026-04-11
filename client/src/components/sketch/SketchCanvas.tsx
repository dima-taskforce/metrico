import { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Line, Circle, Text, Rect } from 'react-konva';
import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useSketchStore } from '../../stores/sketchStore';
import type { SketchNode, SketchRoom } from '../../types/sketch';
import { RoomLabelForm } from './RoomLabelForm';
import type { RoomType } from '../../types/api';

const GRID_SIZE = 20;
const NODE_RADIUS = 14;
const SNAP_RADIUS = 30;

const ROOM_COLORS = [
  'rgba(99,102,241,0.15)',
  'rgba(16,185,129,0.15)',
  'rgba(245,158,11,0.15)',
  'rgba(239,68,68,0.15)',
  'rgba(59,130,246,0.15)',
  'rgba(236,72,153,0.15)',
];

function getRoomColor(index: number): string {
  return ROOM_COLORS[index % ROOM_COLORS.length] ?? ROOM_COLORS[0]!;
}

function snapToGrid(val: number): number {
  return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function findNearestNode(
  nodes: SketchNode[],
  x: number,
  y: number,
  excludeId?: string,
): SketchNode | null {
  let nearest: SketchNode | null = null;
  let minDist = Infinity;
  for (const node of nodes) {
    if (node.id === excludeId) continue;
    const d = distance(node.x, node.y, x, y);
    if (d < SNAP_RADIUS && d < minDist) {
      minDist = d;
      nearest = node;
    }
  }
  return nearest;
}

/** Compute polygon points for a SketchRoom */
function getRoomPolygon(room: SketchRoom, nodeMap: Map<string, SketchNode>): number[] {
  const pts: number[] = [];
  for (const nid of room.nodeIds) {
    const n = nodeMap.get(nid);
    if (n) { pts.push(n.x, n.y); }
  }
  return pts;
}

/** Compute centroid of a polygon */
function centroid(pts: number[]): { x: number; y: number } {
  let sx = 0, sy = 0;
  const count = pts.length / 2;
  for (let i = 0; i < pts.length; i += 2) {
    sx += pts[i]!;
    sy += pts[i + 1]!;
  }
  return { x: sx / count, y: sy / count };
}

export function SketchCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [size, setSize] = useState({ w: 400, h: 600 });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [pendingRoomEdges, setPendingRoomEdges] = useState<string[]>([]);
  const [showRoomForm, setShowRoomForm] = useState(false);

  const {
    nodes, edges, rooms,
    mode, activeNodeId, selectedNodeId, selectedEdgeId,
    addNode, addEdge, moveNode, removeNode, removeEdge, addRoom,
    setSelectedNodeId, setSelectedEdgeId,
  } = useSketchStore();

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    obs.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => obs.disconnect();
  }, []);

  // Pinch-to-zoom
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let lastDist = 0;

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      const t1 = e.touches[0]!;
      const t2 = e.touches[1]!;
      const d = distance(t1.clientX, t1.clientY, t2.clientX, t2.clientY);
      if (lastDist > 0) {
        const delta = d / lastDist;
        setScale((s) => Math.min(4, Math.max(0.25, s * delta)));
      }
      lastDist = d;
    };
    const onTouchEnd = () => { lastDist = 0; };

    const container = stage.container();
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd);
    return () => {
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  const getStagePos = useCallback((e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const pos = stage.getPointerPosition();
    if (!pos) return { x: 0, y: 0 };
    return {
      x: (pos.x - offset.x) / scale,
      y: (pos.y - offset.y) / scale,
    };
  }, [offset, scale]);

  const handleStageClick = useCallback((e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Only handle clicks on the stage background (not on nodes/edges)
    if (e.target !== e.target.getStage() && e.target.name() !== 'bg') return;

    const { x, y } = getStagePos(e);

    if (mode === 'draw') {
      const nearest = findNearestNode(nodes, x, y);
      if (nearest) {
        // Snap to existing node: connect if chain active, then STOP chain
        if (activeNodeId && activeNodeId !== nearest.id) {
          addEdge({ id: crypto.randomUUID(), fromNodeId: activeNodeId, toNodeId: nearest.id });
        }
        useSketchStore.setState({ activeNodeId: null });
      } else {
        // New node on empty space: continue chain or start new one
        const newNode: SketchNode = {
          id: crypto.randomUUID(),
          x: snapToGrid(x),
          y: snapToGrid(y),
        };
        addNode(newNode);
        if (activeNodeId) {
          addEdge({ id: crypto.randomUUID(), fromNodeId: activeNodeId, toNodeId: newNode.id });
        }
        useSketchStore.setState({ activeNodeId: newNode.id });
      }
    } else if (mode === 'select') {
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    }
  }, [mode, nodes, activeNodeId, addNode, addEdge, getStagePos, setSelectedNodeId, setSelectedEdgeId]);

  const handleNodeClick = useCallback((nodeId: string, e: KonvaEventObject<MouseEvent | TouchEvent | Event>) => {
    e.cancelBubble = true;

    if (mode === 'draw') {
      if (activeNodeId && activeNodeId !== nodeId) {
        // Connect to existing node and STOP chain
        addEdge({ id: crypto.randomUUID(), fromNodeId: activeNodeId, toNodeId: nodeId });
        useSketchStore.setState({ activeNodeId: null });
      } else if (activeNodeId === nodeId) {
        // Click active node again — cancel active, don't start chain
        useSketchStore.setState({ activeNodeId: null });
      } else {
        // No chain active — this node becomes the start
        useSketchStore.setState({ activeNodeId: nodeId });
      }
    } else if (mode === 'select') {
      setSelectedNodeId(nodeId === selectedNodeId ? null : nodeId);
    }
  }, [mode, activeNodeId, addEdge, selectedNodeId, setSelectedNodeId]);

  const handleNodeDragMove = useCallback((nodeId: string, e: KonvaEventObject<DragEvent>) => {
    const pos = e.target.position();
    moveNode(nodeId, pos.x, pos.y);
    e.target.position({ x: snapToGrid(pos.x), y: snapToGrid(pos.y) });
  }, [moveNode]);

  const handleEdgeClick = useCallback((edgeId: string, e: KonvaEventObject<MouseEvent | TouchEvent | Event>) => {
    e.cancelBubble = true;
    if (mode === 'select') {
      setSelectedEdgeId(edgeId === selectedEdgeId ? null : edgeId);
    } else if (mode === 'room') {
      // Add edge to pending room
      setPendingRoomEdges((prev) => {
        if (prev.includes(edgeId)) return prev;
        const next = [...prev, edgeId];

        // Check if closed: last edge connects back to first edge's fromNode
        if (next.length >= 3) {
          const firstEdge = edges.find((ed) => ed.id === next[0]!);
          const lastEdge = edges.find((ed) => ed.id === next[next.length - 1]!);
          if (firstEdge && lastEdge) {
            const firstStart = firstEdge.fromNodeId;
            const lastEnd = lastEdge.toNodeId;
            const lastEndAlt = lastEdge.fromNodeId;
            if (lastEnd === firstStart || lastEndAlt === firstStart) {
              setShowRoomForm(true);
              return next;
            }
          }
        }
        return next;
      });
    }
  }, [mode, selectedEdgeId, setSelectedEdgeId, edges]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedNodeId) removeNode(selectedNodeId);
    if (selectedEdgeId) removeEdge(selectedEdgeId);
  }, [selectedNodeId, selectedEdgeId, removeNode, removeEdge]);

  // Delete on Backspace/Delete key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteSelected();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleDeleteSelected]);

  const handleRoomCreate = useCallback((label: string, type: RoomType) => {
    // Collect ordered nodeIds from edge chain
    const nodeIds: string[] = [];
    for (const eid of pendingRoomEdges) {
      const edge = edges.find((e) => e.id === eid);
      if (edge && !nodeIds.includes(edge.fromNodeId)) nodeIds.push(edge.fromNodeId);
    }
    // Close the loop
    const lastEdge = edges.find((e) => e.id === pendingRoomEdges[pendingRoomEdges.length - 1]!);
    if (lastEdge && !nodeIds.includes(lastEdge.toNodeId)) nodeIds.push(lastEdge.toNodeId);

    addRoom({
      id: crypto.randomUUID(),
      label,
      type,
      edgeIds: [...pendingRoomEdges],
      nodeIds,
    });
    setPendingRoomEdges([]);
    setShowRoomForm(false);
  }, [pendingRoomEdges, edges, addRoom]);

  // Grid lines
  const gridLines: JSX.Element[] = [];
  const gridW = size.w / scale;
  const gridH = size.h / scale;
  for (let x = 0; x < gridW; x += GRID_SIZE) {
    gridLines.push(
      <Line key={`vg${x}`} points={[x, 0, x, gridH]} stroke="#e5e7eb" strokeWidth={0.5} />,
    );
  }
  for (let y = 0; y < gridH; y += GRID_SIZE) {
    gridLines.push(
      <Line key={`hg${y}`} points={[0, y, gridW, y]} stroke="#e5e7eb" strokeWidth={0.5} />,
    );
  }

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const delta = e.evt.deltaY < 0 ? 1.1 : 0.9;
    setScale((s) => Math.min(4, Math.max(0.25, s * delta)));
  };

  const handleStageDragEnd = (e: KonvaEventObject<DragEvent>) => {
    if (e.target === stageRef.current) {
      const pos = stageRef.current!.position();
      setOffset({ x: pos.x, y: pos.y });
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        scaleX={scale}
        scaleY={scale}
        x={offset.x}
        y={offset.y}
        draggable={mode === 'select'}
        onDragEnd={handleStageDragEnd}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onWheel={handleWheel}
      >
        <Layer>
          {/* Background + grid */}
          <Rect
            name="bg"
            x={-offset.x / scale}
            y={-offset.y / scale}
            width={size.w / scale}
            height={size.h / scale}
            fill="white"
          />
          {gridLines}

          {/* Room fills */}
          {rooms.map((room, idx) => {
            const pts = getRoomPolygon(room, nodeMap);
            if (pts.length < 6) return null;
            const c = centroid(pts);
            return (
              <React.Fragment key={room.id}>
                <Line
                  points={pts}
                  closed
                  fill={getRoomColor(idx)}
                  stroke="transparent"
                />
                <Text
                  x={c.x - 40}
                  y={c.y - 10}
                  width={80}
                  text={room.label}
                  fontSize={12}
                  fill="#374151"
                  align="center"
                />
              </React.Fragment>
            );
          })}

          {/* Edges */}
          {edges.map((edge) => {
            const from = nodeMap.get(edge.fromNodeId);
            const to = nodeMap.get(edge.toNodeId);
            if (!from || !to) return null;
            const isSelected = selectedEdgeId === edge.id;
            const isPending = pendingRoomEdges.includes(edge.id);
            return (
              <Line
                key={edge.id}
                points={[from.x, from.y, to.x, to.y]}
                stroke={isSelected ? '#4f46e5' : isPending ? '#f59e0b' : '#1f2937'}
                strokeWidth={isSelected ? 4 : 3}
                hitStrokeWidth={20}
                onClick={(e) => handleEdgeClick(edge.id, e)}
                onTap={(e) => handleEdgeClick(edge.id, e)}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const isActive = activeNodeId === node.id;
            const isSelected = selectedNodeId === node.id;
            return (
              <Circle
                key={node.id}
                x={node.x}
                y={node.y}
                radius={NODE_RADIUS}
                fill={isActive ? '#4f46e5' : isSelected ? '#7c3aed' : '#6366f1'}
                stroke={isActive ? '#312e81' : 'transparent'}
                strokeWidth={isActive ? 2 : 0}
                draggable={mode === 'select'}
                onClick={(e) => handleNodeClick(node.id, e)}
                onTap={(e) => handleNodeClick(node.id, e)}
                onDragMove={(e) => handleNodeDragMove(node.id, e)}
              />
            );
          })}
        </Layer>
      </Stage>

      {/* Room label form */}
      {showRoomForm && (
        <RoomLabelForm
          roomNumber={rooms.length + 1}
          onConfirm={handleRoomCreate}
          onCancel={() => { setPendingRoomEdges([]); setShowRoomForm(false); }}
        />
      )}

      {/* Hint */}
      <div className="absolute bottom-2 left-2 text-xs text-gray-400 pointer-events-none">
        {mode === 'draw' && 'Тапайте углы, проводите стены'}
        {mode === 'select' && 'Перетаскивайте узлы, тапайте для выбора'}
        {mode === 'room' && 'Тапайте рёбра по контуру комнаты'}
      </div>
    </div>
  );
}

// Need React in scope for JSX Fragment
import React from 'react';
