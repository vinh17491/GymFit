import { NextFunction, Request, Response } from "express";
import { getPool } from "../config/database";

export const getAllCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query("SELECT * FROM SupplementCategories WHERE IsActive = 1 ORDER BY CreatedAt DESC");
    res.status(200).json(result.recordset);
  } catch (error) {
    next({ message: "Unable to fetch categories", error });
  }
};

export const getSingleCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("id", Number(req.params.id))
      .query("SELECT * FROM SupplementCategories WHERE Id = @id");
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.status(200).json(result.recordset[0]);
  } catch (error) {
    next({ message: "Unable to fetch category", error });
  }
};