import { IJwtPayload } from './index';

declare global {
  namespace Express {
    interface Request {
      user?: IJwtPayload;
    }
  }
}
