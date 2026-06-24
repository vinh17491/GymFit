import { NextFunction, Request, Response } from "express";
import { getPool } from "../config/database";
import sql from "../config/database";
import { BANK_INFO } from "../config/bank";
import { generateQRUrl } from "../services/vietqr";

// POST /checkout/create-order — create order from cart, return QR payment
export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { items, shippingAddress, phone, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Cart items required" });
    }

    const pool = await getPool();
    const transaction = pool.transaction();
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    try {
      let totalAmount = 0;
      for (const item of items) {
        const prod = await transaction.request()
          .input("id", Number(item.productId))
          .query("SELECT Id, Price, StockQuantity FROM Supplements WHERE Id = @id AND IsActive = 1");
        if (prod.recordset.length === 0) {
          await transaction.rollback();
          return res.status(400).json({ message: `Product ${item.productId} not found` });
        }
        const p = prod.recordset[0];
        if (p.StockQuantity < (item.quantity || 1)) {
          await transaction.rollback();
          return res.status(400).json({ message: `Insufficient stock for product ${item.productId}` });
        }
        totalAmount += Number(p.Price) * (item.quantity || 1);
      }

      const orderResult = await transaction.request()
        .input("userId", userId)
        .input("totalAmount", totalAmount)
        .input("status", "PENDING")
        .input("shippingAddress", shippingAddress || null)
        .input("phone", phone || null)
        .input("notes", notes || null)
        .query(`
          INSERT INTO Orders (UserId, TotalAmount, Status, ShippingAddress, Phone, Notes, CreatedAt, UpdatedAt)
          OUTPUT INSERTED.*
          VALUES (@userId, @totalAmount, @status, @shippingAddress, @phone, @notes, GETUTCDATE(), GETUTCDATE())
        `);
      const order = orderResult.recordset[0];

      for (const item of items) {
        const prod = await transaction.request()
          .input("id", Number(item.productId))
          .query("SELECT Id, Price FROM Supplements WHERE Id = @id");
        await transaction.request()
          .input("orderId", order.Id)
          .input("supplementId", Number(item.productId))
          .input("quantity", item.quantity || 1)
          .input("unitPrice", Number(prod.recordset[0].Price))
          .input("subtotal", Number(prod.recordset[0].Price) * (item.quantity || 1))
          .query(`
            INSERT INTO OrderItems (OrderId, SupplementId, Quantity, UnitPrice, Subtotal, CreatedAt)
            VALUES (@orderId, @supplementId, @quantity, @unitPrice, @subtotal, GETUTCDATE())
          `);
        await transaction.request()
          .input("id", Number(item.productId))
          .input("qty", item.quantity || 1)
          .query("UPDATE Supplements SET StockQuantity = StockQuantity - @qty WHERE Id = @id");
      }

      const paymentResult = await transaction.request()
        .input("orderId", order.Id)
        .input("userId", userId)
        .input("amount", totalAmount)
        .input("currency", "VND")
        .input("paymentMethod", "BANK_TRANSFER")
        .input("status", "PENDING")
        .input("paymentType", "ORDER")
        .query(`
          INSERT INTO Payments (OrderId, UserId, Amount, Currency, PaymentMethod, Status, PaymentType, CreatedAt, UpdatedAt)
          OUTPUT INSERTED.*
          VALUES (@orderId, @userId, @amount, @currency, @paymentMethod, @status, @paymentType, GETUTCDATE(), GETUTCDATE())
        `);

      await transaction.commit();

      const qrImageUrl = generateQRUrl({ amount: totalAmount, content: `GYMFIT-${order.Id}` });

      res.status(201).json({
        order,
        payment: paymentResult.recordset[0],
        qrInfo: {
          bankName: BANK_INFO.bankName,
          accountNumber: BANK_INFO.accountNumber,
          accountHolder: BANK_INFO.accountHolder,
          amount: totalAmount,
          content: `GYMFIT-${order.Id}`,
          qrImageUrl,
        },
      });
    } catch (txError) {
      await transaction.rollback();
      throw txError;
    }
  } catch (error) {
    next({ message: "Unable to create order", error });
  }
};

// GET /checkout/my-orders
export const getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const pool = await getPool();
    const result = await pool.request()
      .input("userId", userId)
      .query(`
        SELECT o.*, p.Status AS PaymentStatus, p.PaymentMethod
        FROM Orders o
        LEFT JOIN Payments p ON o.Id = p.OrderId
        WHERE o.UserId = @userId
        ORDER BY o.CreatedAt DESC
      `);
    res.status(200).json(result.recordset);
  } catch (error) {
    next({ message: "Unable to fetch orders", error });
  }
};

// GET /checkout/order/:id
export const getOrderDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const orderId = Number(req.params.id);
    const pool = await getPool();

    const orderResult = await pool.request()
      .input("id", orderId)
      .input("userId", userId)
      .query("SELECT * FROM Orders WHERE Id = @id AND UserId = @userId");
    if (orderResult.recordset.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const itemsResult = await pool.request()
      .input("orderId", orderId)
      .query(`
        SELECT oi.*, s.Name AS ProductName, s.Image AS ProductImage
        FROM OrderItems oi
        JOIN Supplements s ON oi.SupplementId = s.Id
        WHERE oi.OrderId = @orderId
      `);

    const paymentResult = await pool.request()
      .input("orderId", orderId)
      .query("SELECT * FROM Payments WHERE OrderId = @orderId");

    res.status(200).json({
      order: orderResult.recordset[0],
      items: itemsResult.recordset,
      payment: paymentResult.recordset[0] || null,
      qrInfo: paymentResult.recordset[0]
        ? {
            bankName: BANK_INFO.bankName,
            accountNumber: BANK_INFO.accountNumber,
            accountHolder: BANK_INFO.accountHolder,
            amount: paymentResult.recordset[0].Amount,
            content: `GYMFIT-${orderId}`,
            qrImageUrl: generateQRUrl({ amount: paymentResult.recordset[0].Amount, content: `GYMFIT-${orderId}` }),
          }
        : null,
    });
  } catch (error) {
    next({ message: "Unable to fetch order detail", error });
  }
};