/**
 * S5-07 E2E — Full user journey (11 steps)
 *
 * Steps:
 *  1.  Register new user
 *  2.  Create project
 *  3.  Add 3 rooms
 *  4.  Measure room 0 (walls, window, door, element, segments)
 *  5.  Upload photo (test buffer)
 *  6.  Create adjacency link between rooms
 *  7.  Assemble plan (GET /api/projects/:id/plan)
 *  8.  Verify computed fields (perimeter, area)
 *  9.  Generate PDF (Buffer size > 0)
 * 10.  Duplicate project
 * 11.  Delete original project (cascade)
 *
 * Uses a dedicated SQLite test DB (temp file, cleaned up in afterAll).
 * No mocking — real NestJS application + real Prisma.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execFileSync } from 'child_process';

// Use a temp file for the test database
const TEST_DB_PATH = path.join(os.tmpdir(), `metrico-e2e-${process.pid}.db`);
process.env['DATABASE_URL'] = `file:${TEST_DB_PATH}`;
process.env['JWT_SECRET'] = 'e2e-test-jwt-secret-32chars-padded!!';
process.env['JWT_REFRESH_SECRET'] = 'e2e-test-refresh-secret-32chars!!';
process.env['JWT_ACCESS_EXPIRES_IN'] = '15m';
process.env['JWT_REFRESH_EXPIRES_IN'] = '7d';
process.env['NODE_ENV'] = 'test';
process.env['UPLOADS_DIR'] = path.join(os.tmpdir(), `metrico-e2e-uploads-${process.pid}`);
// OAuth stubs — real credentials not needed in E2E (OAuth routes not tested)
process.env['GOOGLE_CLIENT_ID'] = 'e2e-google-client-id';
process.env['GOOGLE_CLIENT_SECRET'] = 'e2e-google-client-secret';
process.env['GOOGLE_CALLBACK_URL'] = 'http://localhost:3000/api/auth/google/callback';
process.env['YANDEX_CLIENT_ID'] = 'e2e-yandex-client-id';
process.env['YANDEX_CLIENT_SECRET'] = 'e2e-yandex-client-secret';
process.env['YANDEX_CALLBACK_URL'] = 'http://localhost:3000/api/auth/yandex/callback';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// ── Helpers ─────────────────────────────────────────────────────────────────

function extractCookies(res: request.Response): string {
  const setCookies = res.headers['set-cookie'] as string[] | string | undefined;
  if (!setCookies) return '';
  const cookies = Array.isArray(setCookies) ? setCookies : [setCookies];
  return cookies.map((c) => c.split(';')[0]).join('; ');
}

// Minimal valid 1×1 PNG (67 bytes)
const PNG_1X1 = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
    '0000000a4944415408d76360f8cfc00000000200016be5b5350000000049454e44ae426082',
  'hex',
);

// ── Suite ────────────────────────────────────────────────────────────────────

describe('E2E — Full user journey (S5-07)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookies: string;

  let projectId: string;
  const roomIds: string[] = [];
  // wallIds[0..3] = room0 walls, wallIds[4] = room1 first wall
  const wallIds: string[] = [];
  let windowId: string;
  let doorId: string;
  let adjacencyId: string;
  let duplicatedProjectId: string;

  // ── Setup ──────────────────────────────────────────────────────────────────

  beforeAll(async () => {
    fs.mkdirSync(process.env['UPLOADS_DIR']!, { recursive: true });

    // Run Prisma migrations against the temp test DB
    // execFileSync is safe here — no user input in the args
    execFileSync(
      'npx',
      ['prisma', 'migrate', 'deploy'],
      {
        cwd: path.join(__dirname, '..'),
        env: { ...process.env },
        stdio: 'pipe',
      },
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api');
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  }, 60_000);

  afterAll(async () => {
    if (app) await app.close();
    try { fs.unlinkSync(TEST_DB_PATH); } catch { /* ignore */ }
    try { fs.rmSync(process.env['UPLOADS_DIR']!, { recursive: true, force: true }); } catch { /* ignore */ }
  }, 30_000);

  // ── Step 1: Register ───────────────────────────────────────────────────────

  describe('Step 1 — Register new user', () => {
    it('POST /api/auth/register → 201 and sets auth cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'e2e@metrico.test', name: 'E2E User', password: 'Passw0rd!E2E' })
        .expect(201);

      expect(res.body).toMatchObject({ message: expect.any(String) });
      cookies = extractCookies(res);
      expect(cookies).toContain('access_token');
    });

    it('duplicate email → 409', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'e2e@metrico.test', name: 'E2E User', password: 'Passw0rd!E2E' })
        .expect(409);
    });
  });

  // ── Step 2: Create project ────────────────────────────────────────────────

  describe('Step 2 — Create project', () => {
    it('POST /api/projects → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Cookie', cookies)
        .send({ name: 'Тестовая квартира', objectType: 'APARTMENT', address: 'ул. Тестовая 1' })
        .expect(201);

      expect(res.body).toMatchObject({ id: expect.any(String), name: 'Тестовая квартира' });
      projectId = res.body.id;
    });
  });

  // ── Step 3: Add 3 rooms ───────────────────────────────────────────────────

  describe('Step 3 — Add 3 rooms', () => {
    const roomDefs = [
      { name: 'Гостиная', type: 'LIVING', shape: 'RECTANGLE', ceilingHeight1: 2.7, sortOrder: 0 },
      { name: 'Кухня', type: 'KITCHEN', shape: 'RECTANGLE', ceilingHeight1: 2.6, sortOrder: 1 },
      { name: 'Спальня', type: 'BEDROOM', shape: 'RECTANGLE', ceilingHeight1: 2.65, sortOrder: 2 },
    ];

    roomDefs.forEach((room, i) => {
      it(`creates room "${room.name}"`, async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/projects/${projectId}/rooms`)
          .set('Cookie', cookies)
          .send(room)
          .expect(201);

        expect(res.body.id).toBeTruthy();
        roomIds[i] = res.body.id;
      });
    });

    it('all 3 roomIds are set', () => {
      expect(roomIds.filter(Boolean)).toHaveLength(3);
    });
  });

  // ── Step 4: Measure room 0 ────────────────────────────────────────────────

  describe('Step 4 — Measure room 0 (Гостиная): walls, opening, segments', () => {
    const wallDefs = [
      { cornerFrom: 'A', cornerTo: 'B', label: 'A–B', length: 4.2, material: 'CONCRETE', wallType: 'EXTERNAL', sortOrder: 0 },
      { cornerFrom: 'B', cornerTo: 'C', label: 'B–C', length: 3.1, material: 'CONCRETE', wallType: 'EXTERNAL', sortOrder: 1 },
      { cornerFrom: 'C', cornerTo: 'D', label: 'C–D', length: 4.2, material: 'CONCRETE', wallType: 'EXTERNAL', sortOrder: 2 },
      { cornerFrom: 'D', cornerTo: 'A', label: 'D–A', length: 3.1, material: 'CONCRETE', wallType: 'INTERNAL', sortOrder: 3 },
    ];

    wallDefs.forEach((wall, i) => {
      it(`POST wall "${wall.label}" → 201`, async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/rooms/${roomIds[0]}/walls`)
          .set('Cookie', cookies)
          .send(wall)
          .expect(201);

        wallIds[i] = res.body.id;
      });
    });

    it('POST window on wall A–B → 201', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/walls/${wallIds[0]}/windows`)
        .set('Cookie', cookies)
        .send({ width: 1.4, height: 1.5, sillHeightFromScreed: 0.9, revealWidthLeft: 0.05, revealWidthRight: 0.05 })
        .expect(201);

      windowId = res.body.id;
      expect(windowId).toBeTruthy();
    });

    it('POST door on wall D–A → 201', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/walls/${wallIds[3]}/doors`)
        .set('Cookie', cookies)
        .send({ width: 0.9, heightFromScreed: 2.1 })
        .expect(201);

      doorId = res.body.id;
      expect(doorId).toBeTruthy();
    });

    it('POST radiator element → 201', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/rooms/${roomIds[0]}/elements`)
        .set('Cookie', cookies)
        .send({ elementType: 'RADIATOR', width: 0.8, height: 0.6, depth: 0.1, offsetFromFloor: 0.1, wallId: wallIds[0] })
        .expect(201);

      expect(res.body.elementType).toBe('RADIATOR');
    });

    it('POST 3 segments on wall A–B → 201 each', async () => {
      await request(app.getHttpServer())
        .post(`/api/walls/${wallIds[0]}/segments`)
        .set('Cookie', cookies)
        .send({ sortOrder: 0, segmentType: 'PLAIN', length: 1.4 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/walls/${wallIds[0]}/segments`)
        .set('Cookie', cookies)
        .send({ sortOrder: 1, segmentType: 'WINDOW', length: 1.4, windowOpeningId: windowId })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/walls/${wallIds[0]}/segments`)
        .set('Cookie', cookies)
        .send({ sortOrder: 2, segmentType: 'PLAIN', length: 1.4 })
        .expect(201);
    });

    it('PATCH room → isMeasured: true', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/projects/${projectId}/rooms/${roomIds[0]}`)
        .set('Cookie', cookies)
        .send({ isMeasured: true })
        .expect(200);

      expect(res.body.isMeasured).toBe(true);
    });
  });

  // ── Step 5: Upload photo ──────────────────────────────────────────────────

  describe('Step 5 — Upload overview photo', () => {
    it('POST /api/rooms/:id/photos with PNG buffer → 201', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/rooms/${roomIds[0]}/photos`)
        .set('Cookie', cookies)
        .attach('file', PNG_1X1, { filename: 'overview.png', contentType: 'image/png' })
        .field('photoType', 'OVERVIEW_BEFORE')
        .expect(201);

      expect(res.body).toMatchObject({ id: expect.any(String), photoType: 'OVERVIEW_BEFORE' });
    });
  });

  // ── Step 6: Adjacency ─────────────────────────────────────────────────────

  describe('Step 6 — Create adjacency between rooms', () => {
    it('creates wall in room 1 (Кухня) for adjacency', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/rooms/${roomIds[1]}/walls`)
        .set('Cookie', cookies)
        .send({ cornerFrom: 'A', cornerTo: 'B', label: 'A–B', length: 3.0, material: 'CONCRETE', wallType: 'INTERNAL', sortOrder: 0 })
        .expect(201);

      wallIds[4] = res.body.id;
    });

    it('POST /api/projects/:id/adjacencies → 201', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/adjacencies`)
        .set('Cookie', cookies)
        .send({ wallAId: wallIds[3], wallBId: wallIds[4], hasDoorBetween: true, doorOpeningId: doorId })
        .expect(201);

      adjacencyId = res.body.id;
      expect(adjacencyId).toBeTruthy();
    });
  });

  // ── Steps 7 & 8: Plan + computed fields ───────────────────────────────────

  describe('Steps 7 & 8 — Plan assembly and computed fields', () => {
    let planRooms: Array<{ id: string; perimeter: number; area: number | null }>;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/projects/${projectId}/plan`)
        .set('Cookie', cookies)
        .expect(200);

      planRooms = res.body.rooms;
    });

    it('plan contains at least 1 room', () => {
      expect(planRooms.length).toBeGreaterThanOrEqual(1);
    });

    it('room 0 has perimeter > 0', () => {
      const room0 = planRooms.find((r) => r.id === roomIds[0]);
      expect(room0).toBeDefined();
      expect(room0!.perimeter).toBeGreaterThan(0);
    });

    it('room 0 has area > 0', () => {
      const room0 = planRooms.find((r) => r.id === roomIds[0]);
      expect(room0!.area).toBeGreaterThan(0);
    });
  });

  // ── Step 9: PDF ───────────────────────────────────────────────────────────

  describe('Step 9 — PDF generation', () => {
    it('GET /api/projects/:id/plan/pdf → 200 and buffer.length > 100', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/projects/${projectId}/plan/pdf`)
        .set('Cookie', cookies)
        .buffer(true)
        .parse((_res: NodeJS.EventEmitter, fn: (err: null, body: Buffer) => void) => {
          const chunks: Buffer[] = [];
          _res.on('data', (c: Buffer) => chunks.push(c));
          _res.on('end', () => fn(null, Buffer.concat(chunks)));
        })
        .expect(200);

      expect(res.body).toBeInstanceOf(Buffer);
      expect((res.body as Buffer).length).toBeGreaterThan(100);
    });
  });

  // ── Step 10: Duplicate project ────────────────────────────────────────────

  describe('Step 10 — Duplicate project', () => {
    it('POST /api/projects/:id/duplicate → 201 with new id', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/duplicate`)
        .set('Cookie', cookies)
        .expect(201);

      expect(res.body.id).toBeTruthy();
      expect(res.body.id).not.toBe(projectId);
      duplicatedProjectId = res.body.id;
    });

    it('duplicated project appears in list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/projects')
        .set('Cookie', cookies)
        .expect(200);

      const ids = (res.body as Array<{ id: string }>).map((p) => p.id);
      expect(ids).toContain(duplicatedProjectId);
    });
  });

  // ── Step 11: Delete original project ──────────────────────────────────────

  describe('Step 11 — Delete original project (cascade)', () => {
    it('DELETE /api/projects/:id → 204', async () => {
      await request(app.getHttpServer())
        .delete(`/api/projects/${projectId}`)
        .set('Cookie', cookies)
        .expect(204);
    });

    it('deleted project absent from list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/projects')
        .set('Cookie', cookies)
        .expect(200);

      const ids = (res.body as Array<{ id: string }>).map((p) => p.id);
      expect(ids).not.toContain(projectId);
    });

    it('rooms cascade-deleted in DB', async () => {
      const rooms = await prisma.room.findMany({ where: { projectId } });
      expect(rooms).toHaveLength(0);
    });

    it('walls cascade-deleted in DB', async () => {
      const walls = await prisma.wall.findMany({ where: { id: { in: wallIds.filter(Boolean) } } });
      expect(walls).toHaveLength(0);
    });

    it('adjacency cascade-deleted in DB', async () => {
      const adj = await prisma.wallAdjacency.findUnique({ where: { id: adjacencyId } });
      expect(adj).toBeNull();
    });

    it('duplicated project still present', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/projects')
        .set('Cookie', cookies)
        .expect(200);

      const ids = (res.body as Array<{ id: string }>).map((p) => p.id);
      expect(ids).toContain(duplicatedProjectId);
    });
  });
});
