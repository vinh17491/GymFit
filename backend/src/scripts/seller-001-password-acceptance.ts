import crypto from 'crypto';
import type { Server } from 'http';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { closePool, query } from '../config/database';
import { stopOrderExpirationRunner } from '../modules/orders/order-expiration.runner';

if (process.env.SELLER001_PASSWORD_ACCEPTANCE !== '1') {
  throw new Error('SELLER001_PASSWORD_ACCEPTANCE=1 is required');
}
if (!config.db.database.startsWith('GYMFIT_DB_SELLER001_PASSWORD_ACCEPTANCE_') || config.db.database === 'GYMFIT_DB') {
  throw new Error('Refusing password mutation outside a disposable SELLER-001 password acceptance database');
}

type Role = 'member' | 'coach' | 'admin' | 'seller';
type JsonRecord = Record<string, unknown>;
type LoginData = { user: { id: number; role: Role }; accessToken: string; refreshToken: string };
type HttpResult = { status: number; body: { message?: string; data?: JsonRecord } };

const requestTimeoutMs = 15_000;
const suiteTimeoutMs = 300_000;
const port = Number(process.env.ACCEPTANCE_PORT || 5521);
const base = `http://127.0.0.1:${port}/api`;
const suiteAbort = new AbortController();
const stamp = Date.now();
let server: Server | undefined;
let assertions = 0;
let requests = 0;

function check(condition: boolean, message: string) {
  assertions += 1;
  if (!condition) throw new Error(message);
}

function password(): string {
  return `Aa1-${crypto.randomBytes(18).toString('base64url')}`;
}

async function call(method: string, path: string, accessToken?: string, body?: unknown): Promise<HttpResult> {
  const label = `${method} ${path}`;
  requests += 1;
  console.log(`[REQUEST START] ${label}`);
  const requestAbort = new AbortController();
  const timeout = setTimeout(
    () => requestAbort.abort(new Error(`Request timed out after ${requestTimeoutMs}ms`)),
    requestTimeoutMs,
  );
  timeout.unref();
  const abortFromSuite = () => requestAbort.abort(suiteAbort.signal.reason);
  suiteAbort.signal.addEventListener('abort', abortFromSuite, { once: true });
  try {
    const response = await fetch(base + path, {
      method,
      signal: requestAbort.signal,
      headers: {
        'content-type': 'application/json',
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let responseBody: unknown = {};
    try {
      responseBody = await response.json();
    } catch {
      responseBody = {};
    }
    console.log(`[REQUEST END] ${label} status=${response.status}`);
    return { status: response.status, body: responseBody as HttpResult['body'] };
  } catch (error) {
    throw new Error(`${label} failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    clearTimeout(timeout);
    suiteAbort.signal.removeEventListener('abort', abortFromSuite);
  }
}

async function expect(
  method: string,
  path: string,
  status: number,
  accessToken?: string,
  body?: unknown,
): Promise<HttpResult> {
  const result = await call(method, path, accessToken, body);
  check(result.status === status, `${method} ${path}: expected ${status}, received ${result.status}`);
  return result;
}

async function seed(role: Role, label: string, rawPassword: string): Promise<{ id: number; email: string }> {
  const email = `seller001-password-${label}-${stamp}@example.test`;
  const hash = await bcrypt.hash(rawPassword, 12);
  const inserted = await query<{ id: number }>(
    `INSERT dbo.Users(email,password,name,role,is_active,email_verified,token_version)
     OUTPUT INSERTED.id VALUES(@email,@password,@name,@role,1,0,0)`,
    { email, password: hash, name: `SELLER001 password ${label}`, role },
  );
  return { id: Number(inserted.recordset[0].id), email };
}

async function login(email: string, rawPassword: string, expectedStatus = 200): Promise<LoginData | null> {
  const result = await expect('POST', '/auth/login', expectedStatus, undefined, {
    email,
    password: rawPassword,
  });
  return expectedStatus === 200 ? result.body.data as unknown as LoginData : null;
}

async function verifySuccessfulPasswordChange(role: Role) {
  console.log(`[TEST START] ${role.toUpperCase()} password change`);
  const oldPassword = password();
  const newPassword = password();
  const account = await seed(role, role, oldPassword);
  const session = (await login(account.email, oldPassword))!;
  check(session.user.role === role, `${role}: login returned wrong role`);

  const before = await query<{ token_version: number }>(
    'SELECT token_version FROM dbo.Users WHERE id=@id',
    { id: account.id },
  );
  await expect('POST', '/auth/password', 200, session.accessToken, {
    current_password: oldPassword,
    new_password: newPassword,
  });
  const after = await query<{ token_version: number }>(
    'SELECT token_version FROM dbo.Users WHERE id=@id',
    { id: account.id },
  );
  check(
    Number(after.recordset[0].token_version) === Number(before.recordset[0].token_version) + 1,
    `${role}: token_version did not increment`,
  );
  const activeSessions = await query<{ count: number }>(
    'SELECT COUNT(*) count FROM dbo.AuthSessions WHERE user_id=@id AND revoked_at IS NULL',
    { id: account.id },
  );
  check(Number(activeSessions.recordset[0].count) === 0, `${role}: active sessions were not revoked`);
  await expect('GET', '/auth/me', 401, session.accessToken);
  await expect('POST', '/auth/refresh', 401, undefined, { refreshToken: session.refreshToken });
  await login(account.email, oldPassword, 401);
  const nextSession = await login(account.email, newPassword);
  check(nextSession?.user.id === account.id, `${role}: new password login failed`);
  console.log(`[TEST PASS] ${role.toUpperCase()} password change`);
}

async function verifyPasswordErrors() {
  console.log('[TEST START] password business and validation errors');
  const oldPassword = password();
  const account = await seed('member', 'errors', oldPassword);
  const session = (await login(account.email, oldPassword))!;
  const wrong = await expect('POST', '/auth/password', 400, session.accessToken, {
    current_password: password(),
    new_password: password(),
  });
  check(wrong.body.message === 'Current password is incorrect', 'Wrong current password message is not explicit');
  await expect('GET', '/auth/me', 200, session.accessToken);
  const invalid = await expect('POST', '/auth/password', 400, session.accessToken, {
    current_password: oldPassword,
    new_password: 'weak',
  });
  check(invalid.body.message === 'Validation error', 'Invalid new password was not rejected by validation');
  await expect('GET', '/auth/me', 200, session.accessToken);
  console.log('[TEST PASS] password business and validation errors');
}

async function verifyExpiredAccessRefreshRetry() {
  console.log('[TEST START] expired access refresh and password retry');
  const oldPassword = password();
  const newPassword = password();
  const account = await seed('seller', 'refresh-retry', oldPassword);
  const session = (await login(account.email, oldPassword))!;
  const claims = jwt.decode(session.accessToken) as jwt.JwtPayload;
  const expiredAccessToken = jwt.sign(
    {
      userId: claims.userId,
      email: claims.email,
      role: claims.role,
      tokenVersion: claims.tokenVersion,
      sessionId: claims.sessionId,
    },
    config.jwt.accessSecret,
    {
      algorithm: 'HS256',
      expiresIn: -1,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    },
  );
  await expect('POST', '/auth/password', 401, expiredAccessToken, {
    current_password: oldPassword,
    new_password: newPassword,
  });
  const refreshed = await expect('POST', '/auth/refresh', 200, undefined, {
    refreshToken: session.refreshToken,
  });
  const refreshedData = refreshed.body.data as unknown as LoginData;
  const refreshedClaims = jwt.decode(refreshedData.accessToken) as jwt.JwtPayload;
  check(Number(refreshedClaims.userId) === account.id, 'Refreshed access token contains a stale/wrong userId');
  check(Number.isSafeInteger(Number(refreshedClaims.sessionId)), 'Refreshed access token has no valid sessionId');
  await expect('POST', '/auth/password', 200, refreshedData.accessToken, {
    current_password: oldPassword,
    new_password: newPassword,
  });
  await expect('GET', '/auth/me', 401, refreshedData.accessToken);
  await login(account.email, oldPassword, 401);
  const nextSession = await login(account.email, newPassword);
  check(nextSession?.user.role === 'seller', 'Seller could not log in with the new password after refresh retry');
  console.log('[TEST PASS] expired access refresh and password retry');
}

async function verifyRefreshFailureStops() {
  console.log('[TEST START] refresh failure is terminal');
  const beforeRequests = requests;
  await expect('POST', '/auth/refresh', 401, undefined, {
    refreshToken: crypto.randomBytes(48).toString('base64url'),
  });
  check(requests === beforeRequests + 1, 'Refresh failure triggered an unexpected retry loop');
  console.log('[TEST PASS] refresh failure is terminal');
}

async function startOwnedServer() {
  const { default: app } = await import('../app');
  server = app.listen(port, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    const onListening = () => {
      server?.off('error', onError);
      resolve();
    };
    const onError = (error: Error) => {
      server?.off('listening', onListening);
      reject(error);
    };
    server?.once('listening', onListening);
    server?.once('error', onError);
  });
  console.log(`[SERVER READY] port=${port} database=${config.db.database}`);
}

async function stopOwnedServer() {
  if (!server) return;
  server.closeAllConnections();
  await new Promise<void>(resolve => server?.close(() => resolve()));
  server = undefined;
  console.log('[CLEANUP] HTTP listener closed');
}

async function suite() {
  for (const role of ['member', 'coach', 'admin', 'seller'] as Role[]) {
    await verifySuccessfulPasswordChange(role);
  }
  await verifyPasswordErrors();
  await verifyExpiredAccessRefreshRetry();
  await verifyRefreshFailureStops();
}

async function run(): Promise<number> {
  const startedAt = Date.now();
  let timeout: NodeJS.Timeout | undefined;
  try {
    await startOwnedServer();
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        const error = new Error(`Suite timed out after ${suiteTimeoutMs}ms`);
        suiteAbort.abort(error);
        reject(error);
      }, suiteTimeoutMs);
      timeout.unref();
    });
    await Promise.race([suite(), timeoutPromise]);
    console.log(JSON.stringify({
      verdict: 'SELLER_001_PASSWORD_ACCEPTANCE_PASS',
      assertions,
      requests,
      database: config.db.database,
      durationMs: Date.now() - startedAt,
    }));
    return 0;
  } catch (error) {
    console.error(`[SUITE FAIL] ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  } finally {
    if (timeout) clearTimeout(timeout);
    suiteAbort.abort(new Error('Suite cleanup'));
    stopOrderExpirationRunner();
    try {
      await stopOwnedServer();
    } catch (error) {
      console.error(`[CLEANUP FAIL] HTTP listener: ${error instanceof Error ? error.message : String(error)}`);
    }
    try {
      await closePool();
      console.log('[CLEANUP] SQL pool closed');
    } catch (error) {
      console.error(`[CLEANUP FAIL] SQL pool: ${error instanceof Error ? error.message : String(error)}`);
    }
    console.log(`[SUITE END] durationMs=${Date.now() - startedAt}`);
  }
}

void run().then(code => process.exit(code));
