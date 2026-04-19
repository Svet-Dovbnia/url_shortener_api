import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';

jest.setTimeout(120_000);

describe('URL Shortener API (e2e)', () => {
  let app: INestApplication;
  let container: StartedPostgreSqlContainer;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('url_shortener')
      .withUsername('postgres')
      .withPassword('postgres')
      .start();

    process.env.DB_HOST = container.getHost();
    process.env.DB_PORT = container.getMappedPort(5432).toString();
    process.env.DB_USERNAME = container.getUsername();
    process.env.DB_PASSWORD = container.getPassword();
    process.env.DB_NAME = container.getDatabase();
    process.env.DB_SYNCHRONIZE = 'true';
    process.env.DB_LOGGING = 'false';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new LoggingInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await container?.stop();
  });

  it('walks the happy path: create user → shorten → redirect → usage', async () => {
    const server = app.getHttpServer();

    const createRes = await request(server)
      .post('/user')
      .send({ email: 'e2e@example.com' })
      .expect(201);
    const { id: userId, apiKey, plan } = createRes.body as {
      id: string;
      apiKey: string;
      plan: string;
    };
    expect(plan).toBe('FREE');
    expect(apiKey).toMatch(/^usr_/);

    const shortenRes = await request(server)
      .post('/url/shorten')
      .set('x-api-key', apiKey)
      .send({ originalUrl: 'https://example.com/some/long/path' })
      .expect(201);
    const { shortCode } = shortenRes.body as { shortCode: string };
    expect(shortCode).toHaveLength(8);

    const redirectRes = await request(server).get(`/${shortCode}`).expect(302);
    expect(redirectRes.headers.location).toBe(
      'https://example.com/some/long/path',
    );

    const usageRes = await request(server)
      .get('/user/usage')
      .set('x-api-key', apiKey)
      .expect(200);
    expect(usageRes.body).toMatchObject({
      userId,
      plan: 'FREE',
      limit: 10,
      usedThisMonth: 1,
      remaining: 9,
    });
    expect(typeof usageRes.body.resetsAt).toBe('string');
  });

  it('enforces auth, plan gate, and not-found error shape', async () => {
    const server = app.getHttpServer();

    const createRes = await request(server)
      .post('/user')
      .send({ email: 'errors@example.com' })
      .expect(201);
    const { apiKey } = createRes.body as { apiKey: string };

    await request(server)
      .post('/url/shorten')
      .send({ originalUrl: 'https://example.com' })
      .expect(401);

    const shortenRes = await request(server)
      .post('/url/shorten')
      .set('x-api-key', apiKey)
      .send({ originalUrl: 'https://example.com' })
      .expect(201);
    const { shortCode } = shortenRes.body as { shortCode: string };

    await request(server)
      .get(`/url/${shortCode}/stats`)
      .set('x-api-key', apiKey)
      .expect(403)
      .expect((res) => {
        expect(res.body).toEqual({
          statusCode: 403,
          message: 'Stats are available on the PRO plan only',
        });
      });

    await request(server)
      .get('/url/unknown1/stats')
      .set('x-api-key', apiKey)
      .expect(404)
      .expect((res) => {
        expect(res.body).toEqual({
          statusCode: 404,
          message: 'Short URL not found',
        });
      });
  });
});
