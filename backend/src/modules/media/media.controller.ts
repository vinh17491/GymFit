import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middleware/errorHandler';

/**
 * The old Amazon scraper wrote Products.main_image and had no mounted
 * application caller. ProductImages is the canonical media authority now;
 * keep the route shape only long enough to return an explicit retirement
 * response to old operators and integrations.
 */
export function retiredMediaEndpoint(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError(409, 'Legacy product media scraper is retired; use ProductImages through the product media API', 'MEDIA_SCRAPER_RETIRED'));
}
