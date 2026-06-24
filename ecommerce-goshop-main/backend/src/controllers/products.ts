import { NextFunction, Request, Response } from "express";
import { getPool } from "../config/database";

export const getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.request()
      .query("SELECT COUNT(*) AS Total FROM Supplements WHERE IsActive = 1");
    const total = countResult.recordset[0].Total;

    const result = await pool.request()
      .input("offset", offset)
      .input("limit", limit)
      .query(`SELECT s.*, sc.Name AS CategoryName 
              FROM Supplements s 
              LEFT JOIN SupplementCategories sc ON s.CategoryId = sc.Id 
              WHERE s.IsActive = 1 
              ORDER BY s.CreatedAt DESC
              OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);
    res.status(200).json({ data: result.recordset, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    next({ message: "Unable to fetch products", error });
  }
};

export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("id", req.params.id)
      .query(`SELECT s.*, sc.Name AS CategoryName 
              FROM Supplements s 
              LEFT JOIN SupplementCategories sc ON s.CategoryId = sc.Id 
              WHERE s.Id = @id`);
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json(result.recordset[0]);
  } catch (error) {
    next({ message: "Unable to fetch product", error });
  }
};

export const getProductsByCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("categoryId", Number(req.params.id))
      .query(`SELECT s.*, sc.Name AS CategoryName 
              FROM Supplements s 
              LEFT JOIN SupplementCategories sc ON s.CategoryId = sc.Id 
              WHERE s.CategoryId = @categoryId AND s.IsActive = 1 
              ORDER BY s.CreatedAt DESC`);
    res.status(200).json(result.recordset);
  } catch (error) {
    next({ message: "Unable to fetch products by category", error });
  }
};

export const searchForProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { searchQuery } = req.body;
    if (!searchQuery) {
      return res.status(400).json({ message: "Search query is required" });
    }
    // Limit search length to prevent DoS
    if (typeof searchQuery !== "string" || searchQuery.length > 200) {
      return res.status(400).json({ message: "Search query must be under 200 characters" });
    }
    const pool = await getPool();
    const result = await pool.request()
      .input("search", `%${searchQuery}%`)
      .query(`SELECT s.*, sc.Name AS CategoryName 
              FROM Supplements s 
              LEFT JOIN SupplementCategories sc ON s.CategoryId = sc.Id 
              WHERE (s.Name LIKE @search OR s.Description LIKE @search) AND s.IsActive = 1 
              ORDER BY s.CreatedAt DESC`);
    res.status(200).json(result.recordset);
  } catch (error) {
    next({ message: "Unable to search products", error });
  }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, price, stockQuantity, categoryId, brand, weight, flavor } = req.body;
    if (!name || !price) {
      return res.status(400).json({ message: "Name and price are required" });
    }

    const image = (req as Request & { image?: string }).image || null;

    const pool = await getPool();
    const result = await pool.request()
      .input("name", name)
      .input("description", description || null)
      .input("price", Number(price))
      .input("stockQuantity", Number(stockQuantity) || 0)
      .input("image", image)
      .input("categoryId", categoryId ? Number(categoryId) : null)
      .input("brand", brand || null)
      .input("weight", weight || null)
      .input("flavor", flavor || null)
      .query(`
        INSERT INTO Supplements (Name, Description, Price, StockQuantity, Image, CategoryId, Brand, Weight, Flavor)
        OUTPUT INSERTED.*
        VALUES (@name, @description, @price, @stockQuantity, @image, @categoryId, @brand, @weight, @flavor)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (error) {
    next({ message: "Unable to create product", error });
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = Number(req.params.id);
    const pool = await getPool();

    const existing = await pool.request()
      .input("id", productId)
      .query("SELECT * FROM Supplements WHERE Id = @id");
    if (existing.recordset.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = existing.recordset[0];
    const image = (req as Request & { image?: string }).image || product.Image;

    const name = req.body.name ?? product.Name;
    const description = req.body.description ?? product.Description;
    const price = req.body.price !== undefined ? Number(req.body.price) : Number(product.Price);
    const stockQuantity = req.body.stockQuantity !== undefined ? Number(req.body.stockQuantity) : product.StockQuantity;
    const brand = req.body.brand ?? product.Brand;
    const weight = req.body.weight ?? product.Weight;
    const flavor = req.body.flavor ?? product.Flavor;
    const categoryId = req.body.categoryId !== undefined ? Number(req.body.categoryId) : product.CategoryId;

    const result = await pool.request()
      .input("id", productId)
      .input("name", name)
      .input("description", description)
      .input("price", price)
      .input("stockQuantity", stockQuantity)
      .input("image", image)
      .input("categoryId", categoryId)
      .input("brand", brand)
      .input("weight", weight)
      .input("flavor", flavor)
      .query(`
        UPDATE Supplements 
        SET Name = @name, Description = @description, Price = @price, StockQuantity = @stockQuantity,
            Image = @image, CategoryId = @categoryId, Brand = @brand, Weight = @weight, Flavor = @flavor,
            UpdatedAt = GETUTCDATE()
        OUTPUT INSERTED.*
        WHERE Id = @id
      `);

    res.status(200).json(result.recordset[0]);
  } catch (error) {
    next({ message: "Unable to update product", error });
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = Number(req.params.id);
    const pool = await getPool();

    const existing = await pool.request()
      .input("id", productId)
      .query("SELECT Id FROM Supplements WHERE Id = @id");
    if (existing.recordset.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Soft delete
    await pool.request()
      .input("id", productId)
      .query("UPDATE Supplements SET IsActive = 0, UpdatedAt = GETUTCDATE() WHERE Id = @id");

    res.status(200).json({ message: "Product deleted" });
  } catch (error) {
    next({ message: "Unable to delete product", error });
  }
};