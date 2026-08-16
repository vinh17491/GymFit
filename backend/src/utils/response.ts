import { Response } from 'express';

export function sendSuccess(res: Response, data: any = null, message = 'Success', statusCode = 200, extra: any = null) {
  const response: any = { success: true, message, data };
  if (extra) {
    if (extra.pagination) {
      response.pagination = extra.pagination;
    } else if (extra.page || extra.limit || extra.total || extra.pages || 'page' in extra || 'limit' in extra || 'total' in extra || 'pages' in extra) {
      response.pagination = extra;
    } else {
      Object.assign(response, extra);
    }
  }
  return res.status(statusCode).json(response);
}

export function sendError(res: Response, message = 'Internal Server Error', statusCode = 500, errors?: any) {
  return res.status(statusCode).json({ success: false, message, errors });
}

export function sendPaginated(res: Response, data: any[], total: number, page: number, limit: number) {
  return res.status(200).json({
    success: true, data,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}
