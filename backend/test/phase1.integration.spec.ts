import request from 'supertest';
import { createApp } from '../src/app';

const runIntegration = process.env.RUN_INTEGRATION === 'true';

(runIntegration ? describe : describe.skip)('Phase 1 integration', () => {
  const app = createApp();

  it('registers only an owner, then allows adding staff with a custom role', async () => {
    const types = await request(app).get('/api/v1/business-types').expect(200);
    const healthcare = types.body.data.items.find((item: { code: string }) => item.code === 'HEALTHCARE');
    expect(healthcare).toBeDefined();

    const suffix = Date.now();
    const register = await request(app)
      .post('/api/v1/auth/register')
      .send({
        firstName: 'Neha',
        lastName: 'Sharma',
        email: `neha.${suffix}@nehadental.example`,
        password: 'Str0ngPass!word',
        businessTypeId: healthcare.id,
        businessName: 'Neha Dental Clinic',
      })
      .expect(201);

    expect(register.body.success).toBeUndefined();
    expect(register.body.data.user.roles).toContain('TENANT_OWNER');
    const ownerToken = register.body.data.accessToken as string;

    const users = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${ownerToken}`).expect(200);
    expect(users.body.data.total).toBe(1);

    const roles = await request(app).get('/api/v1/roles').set('Authorization', `Bearer ${ownerToken}`).expect(200);
    expect(roles.body.data.items).toEqual([]);

    const createdRole = await request(app)
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Receptionist', code: 'RECEPTIONIST' })
      .expect(201);

    await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        firstName: 'Ritu',
        lastName: 'Patil',
        email: `ritu.${suffix}@nehadental.example`,
        roleIds: [createdRole.body.data.id],
      })
      .expect(201);
  });

  it('isolates tenants', async () => {
    const types = await request(app).get('/api/v1/business-types').expect(200);
    const healthcare = types.body.data.items.find((item: { code: string }) => item.code === 'HEALTHCARE');
    const salon = types.body.data.items.find((item: { code: string }) => item.code === 'SALON_BEAUTY');
    const suffix = Date.now();

    const a = await request(app)
      .post('/api/v1/auth/register')
      .send({
        firstName: 'Neha',
        lastName: 'A',
        email: `a.${suffix}@example.com`,
        password: 'Str0ngPass!word',
        businessTypeId: healthcare.id,
        businessName: 'Clinic A',
      })
      .expect(201);

    const b = await request(app)
      .post('/api/v1/auth/register')
      .send({
        firstName: 'Ritu',
        lastName: 'B',
        email: `b.${suffix}@example.com`,
        password: 'Str0ngPass!word',
        businessTypeId: salon.id,
        businessName: 'Salon B',
      })
      .expect(201);

    const loc = await request(app)
      .post('/api/v1/locations')
      .set('Authorization', `Bearer ${a.body.data.accessToken}`)
      .send({ name: 'Pune', code: 'PNQ-01' })
      .expect(201);

    await request(app)
      .get(`/api/v1/locations/${loc.body.data.id}`)
      .set('Authorization', `Bearer ${b.body.data.accessToken}`)
      .expect(404);
  });
});
