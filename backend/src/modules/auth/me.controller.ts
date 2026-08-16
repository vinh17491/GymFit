import { Request, Response, NextFunction } from 'express';
import { query } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';
import * as bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const result = await query('SELECT id,email,name,phone,role,referral_code,avatar_url,is_active,created_at FROM Users WHERE id=@id', { id: userId });
    if (result.recordset.length === 0) throw new AppError(404, 'User not found');
    sendSuccess(res, result.recordset[0]);
  } catch (err) { next(err); }
}

export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { name, phone } = req.body;
    const result = await query(
      'UPDATE Users SET name=@name, phone=@phone, updated_at=GETDATE() OUTPUT INSERTED.id,INSERTED.email,INSERTED.name,INSERTED.phone,INSERTED.role,INSERTED.referral_code,INSERTED.avatar_url,INSERTED.is_active WHERE id=@id AND is_active=1',
      { id: userId, name, phone: phone || null }
    );
    if (result.recordset.length === 0) throw new AppError(404, 'User not found');
    sendSuccess(res, result.recordset[0], 'Profile updated');
  } catch (err) { next(err); }
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { current_password, new_password } = req.body;
    const getUser = await query('SELECT password FROM Users WHERE id=@id', { id: userId });
    if (getUser.recordset.length === 0) throw new AppError(404, 'User not found');

    const stored = getUser.recordset[0].password;
    const valid = await bcrypt.compare(current_password, stored);
    if (!valid) throw new AppError(400, 'Current password is incorrect');

    const hashed = await bcrypt.hash(new_password, 12);
    await query(`UPDATE Users SET password=@password,token_version=token_version+1,updated_at=GETDATE() WHERE id=@id;
      UPDATE AuthSessions SET revoked_at=COALESCE(revoked_at,SYSUTCDATETIME()) WHERE user_id=@id`, { id: userId, password: hashed });
    sendSuccess(res, null, 'Password changed successfully');
  } catch (err) { next(err); }
}

export async function uploadAvatar(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new AppError(400, 'Avatar file required');
    const userId = req.user!.userId;
    const metadata = await sharp(req.file.buffer).metadata();
    if (!['jpeg','png','webp'].includes(metadata.format || '') || !metadata.width || !metadata.height) throw new AppError(400, 'Invalid avatar image');
    const directory=path.resolve(process.cwd(),'uploads','avatars'); await fs.mkdir(directory,{recursive:true});
    const filename=`avatar-${userId}-${Date.now()}.webp`; const target=path.join(directory,filename);
    await sharp(req.file.buffer).rotate().resize(1024,1024,{fit:'inside',withoutEnlargement:true}).webp({quality:85}).toFile(target);
    const previous=await query<{avatar_url:string|null}>('SELECT avatar_url FROM Users WHERE id=@id AND is_active=1',{id:userId});
    if(!previous.recordset[0]) { await fs.unlink(target).catch(()=>undefined); throw new AppError(401,'Authentication required'); }
    const avatarUrl = `/uploads/avatars/${filename}`;
    try { await query('UPDATE Users SET avatar_url=@avatarUrl, updated_at=GETDATE() WHERE id=@id AND is_active=1', { avatarUrl, id: userId }); }
    catch(error){await fs.unlink(target).catch(()=>undefined);throw error;}
    const old=previous.recordset[0].avatar_url;
    if(old?.startsWith('/uploads/avatars/')) await fs.unlink(path.join(directory,path.basename(old))).catch(()=>undefined);
    sendSuccess(res, { avatar_url: avatarUrl }, 'Avatar uploaded');
  } catch (err) { next(err); }
}

export async function deleteAvatar(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const previous=await query<{avatar_url:string|null}>('SELECT avatar_url FROM Users WHERE id=@id AND is_active=1',{id:userId});
    await query('UPDATE Users SET avatar_url=NULL, updated_at=GETDATE() WHERE id=@id AND is_active=1', { id: userId });
    const old=previous.recordset[0]?.avatar_url;
    if(old?.startsWith('/uploads/avatars/')) await fs.unlink(path.join(path.resolve(process.cwd(),'uploads','avatars'),path.basename(old))).catch(()=>undefined);
    sendSuccess(res, null, 'Avatar removed');
  } catch (err) { next(err); }
}
