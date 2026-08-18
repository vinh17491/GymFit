import { Request, Response, NextFunction } from 'express';
import { query, getPool, sql } from '../../config/database';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';

export async function getPoints(req: Request, _res: Response, next: NextFunction) {
  try {
    const r = await query('SELECT * FROM Points WHERE user_id=@uid', { uid: req.user!.userId });
    if (r.recordset.length === 0) {
      await query('INSERT INTO Points (user_id, balance) VALUES (@uid, 0)', { uid: req.user!.userId });
      return sendSuccess(_res, { user_id: req.user!.userId, balance: 0, lifetime_earned: 0, lifetime_spent: 0 });
    }
    sendSuccess(_res, r.recordset[0]);
  } catch (err) { next(err); }
}

export async function getHistory(req: Request, _res: Response, next: NextFunction) {
  try {
    const r = await query('SELECT * FROM PointTransactions WHERE user_id=@uid ORDER BY created_at DESC', { uid: req.user!.userId });
    sendSuccess(_res, r.recordset);
  } catch (err) { next(err); }
}

export async function getRewardsCatalog(_req: Request, _res: Response, next: NextFunction) {
  try {
    const r = await query('SELECT * FROM RewardsCatalog WHERE is_active=1 AND stock>0');
    sendSuccess(_res, r.recordset);
  } catch (err) { next(err); }
}

export async function redeemReward(req: Request, _res: Response, next: NextFunction) {
  const tx=new sql.Transaction(await getPool());
  let complete=false;
  try {
    const { reward_id } = req.body;
    await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const reward = await new sql.Request(tx).input('id',sql.Int,reward_id).query(`SELECT id,name,points_cost,stock
      FROM dbo.RewardsCatalog WITH (UPDLOCK,HOLDLOCK)
      WHERE id=@id AND is_active=1 AND stock>0`);
    if (reward.recordset.length === 0) throw new AppError(404, 'Reward not found');
    const rw = reward.recordset[0];
    const points = await new sql.Request(tx).input('uid',sql.Int,req.user!.userId).query(`SELECT balance
      FROM dbo.Points WITH (UPDLOCK,HOLDLOCK) WHERE user_id=@uid`);
    if (!points.recordset.length || Number(points.recordset[0].balance) < Number(rw.points_cost))
      throw new AppError(400, 'Insufficient points');
    const debit=await new sql.Request(tx).input('uid',sql.Int,req.user!.userId).input('pts',sql.Int,Number(rw.points_cost)).query(`UPDATE dbo.Points
      SET balance=balance-@pts,lifetime_spent=lifetime_spent+@pts,updated_at=GETDATE()
      WHERE user_id=@uid AND balance>=@pts`);
    if (debit.rowsAffected[0] !== 1) throw new AppError(400, 'Insufficient points');
    await new sql.Request(tx).input('uid',sql.Int,req.user!.userId).input('pts',sql.Int,Number(rw.points_cost)).input('rid',sql.Int,reward_id).input('description',sql.NVarChar(200),String(rw.name)).query(`INSERT dbo.PointTransactions(user_id,type,points,source,reference_id,description)
      VALUES(@uid,N'spend',@pts,N'redeem',@rid,@description)`);
    const stock=await new sql.Request(tx).input('rid',sql.Int,reward_id).query(`UPDATE dbo.RewardsCatalog
      SET stock=stock-1 WHERE id=@rid AND stock>0`);
    if (stock.rowsAffected[0] !== 1) throw new AppError(409, 'Reward is no longer available');
    await new sql.Request(tx).input('uid',sql.Int,req.user!.userId).input('rid',sql.Int,reward_id).input('pts',sql.Int,Number(rw.points_cost)).query(`INSERT dbo.RewardRedemptions(user_id,reward_id,points_spent)
      VALUES(@uid,@rid,@pts)`);
    await tx.commit();complete=true;
    sendSuccess(_res, null, 'Reward redeemed', 201);
  } catch (err) {
    if(!complete)try{await tx.rollback();}catch{}
    next(err);
  }
}

export async function loginDailyPoints(req: Request, _res: Response, next: NextFunction) {
  const tx=new sql.Transaction(await getPool());
  try {await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);const request=new sql.Request(tx).input('uid',sql.Int,req.user!.userId);const today=await request.query(`SELECT id FROM PointTransactions WITH(UPDLOCK,HOLDLOCK) WHERE user_id=@uid AND source='login' AND CAST(created_at AS DATE)=CAST(GETDATE() AS DATE)`);if(today.recordset[0]){await tx.commit();return sendSuccess(_res,null,'Already claimed today');}await request.query(`IF NOT EXISTS(SELECT 1 FROM Points WHERE user_id=@uid) INSERT Points(user_id,balance,lifetime_earned,lifetime_spent) VALUES(@uid,0,0,0); UPDATE Points SET balance=balance+10,lifetime_earned=lifetime_earned+10,updated_at=GETDATE() WHERE user_id=@uid; INSERT PointTransactions(user_id,type,points,source,description) VALUES(@uid,'earn',10,'login','Daily login bonus')`);await tx.commit();sendSuccess(_res,{points_earned:10},'Daily login points claimed');}catch(err){try{await tx.rollback();}catch{}next(err);}
}
