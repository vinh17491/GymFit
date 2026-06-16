import { NextFunction, Request, Response } from "express";
import bcrypt from "bcrypt";
import { getPool } from "../config/database";
import { signAccessToken, signRefreshToken, TokenPayload } from "../config/jwt";
import { OAuth2Client } from "google-auth-library";
import dotenv from "dotenv";

dotenv.config();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, fullName, phone } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({ message: "Email, password, and fullName are required" });
    }

    const pool = await getPool();

    // Check existing user
    const existing = await pool.request()
      .input("email", email)
      .query("SELECT Id FROM Users WHERE Email = @email");
    if (existing.recordset.length > 0) {
      return res.status(400).json({ message: "User with given email already exists" });
    }

    // Default role: MEMBER (3)
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.request()
      .input("email", email)
      .input("passwordHash", passwordHash)
      .input("fullName", fullName)
      .input("phone", phone || null)
      .input("roleId", 3) // MEMBER
      .query(`
        INSERT INTO Users (Email, PasswordHash, FullName, Phone, RoleId)
        OUTPUT INSERTED.Id
        VALUES (@email, @passwordHash, @fullName, @phone, @roleId)
      `);

    const userId = result.recordset[0].Id;

    // Get role name
    const roleResult = await pool.request()
      .input("roleId", 3)
      .query("SELECT Name FROM Roles WHERE Id = @roleId");
    const roleName = roleResult.recordset[0].Name;

    const payload: TokenPayload = { userId, email, roleId: 3, roleName };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.request()
      .input("userId", userId)
      .input("token", refreshToken)
      .input("expiresAt", expiresAt)
      .query("INSERT INTO RefreshTokens (UserId, Token, ExpiresAt) VALUES (@userId, @token, @expiresAt)");

    res.status(201).json({ accessToken, refreshToken, user: { id: userId, email, fullName, role: roleName } });
  } catch (error) {
    next({ message: "Unable to sign up the user", error });
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input("email", email)
      .query(`
        SELECT u.Id, u.Email, u.PasswordHash, u.FullName, u.RoleId, r.Name AS RoleName
        FROM Users u
        JOIN Roles r ON u.RoleId = r.Id
        WHERE u.Email = @email AND u.IsActive = 1
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = result.recordset[0];
    const valid = await bcrypt.compare(password, user.PasswordHash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const payload: TokenPayload = { userId: user.Id, email: user.Email, roleId: user.RoleId, roleName: user.RoleName };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.request()
      .input("userId", user.Id)
      .input("token", refreshToken)
      .input("expiresAt", expiresAt)
      .query("INSERT INTO RefreshTokens (UserId, Token, ExpiresAt) VALUES (@userId, @token, @expiresAt)");

    res.status(200).json({
      accessToken,
      refreshToken,
      user: { id: user.Id, email: user.Email, fullName: user.FullName, role: user.RoleName },
    });
  } catch (error) {
    next({ message: "Unable to login", error });
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input("token", token)
      .query("SELECT Id, UserId, IsRevoked, ExpiresAt FROM RefreshTokens WHERE Token = @token");

    if (result.recordset.length === 0 || result.recordset[0].IsRevoked) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const stored = result.recordset[0];
    if (new Date(stored.ExpiresAt) < new Date()) {
      return res.status(401).json({ message: "Refresh token expired" });
    }

    // Revoke old token
    await pool.request()
      .input("id", stored.Id)
      .query("UPDATE RefreshTokens SET IsRevoked = 1 WHERE Id = @id");

    // Get user info
    const userResult = await pool.request()
      .input("userId", stored.UserId)
      .query("SELECT u.Id, u.Email, u.RoleId, r.Name AS RoleName FROM Users u JOIN Roles r ON u.RoleId = r.Id WHERE u.Id = @userId");
    const user = userResult.recordset[0];

    const payload: TokenPayload = { userId: user.Id, email: user.Email, roleId: user.RoleId, roleName: user.RoleName };
    const newAccessToken = signAccessToken(payload);
    const newRefreshToken = signRefreshToken(payload);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.request()
      .input("userId", user.Id)
      .input("token", newRefreshToken)
      .input("expiresAt", expiresAt)
      .query("INSERT INTO RefreshTokens (UserId, Token, ExpiresAt) VALUES (@userId, @token, @expiresAt)");

    res.status(200).json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    next({ message: "Unable to refresh token", error });
  }
};

export const registerWithGoogle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: "Google credential is required" });
    }

    // Verify Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ message: "Invalid Google token" });
    }

    const googleId = payload.sub;
    const email = payload.email;
    const fullName = payload.name || email.split("@")[0];

    const pool = await getPool();

    // Check if user exists by email
    const existing = await pool.request()
      .input("email", email)
      .query("SELECT u.Id, u.Email, u.FullName, u.RoleId, r.Name AS RoleName FROM Users u JOIN Roles r ON u.RoleId = r.Id WHERE u.Email = @email AND u.IsActive = 1");

    let userId: number;
    let roleId: number;
    let roleName: string;

    if (existing.recordset.length > 0) {
      // User exists - update googleId if not set
      const user = existing.recordset[0];
      userId = user.Id;
      roleId = user.RoleId;
      roleName = user.RoleName;
    } else {
      // Create new user with default MEMBER role
      roleId = 3;
      const result = await pool.request()
        .input("email", email)
        .input("fullName", fullName)
        .input("roleId", roleId)
        .input("googleId", googleId)
        .query(`
          INSERT INTO Users (Email, FullName, RoleId, GoogleId, IsActive)
          OUTPUT INSERTED.Id
          VALUES (@email, @fullName, @roleId, @googleId, 1)
        `);
      userId = result.recordset[0].Id;

      const roleResult = await pool.request()
        .input("roleId", roleId)
        .query("SELECT Name FROM Roles WHERE Id = @roleId");
      roleName = roleResult.recordset[0].Name;
    }

    // Generate JWT tokens
    const tokenPayload: TokenPayload = { userId, email, roleId, roleName };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.request()
      .input("userId", userId)
      .input("token", refreshToken)
      .input("expiresAt", expiresAt)
      .query("INSERT INTO RefreshTokens (UserId, Token, ExpiresAt) VALUES (@userId, @token, @expiresAt)");

    res.status(200).json({
      accessToken,
      refreshToken,
      user: { id: userId, email, fullName, role: roleName },
    });
  } catch (error) {
    next({ message: "Unable to authenticate with Google", error });
  }
};
