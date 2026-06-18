import { NextFunction, Request, Response } from "express";
import { getPool } from "../config/database";

type AuthRequest = Request & { userId?: number; roleName?: string };

export const getCreditBalance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const pool = await getPool();
    let result = await pool.request().input("userId", userId)
      .query("SELECT * FROM Credits WHERE UserId = @userId");
    if (result.recordset.length === 0) {
      await pool.request().input("userId", userId)
        .query("INSERT INTO Credits (UserId, Balance) VALUES (@userId, 0)");
      return res.json({ userId, balance: 0 });
    }
    res.json(result.recordset[0]);
  } catch (err) { next(err); }
};

export const getCreditTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const pool = await getPool();
    const result = await pool.request().input("userId", userId)
      .query("SELECT * FROM CreditTransactions WHERE UserId = @userId ORDER BY CreatedAt DESC");
    res.json(result.recordset);
  } catch (err) { next(err); }
};

export const purchaseCredits = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const { amount, paymentMethod } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: "Invalid amount" });
    const pool = await getPool();
    await pool.request()
      .input("userId", userId).input("amount", amount).input("paymentMethod", paymentMethod || "CREDIT_CARD")
      .input("description", `Purchase ${amount} credits`)
      .query(`BEGIN TRY
        BEGIN TRANSACTION;
        IF NOT EXISTS (SELECT 1 FROM Credits WHERE UserId = @userId)
          INSERT INTO Credits (UserId, Balance) VALUES (@userId, @amount);
        ELSE
          UPDATE Credits SET Balance = Balance + @amount WHERE UserId = @userId;
        INSERT INTO CreditTransactions (UserId, Type, Amount, Description) VALUES (@userId, 'PURCHASE', @amount, @description);
        COMMIT TRANSACTION;
      END TRY
      BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
      END CATCH`);
    res.json({ message: "Credits purchased", amount });
  } catch (err) { next(err); }
};

export const redeemReward = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const { rewardItem, cost } = req.body;
    const pool = await getPool();
    const credit = await pool.request().input("userId", userId).query("SELECT Balance FROM Credits WHERE UserId = @userId");
    if (!credit.recordset[0] || credit.recordset[0].Balance < cost)
      return res.status(400).json({ message: "Insufficient credits" });
    await pool.request()
      .input("userId", userId).input("cost", cost).input("rewardItem", rewardItem)
      .query(`BEGIN TRY
        BEGIN TRANSACTION;
        UPDATE Credits SET Balance = Balance - @cost WHERE UserId = @userId;
        INSERT INTO CreditTransactions (UserId, Type, Amount, Description) VALUES (@userId, 'REDEEM', -@cost, @rewardItem);
        COMMIT TRANSACTION;
      END TRY
      BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
      END CATCH`);
    res.json({ message: "Reward redeemed", rewardItem });
  } catch (err) { next(err); }
};

export const adminAdjustCredits = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, amount, description } = req.body;
    const pool = await getPool();
    await pool.request()
      .input("userId", userId).input("amount", amount).input("description", description || "Admin adjustment")
      .query(`BEGIN TRY
        BEGIN TRANSACTION;
        IF NOT EXISTS (SELECT 1 FROM Credits WHERE UserId = @userId)
          INSERT INTO Credits (UserId, Balance) VALUES (@userId, @amount);
        ELSE
          UPDATE Credits SET Balance = Balance + @amount WHERE UserId = @userId;
        INSERT INTO CreditTransactions (UserId, Type, Amount, Description) VALUES (@userId, 'ADMIN', @amount, @description);
        COMMIT TRANSACTION;
      END TRY
      BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
      END CATCH`);
    res.json({ message: "Credits adjusted" });
  } catch (err) { next(err); }
};

export const getRewardsCatalog = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query("SELECT * FROM RewardsCatalog WHERE IsActive = 1 ORDER BY Cost ASC");
    res.json(result.recordset);
  } catch (err) { next(err); }
};