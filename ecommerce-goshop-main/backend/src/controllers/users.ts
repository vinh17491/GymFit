import { NextFunction, Request, Response } from "express";
import { getPool } from "../config/database";

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("id", Number(req.params.id))
      .query("SELECT Id, Email, FullName, Phone, Avatar, RoleId, IsActive, CreatedAt FROM Users WHERE Id = @id");
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(result.recordset[0]);
  } catch (error) {
    next({ message: "Unable to fetch user", error });
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = Number(req.params.id);
    const pool = await getPool();

    const existing = await pool.request()
      .input("id", userId)
      .query("SELECT * FROM Users WHERE Id = @id");
    if (existing.recordset.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const avatar = req.image || req.body.avatar || existing.recordset[0].Avatar;
    const fullName = req.body.fullName ?? existing.recordset[0].FullName;
    const phone = req.body.phone ?? existing.recordset[0].Phone;

    const result = await pool.request()
      .input("id", userId)
      .input("fullName", fullName)
      .input("phone", phone)
      .input("avatar", avatar)
      .query(`UPDATE Users SET FullName = @fullName, Phone = @phone, Avatar = @avatar, UpdatedAt = GETUTCDATE() OUTPUT INSERTED.Id, INSERTED.Email, INSERTED.FullName, INSERTED.Phone, INSERTED.Avatar, INSERTED.RoleId WHERE Id = @id`);

    res.status(200).json(result.recordset[0]);
  } catch (error) {
    next({ message: "Unable to update user", error });
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("id", Number(req.params.id))
      .query("UPDATE Users SET IsActive = 0, UpdatedAt = GETUTCDATE() WHERE Id = @id");
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User deactivated" });
  } catch (error) {
    next({ message: "Unable to delete user", error });
  }
};

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query("SELECT Id, Email, FullName, Phone, Avatar, RoleId, IsActive, CreatedAt FROM Users ORDER BY CreatedAt DESC");
    res.status(200).json(result.recordset);
  } catch (error) {
    next({ message: "Unable to fetch users", error });
  }
};