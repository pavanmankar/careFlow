/** Local-only constants — must never be used in production (validated at startup). */
export const LOCAL_DEV_JWT_SECRET =
  'careflow_local_dev_jwt_7f3a9e2b1c8d4f6a0e5b9c3d7f1a4e8b2c6d0f4a8e1b5c9d3f7a0e4b8c2d6f1a5e9';

export const LOCAL_DEV_PHI_ENCRYPTION_KEY =
  'careflow_local_phi_key_4e8b1c9d3f7a0e5b2c6d0f4a8e1b5c9d3f7a0e4b8c2d6f1a5e9b3c7f1a4e8b2c6d0f4';

export const WEAK_JWT_SECRETS = new Set([
  'change-me-in-production-use-a-long-random-string',
  'change-me',
]);
