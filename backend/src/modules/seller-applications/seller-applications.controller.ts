import { NextFunction, Request, Response } from 'express';
import { sellerApplicationsService } from './seller-applications.service';
import type { AdminSellerApplicationFilters, SellerApplicationInput } from './seller-applications.types';

export async function getMine(req: Request, res: Response, next: NextFunction) {
  try {
    const application = await sellerApplicationsService.getMine(req.user!.userId);
    if (!application) {
      res.status(404).json({ success: false, message: 'Seller application not found' });
      return;
    }
    res.json({ success: true, data: application });
  } catch (error) { next(error); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json({ success: true, data: await sellerApplicationsService.create(req.user!.userId, req.body as SellerApplicationInput) });
  } catch (error) { next(error); }
}

export async function updateMine(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await sellerApplicationsService.updateMine(req.user!.userId, req.body as SellerApplicationInput) });
  } catch (error) { next(error); }
}

export async function submitMine(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await sellerApplicationsService.submit(req.user!.userId) });
  } catch (error) { next(error); }
}

export async function withdrawMine(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await sellerApplicationsService.withdraw(req.user!.userId) });
  } catch (error) { next(error); }
}

export async function listAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await sellerApplicationsService.listAdmin(req.query as unknown as AdminSellerApplicationFilters) });
  } catch (error) { next(error); }
}

export async function detailAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await sellerApplicationsService.getAdminDetail(Number(req.params.applicationId)) });
  } catch (error) { next(error); }
}

export async function approveAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await sellerApplicationsService.approve(Number(req.params.applicationId), req.user!.userId) });
  } catch (error) { next(error); }
}

export async function rejectAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await sellerApplicationsService.reject(Number(req.params.applicationId), req.user!.userId, req.body.reason) });
  } catch (error) { next(error); }
}

