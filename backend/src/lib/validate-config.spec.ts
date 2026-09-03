import { validateConfigValues } from '@/lib/validate-config';
import { LOCAL_DEV_JWT_SECRET, WEAK_JWT_SECRETS } from '@/lib/dev-secrets';

describe('validateConfigValues', () => {
  it('accepts the static local dev JWT secret in development', () => {
    expect(() =>
      validateConfigValues({
        nodeEnv: 'development',
        databaseUrl: 'mysql://user:pass@127.0.0.1:3306/test',
        jwtSecret: LOCAL_DEV_JWT_SECRET,
      }),
    ).not.toThrow();
  });

  it('rejects the local dev JWT secret in production', () => {
    expect(() =>
      validateConfigValues({
        nodeEnv: 'production',
        databaseUrl: 'mysql://user:pass@db.example.com:3306/test',
        jwtSecret: LOCAL_DEV_JWT_SECRET,
      }),
    ).toThrow(/local development constant/);
  });

  it('rejects weak placeholder secrets', () => {
    expect(() =>
      validateConfigValues({
        nodeEnv: 'development',
        databaseUrl: 'mysql://user:pass@127.0.0.1:3306/test',
        jwtSecret: [...WEAK_JWT_SECRETS][0],
      }),
    ).toThrow(/JWT_SECRET/);
  });
});
