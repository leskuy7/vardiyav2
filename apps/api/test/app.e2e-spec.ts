import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('App (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let managerToken = '';
  let employeeToken = '';
  let managerEmployeeId = '';
  let employeeEmployeeId = '';
  let outsiderEmployeeId = '';

  beforeAll(async () => {
    process.env.REGISTER_INVITE_CODE = process.env.REGISTER_INVITE_CODE ?? 'test-invite-code';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    prisma = moduleRef.get(PrismaService);

    await prisma.shift.deleteMany();
    await prisma.availabilityBlock.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.user.deleteMany();

    const managerUser = await prisma.user.create({
      data: {
        email: 'manager@test.local',
        name: 'Manager User',
        passwordHash: await bcrypt.hash('Test12345!', 12),
        role: 'MANAGER'
      }
    });

    const employeeUser = await prisma.user.create({
      data: {
        email: 'employee@test.local',
        name: 'Employee User',
        passwordHash: await bcrypt.hash('Test12345!', 12),
        role: 'EMPLOYEE'
      }
    });

    const managerEmployee = await prisma.employee.create({ data: { userId: managerUser.id, hourlyRate: 100 } });
    const employeeEmployee = await prisma.employee.create({ data: { userId: employeeUser.id, hourlyRate: 100 } });

    const outsiderUser = await prisma.user.create({
      data: {
        email: 'outsider@test.local',
        name: 'Outsider User',
        passwordHash: await bcrypt.hash('Test12345!', 12),
        role: 'EMPLOYEE'
      }
    });

    const outsiderEmployee = await prisma.employee.create({
      data: { userId: outsiderUser.id, hourlyRate: 120, department: 'Sales' }
    });

    managerEmployeeId = managerEmployee.id;
    employeeEmployeeId = employeeEmployee.id;
    outsiderEmployeeId = outsiderEmployee.id;

    const managerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'manager@test.local', password: 'Test12345!' })
      .expect(201);

    const employeeLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'employee@test.local', password: 'Test12345!' })
      .expect(201);

    managerToken = managerLogin.body.accessToken;
    employeeToken = employeeLogin.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('login ve /auth/me çalışır', async () => {
    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(me.body.email).toBe('manager@test.local');
    expect(me.body.name).toBe('Manager User');
  });

  it('register geçersiz invite code ile bloklanır', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .set('Origin', process.env.CSRF_ORIGIN ?? 'http://localhost:3000')
      .send({
        email: 'new-user-fail@test.local',
        password: 'Test12345!',
        firstName: 'New',
        lastName: 'User',
        inviteCode: 'wrong-code'
      })
      .expect(401);
  });

  it('register başarılı olduğunda employee kaydı da oluşur', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .set('Origin', process.env.CSRF_ORIGIN ?? 'http://localhost:3000')
      .send({
        email: 'new-user-ok@test.local',
        password: 'Test12345!',
        firstName: 'New',
        lastName: 'User',
        inviteCode: process.env.REGISTER_INVITE_CODE
      })
      .expect(201);

    expect(response.body.email).toBe('new-user-ok@test.local');

    const createdUser = await prisma.user.findUnique({
      where: { email: 'new-user-ok@test.local' },
      include: { employee: true }
    });

    expect(createdUser).toBeTruthy();
    expect(createdUser?.employee).toBeTruthy();
  });

  it('employee, shift create için yetkisizdir', async () => {
    await request(app.getHttpServer())
      .post('/api/shifts')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('Origin', process.env.CSRF_ORIGIN ?? 'http://localhost:3000')
      .send({
        employeeId: employeeEmployeeId,
        startTime: '2026-01-05T08:00:00.000Z',
        endTime: '2026-01-05T16:00:00.000Z'
      })
      .expect(403);
  });

  it('shift overlap 409 döner', async () => {
    await request(app.getHttpServer())
      .post('/api/shifts')
      .set('Authorization', `Bearer ${managerToken}`)
      .set('Origin', process.env.CSRF_ORIGIN ?? 'http://localhost:3000')
      .send({
        employeeId: employeeEmployeeId,
        startTime: '2026-01-06T08:00:00.000Z',
        endTime: '2026-01-06T16:00:00.000Z'
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/shifts')
      .set('Authorization', `Bearer ${managerToken}`)
      .set('Origin', process.env.CSRF_ORIGIN ?? 'http://localhost:3000')
      .send({
        employeeId: employeeEmployeeId,
        startTime: '2026-01-06T10:00:00.000Z',
        endTime: '2026-01-06T18:00:00.000Z'
      })
      .expect(409);
  });

  it('availability conflict 422 ve override warning üretir', async () => {
    await request(app.getHttpServer())
      .post('/api/availability')
      .set('Authorization', `Bearer ${managerToken}`)
      .set('Origin', process.env.CSRF_ORIGIN ?? 'http://localhost:3000')
      .send({
        employeeId: managerEmployeeId,
        type: 'UNAVAILABLE',
        dayOfWeek: 2,
        startTime: '08:00',
        endTime: '17:00',
        startDate: '2026-01-01',
        endDate: '2026-12-31'
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/shifts')
      .set('Authorization', `Bearer ${managerToken}`)
      .set('Origin', process.env.CSRF_ORIGIN ?? 'http://localhost:3000')
      .send({
        employeeId: managerEmployeeId,
        startTime: '2026-01-06T09:00:00.000Z',
        endTime: '2026-01-06T12:00:00.000Z'
      })
      .expect(422);

    const override = await request(app.getHttpServer())
      .post('/api/shifts')
      .set('Authorization', `Bearer ${managerToken}`)
      .set('Origin', process.env.CSRF_ORIGIN ?? 'http://localhost:3000')
      .send({
        employeeId: managerEmployeeId,
        startTime: '2026-01-06T09:00:00.000Z',
        endTime: '2026-01-06T12:00:00.000Z',
        forceOverride: true
      })
      .expect(201);

    expect(Array.isArray(override.body.warnings)).toBe(true);
  });

  it('schedule/week doğru şekil döner', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/schedule/week?start=2026-01-05')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(Array.isArray(response.body.days)).toBe(true);
    expect(response.body.days).toHaveLength(7);
  });

  it('employee sadece kendi vardiyalarını listeleyebilir', async () => {
    await request(app.getHttpServer())
      .post('/api/shifts')
      .set('Authorization', `Bearer ${managerToken}`)
      .set('Origin', process.env.CSRF_ORIGIN ?? 'http://localhost:3000')
      .send({
        employeeId: employeeEmployeeId,
        startTime: '2026-01-07T08:00:00.000Z',
        endTime: '2026-01-07T16:00:00.000Z'
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/shifts')
      .set('Authorization', `Bearer ${managerToken}`)
      .set('Origin', process.env.CSRF_ORIGIN ?? 'http://localhost:3000')
      .send({
        employeeId: outsiderEmployeeId,
        startTime: '2026-01-07T08:00:00.000Z',
        endTime: '2026-01-07T16:00:00.000Z'
      })
      .expect(201);

    const myShifts = await request(app.getHttpServer())
      .get('/api/shifts')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);

    expect(Array.isArray(myShifts.body)).toBe(true);
    expect(myShifts.body.length).toBeGreaterThan(0);
    expect(myShifts.body.every((shift: { employeeId: string }) => shift.employeeId === employeeEmployeeId)).toBe(true);
  });

  it('employee schedule/week çıktısında yalnız kendi vardiyalarını görür', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/schedule/week?start=2026-01-05')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);

    const shifts = response.body.days.flatMap((day: { shifts: Array<{ employeeId: string }> }) => day.shifts);
    expect(shifts.every((shift: { employeeId: string }) => shift.employeeId === employeeEmployeeId)).toBe(true);
  });

  it('CSRF başlığı olmayan mutating istek bloklanır', async () => {
    await request(app.getHttpServer())
      .post('/api/shifts')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        employeeId: employeeEmployeeId,
        startTime: '2026-01-08T08:00:00.000Z',
        endTime: '2026-01-08T16:00:00.000Z'
      })
      .expect(401);
  });
});
