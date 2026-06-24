// VietQR — tạo QR động qua VietQR API (NAPAS VietQR)
// Dùng img.vietqr.io — public, không cần API key

import { BANK_INFO } from "../config/bank";

interface VietQRParams {
  amount: number;
  content: string;
}

/**
 * Sinh URL ảnh QR động với số tiền + nội dung CK
 * Mỗi lần gọi → QR khác nhau → tránh trùng đơn
 * Template: compact2 (vừa gọn vừa đẹp trên mobile)
 */
export function generateQRUrl({ amount, content }: VietQRParams): string {
  const { bin, accountNumber, accountName } = BANK_INFO;
  const base = `https://img.vietqr.io/image/${bin}-${accountNumber}-compact2.jpg`;
  const params = new URLSearchParams({
    amount: String(amount),
    addInfo: content,
    accountName,
  });
  return `${base}?${params.toString()}`;
}
