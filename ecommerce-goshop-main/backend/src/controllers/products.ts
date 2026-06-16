import { NextFunction, Request, Response } from "express";
import { getPool } from "../config/database";
import stripe from "../config/stripe";

export const getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT s.*, sc.Name AS CategoryName 
              FROM Supplements s 
              LEFT JOIN SupplementCategories sc ON s.CategoryId = sc.Id 
              WHERE s.IsActive = 1 
              ORDER BY s.CreatedAt DESC`);
    res.status(200).json(result.recordset);
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

    // Create Stripe product + price
    const stripeProduct = await stripe.products.create({
      name,
      description: description || "",
      default_price_data: {
        currency: "usd",
        unit_amount: Math.round(Number(price) * 100),
      },
      images: image ? [image] : [],
    });

    const stripePriceId = stripeProduct.default_price as string;

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
      .input("stripePriceId", stripePriceId)
      .input("stripeProductId", stripeProduct.id)
      .query(`
        INSERT INTO Supplements (Name, Description, Price, StockQuantity, Image, CategoryId, Brand, Weight, Flavor, StripePriceId, StripeProductId)
        OUTPUT INSERTED.*
        VALUES (@name, @description, @price, @stockQuantity, @image, @categoryId, @brand, @weight, @flavor, @stripePriceId, @stripeProductId)
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

    // Deactivate old Stripe product
    await stripe.products.update(product.StripeProductId, { active: false });

    // Create new Stripe product
    const newStripeProduct = await stripe.products.create({
      name,
      description: description || "",
      default_price_data: {
        currency: "usd",
        unit_amount: Math.round(Number(price) * 100),
      },
      images: image ? [image] : [],
    });

    const newPriceId = newStripeProduct.default_price as string;

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
      .input("stripePriceId", newPriceId)
      .input("stripeProductId", newStripeProduct.id)
      .query(`
        UPDATE Supplements 
        SET Name = @name, Description = @description, Price = @price, StockQuantity = @stockQuantity,
            Image = @image, CategoryId = @categoryId, Brand = @brand, Weight = @weight, Flavor = @flavor,
            StripePriceId = @stripePriceId, StripeProductId = @stripeProductId, UpdatedAt = GETUTCDATE()
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
      .query("SELECT StripeProductId FROM Supplements WHERE Id = @id");
    if (existing.recordset.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const { StripeProductId } = existing.recordset[0];

    // Deactivate in Stripe
    await stripe.products.update(StripeProductId, { active: false });

    // Soft delete in DB
    await pool.request()
      .input("id", productId)
      .query("UPDATE Supplements SET IsActive = 0, UpdatedAt = GETUTCDATE() WHERE Id = @id");

    res.status(200).json({ message: "Product deleted" });
  } catch (error) {
    next({ message: "Unable to delete product", error });
  }
};