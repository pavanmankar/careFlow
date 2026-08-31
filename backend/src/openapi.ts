export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'CareFlow API',
    version: '1.0.0',
    description: 'Phase 1 Node.js + TypeScript REST API',
  },
  servers: [{ url: '/api/v1' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
  paths: {
    '/auth/register': { post: { summary: 'Register owner and business', tags: ['auth'] } },
    '/auth/login': { post: { summary: 'Login', tags: ['auth'] } },
    '/auth/me': {
      get: { summary: 'Current session', tags: ['auth'], security: [{ bearerAuth: [] }] },
      put: { summary: 'Update current user profile', tags: ['auth'], security: [{ bearerAuth: [] }] },
    },
    '/business-types': { get: { summary: 'List types of business', tags: ['business-types'] } },
    '/tenants': {
      get: { summary: 'List tenants (super admin)', tags: ['tenants'], security: [{ bearerAuth: [] }] },
      post: { summary: 'Create tenant (super admin)', tags: ['tenants'], security: [{ bearerAuth: [] }] },
    },
    '/tenants/{id}': { get: { summary: 'Get tenant (super admin)', tags: ['tenants'], security: [{ bearerAuth: [] }] } },
    '/tenants/{id}/subscription': {
      patch: { summary: 'Update tenant subscription (super admin)', tags: ['tenants'], security: [{ bearerAuth: [] }] },
    },
    '/platform-settings/subcription-trial-days': {
      get: { summary: 'Get default subscription trial days', tags: ['platform-settings'], security: [{ bearerAuth: [] }] },
      put: { summary: 'Update default subscription trial days', tags: ['platform-settings'], security: [{ bearerAuth: [] }] },
    },
    '/locations': { get: { summary: 'List locations', tags: ['locations'], security: [{ bearerAuth: [] }] } },
    '/users': { get: { summary: 'List users', tags: ['users'], security: [{ bearerAuth: [] }] } },
    '/roles': { get: { summary: 'List roles', tags: ['roles'], security: [{ bearerAuth: [] }] } },
    '/dashboard/counts': {
      get: { summary: 'Total patients, new patients in period, and appointment counts', tags: ['dashboard'], security: [{ bearerAuth: [] }] },
    },
    '/dashboard/patients-by-age': {
      get: { summary: 'Patients grouped by age', tags: ['dashboard'], security: [{ bearerAuth: [] }] },
    },
    '/dashboard/appointments-by-type': {
      get: { summary: 'Appointments grouped by type', tags: ['dashboard'], security: [{ bearerAuth: [] }] },
    },
    '/dashboard/appointments-by-status': {
      get: { summary: 'Appointments grouped by status', tags: ['dashboard'], security: [{ bearerAuth: [] }] },
    },
    '/dashboard/patients-over-time': {
      get: { summary: 'Unique patients with appointments over time', tags: ['dashboard'], security: [{ bearerAuth: [] }] },
    },
    '/dashboard/appointments-over-time': {
      get: { summary: 'Appointments over time', tags: ['dashboard'], security: [{ bearerAuth: [] }] },
    },
    '/dashboard/revenue-over-time': {
      get: { summary: 'Revenue over time', tags: ['dashboard'], security: [{ bearerAuth: [] }] },
    },
    '/inventory': {
      get: { summary: 'List inventory items', tags: ['inventory'], security: [{ bearerAuth: [] }] },
      post: { summary: 'Add inventory item', tags: ['inventory'], security: [{ bearerAuth: [] }] },
    },
    '/inventory/reset': {
      post: { summary: 'Reset all stock counts to 0', tags: ['inventory'], security: [{ bearerAuth: [] }] },
    },
    '/inventory/{id}': {
      patch: { summary: 'Update inventory item', tags: ['inventory'], security: [{ bearerAuth: [] }] },
    },
  },
};
