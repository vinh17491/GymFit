import { Router } from 'express';
import { z } from 'zod';
import { authenticate,authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { getPool,query,sql } from '../../config/database';
import { UserRole } from '../../types';
import { AppError } from '../../middleware/errorHandler';

const router=Router();
const list=z.object({search:z.string().trim().max(100).optional(),page:z.coerce.number().int().min(1).default(1),limit:z.coerce.number().int().min(1).max(100).default(20)}).strict();
router.get('/',authenticate,validate(list,'query'),async(req,res,next)=>{try{const {search,page,limit}=req.query as unknown as {search?:string;page:number;limit:number};const role=req.user!.role;let where=role==='admin'?' WHERE 1=1':role==='coach'?' JOIN CRMCustomers c ON c.user_id=u.id WHERE c.assigned_coach_id=@actor':' WHERE u.id=@actor';const params:Record<string,unknown>={actor:req.user!.userId,offset:(page-1)*limit,limit};if(search){where+=' AND (u.name LIKE @search OR u.email LIKE @search)';params.search=`%${search}%`;}const rows=await query(`SELECT u.id,u.email,u.name,u.phone,u.role,u.avatar_url,u.is_active,u.created_at FROM Users u${where} ORDER BY u.created_at DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,params);const count=await query(`SELECT COUNT(*) total FROM Users u${where}`,params);res.json({success:true,data:{items:rows.recordset,page,limit,total:Number(count.recordset[0].total)}});}catch(error){next(error);}});
router.patch('/:id/security',authenticate,authorize(UserRole.ADMIN),validate(z.object({id:z.coerce.number().int().positive()}),'params'),validate(z.object({role:z.nativeEnum(UserRole).optional(),is_active:z.boolean().optional()}).strict().refine(v=>v.role!==undefined||v.is_active!==undefined)),async(req,res,next)=>{
  const tx=(await getPool()).transaction();let started=false;
  try{
    const id=Number(req.params.id);
    if(id===req.user!.userId&&req.body.is_active===false)throw new AppError(409,'Admin cannot disable the current session account');
    await tx.begin();started=true;
    const current=await tx.request().input('id',sql.Int,id).query<{role:UserRole;is_active:boolean}>('SELECT role,is_active FROM Users WITH(UPDLOCK,HOLDLOCK) WHERE id=@id');
    if(!current.recordset[0])throw new AppError(404,'User not found');
    const before={role:current.recordset[0].role,isActive:Boolean(current.recordset[0].is_active)};
    const role=req.body.role??before.role,active=req.body.is_active??before.isActive;
    const updated=await tx.request().input('id',sql.Int,id).input('role',sql.NVarChar(20),role).input('active',sql.Bit,active)
      .query('UPDATE Users SET role=@role,is_active=@active,token_version=token_version+1,updated_at=GETDATE() OUTPUT INSERTED.id,INSERTED.email,INSERTED.name,INSERTED.role,INSERTED.is_active WHERE id=@id');
    await tx.request().input('id',sql.Int,id).query('UPDATE AuthSessions SET revoked_at=COALESCE(revoked_at,SYSUTCDATETIME()) WHERE user_id=@id');
    await tx.request().input('actor',sql.Int,req.user!.userId).input('target',sql.Int,id)
      .input('oldValue',sql.NVarChar(sql.MAX),JSON.stringify(before))
      .input('newValue',sql.NVarChar(sql.MAX),JSON.stringify({role,isActive:active}))
      .query(`INSERT dbo.AuditLogs(user_id,action,entity_type,entity_id,old_value,new_value,timestamp)
        VALUES(@actor,N'user.security_updated',N'User',@target,@oldValue,@newValue,SYSUTCDATETIME())`);
    await tx.commit();started=false;
    res.json({success:true,data:updated.recordset[0]});
  }catch(error){if(started)await tx.rollback();next(error);}
});
export default router;
