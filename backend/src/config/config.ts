import * as dotenv from 'dotenv';
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const booleanSetting = (name:string, fallback:boolean) => {
  const value=process.env[name]?.trim().toLowerCase();
  if (value === undefined || value === '') return fallback;
  if (value !== 'true' && value !== 'false') throw new Error(`${name} must be true or false`);
  return value === 'true';
};
const useTrusted = booleanSetting('DB_TRUSTED_CONNECTION', false);
const dbEncrypt = booleanSetting('DB_ENCRYPT', nodeEnv === 'production');
const trustServerCertificate = booleanSetting('DB_TRUST_SERVER_CERTIFICATE', nodeEnv !== 'production');
if (nodeEnv === 'production' && !dbEncrypt) throw new Error('DB_ENCRYPT must be true in production');
if (nodeEnv === 'production' && trustServerCertificate) throw new Error('DB_TRUST_SERVER_CERTIFICATE must be false in production');
const refreshExpires = process.env.JWT_REFRESH_EXPIRES || '7d';
const refreshCookieSameSiteInput = process.env.REFRESH_COOKIE_SAMESITE?.trim().toLowerCase();
if (nodeEnv === 'production' && !refreshCookieSameSiteInput) throw new Error('REFRESH_COOKIE_SAMESITE is required in production');
if (refreshCookieSameSiteInput && !['lax', 'strict', 'none'].includes(refreshCookieSameSiteInput)) throw new Error('REFRESH_COOKIE_SAMESITE must be lax, strict or none');
const refreshCookieSameSite = (refreshCookieSameSiteInput || 'lax') as 'lax' | 'strict' | 'none';
const refreshCookieSecureInput = process.env.REFRESH_COOKIE_SECURE?.trim().toLowerCase();
if (refreshCookieSecureInput && !['true', 'false'].includes(refreshCookieSecureInput)) throw new Error('REFRESH_COOKIE_SECURE must be true or false');
const refreshCookieSecure = refreshCookieSecureInput ? refreshCookieSecureInput === 'true' : nodeEnv === 'production';
if (nodeEnv === 'production' && !refreshCookieSecure) throw new Error('REFRESH_COOKIE_SECURE must be true in production');
if (refreshCookieSameSite === 'none' && !refreshCookieSecure) throw new Error('SameSite=None requires Secure=true');
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
const allowedOrigins = corsOrigin.split(',').map(value => value.trim()).filter(Boolean);
if (!allowedOrigins.length || allowedOrigins.includes('*')) throw new Error('CORS_ORIGIN must contain explicit origins; wildcard is not allowed');
const trustProxyInput = process.env.TRUST_PROXY?.trim();
const trustProxy = (() => {
  if (!trustProxyInput || trustProxyInput.toLowerCase() === 'false') return false as const;
  if (trustProxyInput.toLowerCase() === 'true') throw new Error('TRUST_PROXY=true is unsafe; configure loopback or explicit proxy CIDRs');
  const values=trustProxyInput.split(',').map(value => value.trim()).filter(Boolean);
  if (!values.length) throw new Error('TRUST_PROXY must be false, loopback or explicit proxy values');
  return values.length === 1 ? values[0] : values;
})();
const positiveInteger = (name:string, fallback:number) => {
  const value=Number(process.env[name]);
  return Number.isSafeInteger(value)&&value>0?value:fallback;
};
const aiEnabled = booleanSetting('AI_ENABLED', false);
const aiApiKey = process.env.AI_API_KEY?.trim() || '';
const aiModel = process.env.AI_MODEL?.trim() || '';
const aiTimeoutMs = positiveInteger('AI_TIMEOUT_MS', 15_000);
const aiBaseUrl = (() => {
  const value = process.env.AI_BASE_URL?.trim() || 'https://api.openai.com/v1';
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error('AI_BASE_URL must be a valid HTTP(S) URL'); }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('AI_BASE_URL must use HTTP or HTTPS');
  return value.replace(/\/+$/, '');
})();
const secret = (name:string, developmentFallback:string) => {
  const value=process.env[name]?.trim();
  if(value)return value;
  if(nodeEnv==='production')throw new Error(`${name} is required in production`);
  return developmentFallback;
};

export const config = {
  port: parseInt(process.env.PORT || '5000'),
  nodeEnv,
  db: {
    server: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '1433'),
    ...(useTrusted
      ? { options: { trustedConnection: true, encrypt: dbEncrypt, trustServerCertificate } }
      : {
          user: process.env.DB_USER || 'sa',
          password: process.env.DB_PASSWORD || '',
          options: { encrypt: dbEncrypt, trustServerCertificate },
        }
    ),
    database: process.env.DB_NAME || 'gymer',
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  },
  jwt: {
    accessSecret: secret('JWT_ACCESS_SECRET','dev-access-secret-32ch'),
    refreshSecret: secret('JWT_REFRESH_SECRET','dev-refresh-secret-32c'),
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires,
    refreshLifetimeMs: (() => { const match=/^(\d+)([smhd])$/.exec(refreshExpires); return match ? Number(match[1])*({s:1000,m:60000,h:3600000,d:86400000}[match[2]]!) : 7*86400000; })(),
    issuer: process.env.JWT_ISSUER || 'gymfit-api',
    audience: process.env.JWT_AUDIENCE || 'gymfit-web',
  },
  ai: {
    enabled: aiEnabled,
    apiKey: aiApiKey,
    model: aiModel,
    timeoutMs: aiTimeoutMs,
    baseUrl: aiBaseUrl,
    configured: aiEnabled && Boolean(aiApiKey && aiModel),
    circuit: { failureThreshold: 3, cooldownMs: 30_000 },
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'),
  },
  backup: {
    dir: process.env.BACKUP_DIR || './backups',
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
  },
  cors: { origin: corsOrigin, allowedOrigins },
  trustProxy,
  rateLimit: {
    api: { windowMs: positiveInteger('API_RATE_LIMIT_WINDOW_MS',15*60*1000), max: positiveInteger('API_RATE_LIMIT_MAX',1000) },
    auth: { windowMs: positiveInteger('AUTH_RATE_LIMIT_WINDOW_MS',60*1000), max: positiveInteger('AUTH_RATE_LIMIT_MAX',10) },
    upload: { windowMs: positiveInteger('UPLOAD_RATE_LIMIT_WINDOW_MS',60*1000), max: positiveInteger('UPLOAD_RATE_LIMIT_MAX',10) },
    sellerApplication: {
      write: { windowMs: positiveInteger('SELLER_APPLICATION_WRITE_RATE_LIMIT_WINDOW_MS',15*60*1000), max: positiveInteger('SELLER_APPLICATION_WRITE_RATE_LIMIT_MAX',30) },
      submit: { windowMs: positiveInteger('SELLER_APPLICATION_SUBMIT_RATE_LIMIT_WINDOW_MS',24*60*60*1000), max: positiveInteger('SELLER_APPLICATION_SUBMIT_RATE_LIMIT_MAX',5) },
      withdraw: { windowMs: positiveInteger('SELLER_APPLICATION_WITHDRAW_RATE_LIMIT_WINDOW_MS',24*60*60*1000), max: positiveInteger('SELLER_APPLICATION_WITHDRAW_RATE_LIMIT_MAX',10) },
    },
    brandRequest: { windowMs: positiveInteger('BRAND_REQUEST_RATE_LIMIT_WINDOW_MS',24*60*60*1000), max: positiveInteger('BRAND_REQUEST_RATE_LIMIT_MAX',10) },
    assistant: {
      guest: { windowMs: positiveInteger('ASSISTANT_GUEST_RATE_LIMIT_WINDOW_MS',60*1000), max: positiveInteger('ASSISTANT_GUEST_RATE_LIMIT_MAX',10) },
      authenticated: { windowMs: positiveInteger('ASSISTANT_AUTHENTICATED_RATE_LIMIT_WINDOW_MS',60*1000), max: positiveInteger('ASSISTANT_AUTHENTICATED_RATE_LIMIT_MAX',30) },
    },
  },
  refreshCookie: {
    name: process.env.REFRESH_COOKIE_NAME || 'gymfit_refresh_token',
    path: '/api/auth',
    httpOnly: true,
    sameSite: refreshCookieSameSite,
    secure: refreshCookieSecure,
  },
  redis: { url: process.env.REDIS_URL || 'redis://localhost:6379' },
};
