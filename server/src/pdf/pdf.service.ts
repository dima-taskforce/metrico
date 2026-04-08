import { Injectable, NotFoundException } from '@nestjs/common';
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
  Svg,
  Rect as PdfRect,
  G,
} from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import { PrismaService } from '../prisma/prisma.service';
import { PlanService } from '../plan/plan.service';
import type { GetPlanDto, FloorPlanRoom, FloorPlanWall } from '../plan/dto/get-plan.dto';

const s = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
  },
  watermark: {
    position: 'absolute',
    bottom: 16,
    right: 24,
    fontSize: 7,
    color: '#cccccc',
  },
  // Title page
  titlePage: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  titleMain: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  titleSub: {
    fontSize: 14,
    color: '#555555',
    marginBottom: 8,
    textAlign: 'center',
  },
  titleDate: {
    fontSize: 10,
    color: '#888888',
    marginTop: 32,
    textAlign: 'center',
  },
  // Section headings
  h1: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginBottom: 12 },
  h2: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 8, marginTop: 12 },
  // Table
  table: { width: '100%', marginBottom: 8 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f4f8',
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  cell: { flex: 1, fontSize: 9 },
  cellBold: { flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold' },
  // Stats block
  statRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  statLabel: { width: 160, fontSize: 9, color: '#555555' },
  statValue: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  // Legend
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  legendLabel: { fontSize: 9, marginLeft: 8 },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginVertical: 10,
  },
});

function Watermark(): React.ReactElement {
  return React.createElement(Text, { style: s.watermark }, 'Metrico MVP');
}

// ── Floor plan SVG thumbnail ──────────────────────────────────────────────────

function FloorPlanSvg({ rooms, positions }: {
  rooms: FloorPlanRoom[];
  positions: Record<string, { x: number; y: number }>;
}): React.ReactElement {
  const SVG_W = 400;
  const SVG_H = 280;
  const SCALE = 0.06; // mm→SVG px

  const elements = rooms.map((room, i) => {
    const pos = positions[room.id] ?? { x: i * 50 + 10, y: 10 };
    const w1 = room.walls[0]?.length ?? 3000;
    const w2 = room.walls[1]?.length ?? 2000;
    const rw = Math.max(30, w1 * SCALE);
    const rh = Math.max(20, w2 * SCALE);
    const rx = Math.min(pos.x * SCALE, SVG_W - rw - 5);
    const ry = Math.min(pos.y * SCALE, SVG_H - rh - 15);

    return React.createElement(
      G,
      { key: room.id },
      React.createElement(PdfRect, {
        x: rx, y: ry, width: rw, height: rh,
        fill: '#e8f4f8', stroke: '#6b7280', strokeWidth: 0.75,
      }),
      React.createElement(Text, {
        style: { fontSize: 5, position: 'absolute', left: rx + 2, top: ry + 2 },
      }, room.label.slice(0, 10)),
    );
  });

  return React.createElement(
    Svg,
    { width: SVG_W, height: SVG_H },
    ...elements,
  );
}

// ── Table helpers ─────────────────────────────────────────────────────────────

function TableHeader({ cols }: { cols: string[] }): React.ReactElement {
  return React.createElement(
    View,
    { style: s.tableHeader },
    ...cols.map((c) => React.createElement(Text, { key: c, style: s.cellBold }, c)),
  );
}

function TableRow({ cells }: { cells: string[] }): React.ReactElement {
  return React.createElement(
    View,
    { style: s.tableRow },
    ...cells.map((c, i) => React.createElement(Text, { key: i, style: s.cell }, c)),
  );
}

// ── Room page ─────────────────────────────────────────────────────────────────

function roomStats(room: FloorPlanRoom): React.ReactElement[] {
  const area = room.area != null ? (room.area / 1e6).toFixed(2) + ' м²' : '—';
  const perim = (room.perimeter / 1000).toFixed(2) + ' м';
  const vol = room.volume != null ? (room.volume / 1e9).toFixed(2) + ' м³' : '—';
  const h = room.ceilingHeight != null ? room.ceilingHeight.toFixed(2) + ' м' : '—';

  return [
    ['Площадь', area],
    ['Периметр', perim],
    ['Объём', vol],
    ['Высота потолка', h],
  ].map(([label, value]) =>
    React.createElement(
      View,
      { key: label, style: s.statRow },
      React.createElement(Text, { style: s.statLabel }, label + ':'),
      React.createElement(Text, { style: s.statValue }, value),
    ),
  );
}

function wallsTable(walls: FloorPlanWall[]): React.ReactElement {
  const rows = walls.map((w) =>
    React.createElement(TableRow, {
      key: w.id,
      cells: [
        w.label,
        (w.length / 1000).toFixed(2),
        w.material,
        w.wallType,
        w.openings.map((o) => `${o.type} ${(o.width / 1000).toFixed(2)}м`).join(', ') || '—',
      ],
    }),
  );

  return React.createElement(
    View,
    { style: s.table },
    React.createElement(Text, { style: s.h2 }, 'Стены'),
    React.createElement(TableHeader, { cols: ['Стена', 'Длина (м)', 'Материал', 'Тип', 'Проёмы'] }),
    ...rows,
  );
}

function elementsTable(room: FloorPlanRoom): React.ReactElement | null {
  if (room.elements.length === 0) return null;

  const rows = room.elements.map((el) =>
    React.createElement(TableRow, {
      key: el.id,
      cells: [el.label, el.elementType, `${el.x}/${el.y} мм`],
    }),
  );

  return React.createElement(
    View,
    { style: s.table },
    React.createElement(Text, { style: s.h2 }, 'Элементы'),
    React.createElement(TableHeader, { cols: ['Название', 'Тип', 'Позиция (x/y)'] }),
    ...rows,
  );
}

function RoomPage({ room }: { room: FloorPlanRoom }): React.ReactElement {
  const elemTable = elementsTable(room);
  const children: React.ReactElement[] = [
    React.createElement(Text, { key: 'h1', style: s.h1 }, room.label),
    React.createElement(View, { key: 'div', style: s.divider }),
    ...roomStats(room),
    wallsTable(room.walls),
  ];

  if (elemTable) children.push(elemTable);
  children.push(React.createElement(Watermark, { key: 'wm' }));

  return React.createElement(Page, { size: 'A4', style: s.page }, ...children);
}

// ── Summary page ──────────────────────────────────────────────────────────────

function SummaryPage({ plan }: { plan: GetPlanDto }): React.ReactElement {
  const totalArea = plan.rooms.reduce((sum, r) => sum + (r.area ?? 0), 0);
  const totalAreaM2 = (totalArea / 1e6).toFixed(2);

  const rows = plan.rooms.map((r) =>
    React.createElement(TableRow, {
      key: r.id,
      cells: [
        r.label,
        r.area != null ? (r.area / 1e6).toFixed(2) : '—',
        (r.perimeter / 1000).toFixed(2),
        r.ceilingHeight != null ? r.ceilingHeight.toFixed(2) : '—',
        String(r.walls.length),
      ],
    }),
  );

  return React.createElement(
    Page,
    { size: 'A4', style: s.page },
    React.createElement(Text, { style: s.h1 }, 'Итоги'),
    React.createElement(
      View,
      { style: s.statRow },
      React.createElement(Text, { style: s.statLabel }, 'Общая площадь:'),
      React.createElement(Text, { style: s.statValue }, totalAreaM2 + ' м²'),
    ),
    React.createElement(
      View,
      { style: s.statRow },
      React.createElement(Text, { style: s.statLabel }, 'Помещений:'),
      React.createElement(Text, { style: s.statValue }, String(plan.rooms.length)),
    ),
    React.createElement(View, { style: s.divider }),
    React.createElement(Text, { style: s.h2 }, 'Сводная таблица помещений'),
    React.createElement(View, { style: s.table },
      React.createElement(TableHeader, { cols: ['Помещение', 'Площадь (м²)', 'Периметр (м)', 'Высота (м)', 'Стен'] }),
      ...rows,
    ),
    React.createElement(Watermark),
  );
}

// ── Legend page ───────────────────────────────────────────────────────────────

function LegendPage(): React.ReactElement {
  const items = [
    'Электрощит — прямоугольник с крестиком (X)',
    'Слаботочный щит — прямоугольник с горизонтальными линиями',
    'Радиатор — прямоугольник с гребёнкой',
    'Вент-шахта — прямоугольник со штриховкой',
    'Труба/стояк — круг с буквой D',
    'Колонна — закрашенный квадрат',
    'Дверной проём — дуга открывания',
    'Оконный проём — двойная линия на стене',
  ];

  return React.createElement(
    Page,
    { size: 'A4', style: s.page },
    React.createElement(Text, { style: s.h1 }, 'Условные обозначения'),
    React.createElement(View, { style: s.divider }),
    ...items.map((item) =>
      React.createElement(
        View,
        { key: item, style: s.legendRow },
        React.createElement(Text, { style: s.legendLabel }, '•  ' + item),
      ),
    ),
    React.createElement(Watermark),
  );
}

// ── Main document ─────────────────────────────────────────────────────────────

function PlanDocument({ plan, projectName, projectAddress }: {
  plan: GetPlanDto;
  projectName: string;
  projectAddress: string | null;
}): React.ReactElement {
  const dateStr = new Date().toLocaleDateString('ru-RU', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  // Simple auto-positions for SVG thumbnail
  const positions: Record<string, { x: number; y: number }> = {};
  plan.rooms.forEach((r, i) => {
    positions[r.id] = { x: (i % 3) * 1600 + 200, y: Math.floor(i / 3) * 1200 + 200 };
  });

  const titlePage = React.createElement(
    Page,
    { size: 'A4', style: { ...s.page, justifyContent: 'center', alignItems: 'center' } },
    React.createElement(Text, { style: s.titleMain }, 'Обмерный план'),
    React.createElement(Text, { style: s.titleSub }, projectName),
    projectAddress
      ? React.createElement(Text, { style: { ...s.titleSub, fontSize: 12 } }, projectAddress)
      : null,
    React.createElement(Text, { style: s.titleDate }, 'Дата: ' + dateStr),
    React.createElement(Watermark),
  );

  const schemaPage = React.createElement(
    Page,
    { size: 'A4', style: s.page },
    React.createElement(Text, { style: s.h1 }, 'Схема квартиры'),
    React.createElement(FloorPlanSvg, { rooms: plan.rooms, positions }),
    React.createElement(Watermark),
  );

  const roomPages = plan.rooms.map((room) =>
    React.createElement(RoomPage, { key: room.id, room }),
  );

  return React.createElement(
    Document,
    { title: 'Обмерный план — ' + projectName, author: 'Metrico MVP' },
    titlePage,
    schemaPage,
    React.createElement(LegendPage),
    ...roomPages,
    React.createElement(SummaryPage, { plan }),
  );
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class PdfGeneratorService {
  constructor(
    private prisma: PrismaService,
    private planService: PlanService,
  ) {}

  async generateProjectPdf(projectId: string): Promise<Buffer> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, address: true },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const plan = await this.planService.getFloorPlan(projectId);

    const doc = React.createElement(PlanDocument, {
      plan,
      projectName: project.name,
      projectAddress: project.address ?? null,
    });

    const buffer = await renderToBuffer(doc as React.ReactElement<DocumentProps>);
    return Buffer.from(buffer);
  }
}
