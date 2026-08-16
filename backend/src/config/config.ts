import * as dotenv from 'dotenv';
dotenv.config();

const useTrusted = process.env.DB_TRUSTED_CONNECTION === 'true';
const nodeEnv = process.env.NODE_ENV || 'development';
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
      ? { options: { trustedConnection: true, encrypt: false, trustServerCertificate: true } }
      : {
          user: process.env.DB_USER || 'sa',
          password: process.env.DB_PASSWORD || '',
          options: { encrypt: false, trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true' },
        }
    ),
    database: process.env.DB_NAME || 'gymer',
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  },
  jwt: {
    accessSecret: secret('JWT_ACCESS_SECRET','dev-access-secret-32ch'),
    refreshSecret: secret('JWT_REFRESH_SECRET','dev-refresh-secret-32c'),
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
    issuer: process.env.JWT_ISSUER || 'gymfit-api',
    audience: process.env.JWT_AUDIENCE || 'gymfit-web',
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
  cors : { origin: process.env.CORS_ORIGIN || 'http://localhost:5173' },
  redis: { url: process.env.REDIS_URL || 'redis://localhost:6379' },
};
