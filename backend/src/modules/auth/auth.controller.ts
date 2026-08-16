import { Request, Response, NextFunction } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { config } from '../../config/config';
import { getPool, query, sql } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';
import { UserRole } from '../../types';

interface SessionUser { id:number; email:string; name:string; phone:string|null; role:UserRole; referral_code:string|null; avatar_url:string|null; is_active:boolean; token_version:number }
const DUMMY_HASH = '$2a$12$5wX0mH8qZf4RcjOWnH6sEeZoD2nB9QHREJXiBkH4i8D0jRToVZNmS';
const normalizeEmail = (value:string) => value.trim().toLowerCase();
const tokenHash = (token:string) => crypto.createHash('sha256').update(token).digest('hex');
const refreshLifetimeMs = () => { const match=/^(\d+)([smhd])$/.exec(config.jwt.refreshExpires); return match ? Number(match[1])*({s:1000,m:60000,h:3600000,d:86400000}[match[2]]!) : 7*86400000; };
const sessionUser = (u:Record<string, unknown>):SessionUser => ({ id:Number(u.id),email:String(u.email),name:String(u.name),phone:u.phone?String(u.phone):null,role:u.role as UserRole,referral_code:u.referral_code?String(u.referral_code):null,avatar_url:u.avatar_url?String(u.avatar_url):null,is_active:Boolean(u.is_active),token_version:Number(u.token_version) });
const publicUser = ({token_version:_tokenVersion,...user}:SessionUser) => user;
function accessToken(user:SessionUser,sessionId:number):string { return jwt.sign({userId:user.id,email:user.email,role:user.role,tokenVersion:user.token_version,sessionId},config.jwt.accessSecret,{algorithm:'HS256',expiresIn:config.jwt.accessExpires as jwt.SignOptions['expiresIn'],issuer:config.jwt.issuer,audience:config.jwt.audience}); }
async function createSession(user:SessionUser,family=crypto.randomUUID(),transaction?:sql.Transaction) {
  const refreshToken=crypto.randomBytes(48).toString('base64url');
  const values={userId:user.id,hash:tokenHash(refreshToken),family,expiresAt:new Date(Date.now()+refreshLifetimeMs())};
  const result=transaction
    ? await new sql.Request(transaction).input('userId',sql.Int,values.userId).input('hash',sql.Char(64),values.hash).input('family',sql.UniqueIdentifier,values.family).input('expiresAt',sql.DateTime2,values.expiresAt).query<{id:number}>(`INSERT dbo.AuthSessions(user_id,refresh_token_hash,token_family,expires_at) OUTPUT INSERTED.id VALUES(@userId,@hash,@family,@expiresAt)`)
    : await query<{id:number}>(`INSERT dbo.AuthSessions(user_id,refresh_token_hash,token_family,expires_at) OUTPUT INSERTED.id VALUES(@userId,@hash,@family,@expiresAt)`,values);
  return {accessToken:accessToken(user,Number(result.recordset[0].id)),refreshToken};
}
function generateReferralCode(name:string):string { return (name.slice(0,4).toUpperCase()+crypto.randomBytes(3).toString('hex')).slice(0,10); }

export async function register(req:Request,res:Response,next:NextFunction) {
  let transaction:sql.Transaction|undefined;let complete=false;
  try {
    const email=normalizeEmail(req.body.email); const {password,name,phone,referral_code}=req.body;
    const hashed=await bcrypt.hash(password,12); const refCode=generateReferralCode(name);
    transaction=new sql.Transaction(await getPool());await transaction.begin();
    const result=await new sql.Request(transaction).input('email',sql.NVarChar(255),email).input('password',sql.NVarChar(255),hashed).input('name',sql.NVarChar(100),name.trim()).input('phone',sql.NVarChar(20),phone?.trim()||null).input('refCode',sql.NVarChar(10),refCode).query(`INSERT dbo.Users(email,password,name,phone,role,referral_code,is_active,email_verified,token_version) OUTPUT INSERTED.id,INSERTED.email,INSERTED.name,INSERTED.phone,INSERTED.role,INSERTED.referral_code,INSERTED.avatar_url,INSERTED.is_active,INSERTED.token_version VALUES(@email,@password,@name,@phone,'member',@refCode,1,0,0)`);
    const user=sessionUser(result.recordset[0]);
    if(referral_code){
      const referrer=await new sql.Request(transaction).input('code',sql.NVarChar(20),String(referral_code).trim()).query('SELECT id FROM dbo.Users WHERE referral_code=@code');
      if(referrer.recordset[0])await new sql.Request(transaction).input('refId',sql.Int,referrer.recordset[0].id).input('newId',sql.Int,user.id).query(`INSERT dbo.ReferralTransactions(referrer_id,referred_id,commission_amount,transaction_type,created_at) VALUES(@refId,@newId,0,'registration',GETDATE()); UPDATE dbo.Users SET referred_by=@refId WHERE id=@newId`);
    }
    const tokens=await createSession(user,crypto.randomUUID(),transaction);await transaction.commit();complete=true;
    sendSuccess(res,{user:publicUser(user),...tokens},'Registered',201);
  } catch(error){
    if(transaction&&!complete)try{await transaction.rollback();}catch{}
    if([2601,2627].includes((error as {number?:number}).number||0))return next(new AppError(409,'Email already registered'));
    next(error);
  }
}

export async function login(req:Request,res:Response,next:NextFunction) {
  try { const email=normalizeEmail(req.body.email);const result=await query(`SELECT id,email,name,phone,role,referral_code,avatar_url,is_active,token_version,password FROM dbo.Users WHERE LOWER(email)=@email`,{email}); const row=result.recordset[0];const valid=await bcrypt.compare(req.body.password,row?.password||DUMMY_HASH); if(!row||!valid||!row.is_active) throw new AppError(401,'Invalid email or password');await query('UPDATE dbo.Users SET last_login_at=GETDATE() WHERE id=@id',{id:row.id}); const user=sessionUser(row);sendSuccess(res,{user:publicUser(user),...await createSession(user)},'Login successful'); }
  catch(error){next(error);}
}
export async function logout(req:Request,res:Response,next:NextFunction) { try{await query('UPDATE dbo.AuthSessions SET revoked_at=COALESCE(revoked_at,SYSUTCDATETIME()) WHERE id=@id AND user_id=@uid',{id:req.user!.sessionId,uid:req.user!.userId});sendSuccess(res,null,'Logged out');}catch(error){next(error);} }
export async function getMe(req:Request,res:Response,next:NextFunction) { try{const result=await query('SELECT id,email,name,phone,role,referral_code,avatar_url,is_active,created_at FROM dbo.Users WHERE id=@id AND is_active=1',{id:req.user!.userId});if(!result.recordset[0])throw new AppError(401,'Authentication required');sendSuccess(res,result.recordset[0]);}catch(error){next(error);} }

export async function refreshToken(req:Request,res:Response,next:NextFunction) {
  const raw=typeof req.body?.refreshToken==='string'?req.body.refreshToken:''; if(!raw)return next(new AppError(400,'Refresh token required'));
  const tx=new sql.Transaction(await getPool()); let complete=false;
  try {
    await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const found=await new sql.Request(tx).input('hash',sql.Char(64),tokenHash(raw)).query(`SELECT s.id AS session_id,s.user_id,s.token_family,s.expires_at,s.revoked_at,u.id,u.email,u.name,u.phone,u.role,u.referral_code,u.avatar_url,u.is_active,u.token_version FROM dbo.AuthSessions s WITH(UPDLOCK,HOLDLOCK) JOIN dbo.Users u ON u.id=s.user_id WHERE s.refresh_token_hash=@hash`);
    const row=found.recordset[0]; if(!row){await tx.rollback();complete=true;throw new AppError(401,'Invalid refresh token');}
    if(row.revoked_at){await new sql.Request(tx).input('family',sql.UniqueIdentifier,row.token_family).query('UPDATE dbo.AuthSessions SET revoked_at=COALESCE(revoked_at,SYSUTCDATETIME()) WHERE token_family=@family');await tx.commit();complete=true;throw new AppError(401,'Refresh token replay detected');}
    if(!row.is_active||new Date(row.expires_at)<=new Date()){await new sql.Request(tx).input('id',sql.BigInt,row.session_id).query('UPDATE dbo.AuthSessions SET revoked_at=COALESCE(revoked_at,SYSUTCDATETIME()) WHERE id=@id');await tx.commit();complete=true;throw new AppError(401,'Invalid refresh token');}
    const nextRaw=crypto.randomBytes(48).toString('base64url'); const inserted=await new sql.Request(tx).input('uid',sql.Int,row.user_id).input('hash',sql.Char(64),tokenHash(nextRaw)).input('family',sql.UniqueIdentifier,row.token_family).input('expires',sql.DateTime2,new Date(Date.now()+refreshLifetimeMs())).query('INSERT dbo.AuthSessions(user_id,refresh_token_hash,token_family,expires_at) OUTPUT INSERTED.id VALUES(@uid,@hash,@family,@expires)'); const nextId=Number(inserted.recordset[0].id);
    await new sql.Request(tx).input('old',sql.BigInt,row.session_id).input('next',sql.BigInt,nextId).query('UPDATE dbo.AuthSessions SET revoked_at=SYSUTCDATETIME(),last_used_at=SYSUTCDATETIME(),replaced_by_session_id=@next WHERE id=@old AND revoked_at IS NULL'); await tx.commit();complete=true; const user=sessionUser(row); sendSuccess(res,{accessToken:accessToken(user,nextId),refreshToken:nextRaw,user:publicUser(user)});
  } catch(error){if(!complete)try{await tx.rollback();}catch{}next(error);}
}
