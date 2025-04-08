type HttpStatusCode = 200 | 201 | 204 | 400 | 401 | 403 | 404 | 409 | 500;
type HttpResponse =
  | 'OK'
  | 'CREATED'
  | 'NO_CONTENT'
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_SERVER';

const HTTP_STATUS: Record<HttpResponse, HttpStatusCode> = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER: 500,
};

type UserRole = 'admin' | 'user' | 'guest';

const USER_ROLES: Record<string, UserRole> = {
  ADMIN: 'admin',
  USER: 'user',
  GUEST: 'guest',
};

const AUTH: { [key: string]: string | number } = {
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  JWT_EXPIRES_IN: '24h',
  SALT_ROUNDS: 10,
  TOKEN_TYPE: 'Bearer',
};

const MESSAGES: { [key: string]: string } = {
  SUCCESS: 'Success',
  ERROR: 'Error occurred',
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Unauthorized access',
  INVALID_CREDENTIALS: 'Invalid credentials',
  VALIDATION_ERROR: 'Validation error',
};

const UPLOAD = {
  ALLOWED_FORMATS: ['image/jpeg', 'image/png', 'image/gif'],
  MAX_FILES: 5,
  UPLOAD_DIR: 'uploads/',
};

const METHODS: string[] = ['get', 'post', 'put', 'delete', 'patch', 'use'];

const API_VERSION = 'v1';

export { HTTP_STATUS, USER_ROLES, AUTH, MESSAGES, UPLOAD, METHODS, API_VERSION };
