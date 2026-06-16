import { NextFunction, Request, Response } from "express";
import { getPool } from "../config/database";

export const getAllOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT o.*, u.FullName AS UserName, u.Email AS UserEmail 
              FROM Orders o 
              JOIN Users u ON o.UserId = u.Id 
              ORDER BY o.CreatedAt DESC`);
    res.status(200).json(result.recordset);
  } catch (error) {
    next({ message: "Unable to fetch orders", error });
  }
};

export const getOrdersByUserId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("userId", Number(req.params.id))
      .query(`SELECT o.*, u.FullName AS UserName, u.Email AS UserEmail 
              FROM Orders o 
              JOIN Users u ON o.UserId = u.Id 
              WHERE o.UserId = @userId 
              ORDER BY o.CreatedAt DESC`);
    res.status(200).json(result.recordset);
  } catch (error) {
    next({ message: "Unable to fetch orders", error });
  }
};