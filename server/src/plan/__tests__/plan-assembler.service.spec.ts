import { Test, TestingModule } from '@nestjs/testing';
import { PlanAssemblerService } from '../plan-assembler.service';
import { RoomsCalcService } from '../../rooms/rooms-calc.service';
import type { Room, Wall, Angle, WindowOpening, DoorOpening } from '@prisma/client';

describe('PlanAssemblerService', () => {
  let service: PlanAssemblerService;
  let roomsCalc: RoomsCalcService;

  const makeMockWall = (overrides?: Partial<Wall>): Wall => ({
    id: 'w1',
    label: 'A-B',
    roomId: 'room-1',
    length: 4000,
    sortOrder: 0,
    material: 'CONCRETE',
    wallType: 'EXTERNAL',
    curvatureBottom: null,
    curvatureMiddle: null,
    curvatureTop: null,
    ...overrides,
  });

  const makeMockSegment = (overrides?: any) => ({
    id: 'seg-1',
    label: 'Seg A',
    wallId: 'w1',
    length: 4000,
    sortOrder: 0,
    segmentType: 'PLAIN',
    photoPath: null,
    ...overrides,
  });

  const makeMockWindow = (overrides?: any): WindowOpening => ({
    id: 'win-1',
    label: 'Window 1',
    wallId: 'w1',
    width: 1500,
    height: 1200,
    positionFromLeft: 500,
    photoPath: null,
    ...overrides,
  });

  const makeMockDoor = (overrides?: any): DoorOpening => ({
    id: 'door-1',
    label: 'Door 1',
    wallId: 'w1',
    width: 900,
    heightFromScreed: 2100,
    positionFromLeft: 0,
    photoPath: null,
    ...overrides,
  });

  const makeMockRoom = (overrides?: Partial<Room>): any => ({
    id: 'room-1',
    label: 'Living Room',
    projectId: 'proj-1',
    ceilingHeight: 2.68,
    elements: [],
    walls: [makeMockWall()],
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanAssemblerService,
        {
          provide: RoomsCalcService,
          useValue: {
            compute: jest.fn(() => ({
              perimeter: 12.68,
              area: 10.0,
              volume: 26.8,
              curvatureAvg: 0,
              curvatureDeviation: 0,
            })),
          },
        },
      ],
    }).compile();

    service = module.get<PlanAssemblerService>(PlanAssemblerService);
    roomsCalc = module.get<RoomsCalcService>(RoomsCalcService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('assembleFloorPlan', () => {
    it('should assemble complete floor plan with single room', () => {
      const room = makeMockRoom({
        walls: [
          makeMockWall({
            segments: [makeMockSegment()],
            windows: [makeMockWindow()],
            doors: [makeMockDoor()],
          }) as any,
        ],
      });

      const angles: Angle[] = [];
      const adjacencies = [];

      const result = service.assembleFloorPlan(
        'proj-1',
        'Test Project',
        [room],
        angles,
        adjacencies,
      );

      expect(result.projectId).toBe('proj-1');
      expect(result.projectLabel).toBe('Test Project');
      expect(result.rooms).toHaveLength(1);
      expect(result.adjacencies).toHaveLength(0);
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should assemble multiple rooms', () => {
      const room1 = makeMockRoom({ id: 'room-1', label: 'Room 1' });
      const room2 = makeMockRoom({ id: 'room-2', label: 'Room 2' });

      const result = service.assembleFloorPlan(
        'proj-1',
        'Test Project',
        [room1, room2],
        [],
        [],
      );

      expect(result.rooms).toHaveLength(2);
      expect(result.rooms[0].label).toBe('Room 1');
      expect(result.rooms[1].label).toBe('Room 2');
    });

    it('should assemble adjacencies', () => {
      const room = makeMockRoom();
      const adjacencies = [
        {
          id: 'adj-1',
          wallAId: 'w1',
          wallBId: 'w2',
          hasDoorBetween: true,
          doorOpening: { label: 'Main Door' },
        },
      ];

      const result = service.assembleFloorPlan(
        'proj-1',
        'Test Project',
        [room],
        [],
        adjacencies,
      );

      expect(result.adjacencies).toHaveLength(1);
      expect(result.adjacencies[0].id).toBe('adj-1');
      expect(result.adjacencies[0].hasDoor).toBe(true);
    });
  });

  describe('Room Assembly', () => {
    it('should assemble room with correct stats', () => {
      const room = makeMockRoom();

      const result = service.assembleFloorPlan(
        'proj-1',
        'Test',
        [room],
        [],
        [],
      );

      expect(result.rooms[0].id).toBe('room-1');
      expect(result.rooms[0].label).toBe('Living Room');
      expect(result.rooms[0].perimeter).toBe(12.68);
      expect(result.rooms[0].area).toBe(10.0);
      expect(result.rooms[0].volume).toBe(26.8);
      expect(result.rooms[0].ceilingHeight).toBe(2.68);
    });

    it('should assemble room with angles', () => {
      const room = makeMockRoom();
      const angles: Angle[] = [
        {
          id: 'a1',
          roomId: 'room-1',
          cornerLabel: 'A',
          angle: 90,
          isRightAngle: true,
          photoPath: null,
        },
      ];

      (roomsCalc.compute as jest.Mock).mockReturnValue({
        perimeter: 12.68,
        area: 10.0,
        volume: 26.8,
        curvatureAvg: 0,
        curvatureDeviation: 0,
      });

      const result = service.assembleFloorPlan(
        'proj-1',
        'Test',
        [room],
        angles,
        [],
      );

      expect(roomsCalc.compute).toHaveBeenCalled();
    });

    it('should assemble room without elements', () => {
      const room = makeMockRoom({ elements: [] });

      const result = service.assembleFloorPlan(
        'proj-1',
        'Test',
        [room],
        [],
        [],
      );

      expect(result.rooms[0].elements).toEqual([]);
    });
  });

  describe('Wall Assembly', () => {
    it('should assemble wall with all properties', () => {
      const wall = makeMockWall({
        segments: [] as any,
        windows: [] as any,
        doors: [] as any,
      });
      const room = makeMockRoom({
        walls: [wall],
      });

      const result = service.assembleFloorPlan(
        'proj-1',
        'Test',
        [room],
        [],
        [],
      );

      const assembledWall = result.rooms[0].walls[0];
      expect(assembledWall.id).toBe('w1');
      expect(assembledWall.label).toBe('A-B');
      expect(assembledWall.length).toBe(4000);
      expect(assembledWall.material).toBe('CONCRETE');
      expect(assembledWall.wallType).toBe('EXTERNAL');
    });

    it('should assemble wall with segments', () => {
      const segment = makeMockSegment();
      const wall = makeMockWall({
        segments: [segment] as any,
        windows: [] as any,
        doors: [] as any,
      });
      const room = makeMockRoom({ walls: [wall] });

      const result = service.assembleFloorPlan(
        'proj-1',
        'Test',
        [room],
        [],
        [],
      );

      expect(result.rooms[0].walls[0].segments).toHaveLength(1);
      expect(result.rooms[0].walls[0].segments[0].label).toBe('Seg A');
    });

    it('should assemble wall with windows and doors', () => {
      const window = makeMockWindow();
      const door = makeMockDoor();
      const wall = makeMockWall({
        segments: [] as any,
        windows: [window] as any,
        doors: [door] as any,
      });
      const room = makeMockRoom({ walls: [wall] });

      const result = service.assembleFloorPlan(
        'proj-1',
        'Test',
        [room],
        [],
        [],
      );

      const openings = result.rooms[0].walls[0].openings;
      expect(openings).toHaveLength(2);
      expect(openings[0].type).toBe('WINDOW');
      expect(openings[1].type).toBe('DOOR');
    });
  });

  describe('Opening Assembly', () => {
    it('should assemble windows correctly', () => {
      const window = makeMockWindow({ width: 1500, height: 1200 });
      const wall = makeMockWall({
        segments: [] as any,
        windows: [window] as any,
        doors: [] as any,
      });
      const room = makeMockRoom({ walls: [wall] });

      const result = service.assembleFloorPlan(
        'proj-1',
        'Test',
        [room],
        [],
        [],
      );

      const opening = result.rooms[0].walls[0].openings[0];
      expect(opening.type).toBe('WINDOW');
      expect(opening.width).toBe(1500);
      expect(opening.height).toBe(1200);
    });

    it('should assemble doors correctly', () => {
      const door = makeMockDoor({ width: 900, heightFromScreed: 2100 });
      const wall = makeMockWall({
        segments: [] as any,
        windows: [] as any,
        doors: [door] as any,
      });
      const room = makeMockRoom({ walls: [wall] });

      const result = service.assembleFloorPlan(
        'proj-1',
        'Test',
        [room],
        [],
        [],
      );

      const opening = result.rooms[0].walls[0].openings[0];
      expect(opening.type).toBe('DOOR');
      expect(opening.width).toBe(900);
      expect(opening.height).toBe(2100);
    });

    it('should handle wall with no openings', () => {
      const wall = makeMockWall({
        segments: [] as any,
        windows: [] as any,
        doors: [] as any,
      });
      const room = makeMockRoom({ walls: [wall] });

      const result = service.assembleFloorPlan(
        'proj-1',
        'Test',
        [room],
        [],
        [],
      );

      expect(result.rooms[0].walls[0].openings).toEqual([]);
    });
  });

  describe('Adjacency Assembly', () => {
    it('should resolve wall labels in adjacencies', () => {
      const wall1 = makeMockWall({ id: 'w1', label: 'Wall A-B' });
      const wall2 = makeMockWall({ id: 'w2', label: 'Wall C-D' });
      const room = makeMockRoom({
        walls: [
          { ...wall1, segments: [] as any, windows: [] as any, doors: [] as any },
          { ...wall2, segments: [] as any, windows: [] as any, doors: [] as any },
        ],
      });
      const adjacencies = [
        {
          id: 'adj-1',
          wallAId: 'w1',
          wallBId: 'w2',
          hasDoorBetween: false,
        },
      ];

      const result = service.assembleFloorPlan(
        'proj-1',
        'Test',
        [room],
        [],
        adjacencies,
      );

      expect(result.adjacencies[0].wallALabel).toBe('Wall A-B');
      expect(result.adjacencies[0].wallBLabel).toBe('Wall C-D');
    });

    it('should include door label in adjacency when door exists', () => {
      const room = makeMockRoom();
      const adjacencies = [
        {
          id: 'adj-1',
          wallAId: 'w1',
          wallBId: 'w2',
          hasDoorBetween: true,
          doorOpening: { label: 'Main Entrance' },
        },
      ];

      const result = service.assembleFloorPlan(
        'proj-1',
        'Test',
        [room],
        [],
        adjacencies,
      );

      expect(result.adjacencies[0].doorLabel).toBe('Main Entrance');
    });

    it('should handle adjacency without door', () => {
      const room = makeMockRoom();
      const adjacencies = [
        {
          id: 'adj-1',
          wallAId: 'w1',
          wallBId: 'w2',
          hasDoorBetween: false,
        },
      ];

      const result = service.assembleFloorPlan(
        'proj-1',
        'Test',
        [room],
        [],
        adjacencies,
      );

      expect(result.adjacencies[0].hasDoor).toBe(false);
      expect(result.adjacencies[0].doorLabel).toBeUndefined();
    });
  });
});
