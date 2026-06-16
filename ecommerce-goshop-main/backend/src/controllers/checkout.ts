import { NextFunction, Request, Response } from "express";
import stripe from "../config/stripe";

export const getCheckoutSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.id);
    res.status(200).json(session);
  } catch (error) {
    next({ message: "Unable to retrieve the checkout session", error });
  }
};

export const getCheckoutItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lineItems = await stripe.checkout.sessions.listLineItems(req.params.id);
    res.status(200).json(lineItems.data);
  } catch (error) {
    next({ message: "Unable to retrieve the checkout items", error });
  }
};

export const createCheckoutSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: req.body.lineItems,
      currency: "usd",
      metadata: {
        customerId: String(req.userId || req.body.userId || ""),
      },
    });
    res.status(201).json({ sessionId: session.id });
  } catch (error) {
    next({ message: "Unable to create the checkout session", error });
  }
};