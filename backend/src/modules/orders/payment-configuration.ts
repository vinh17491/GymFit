import { getMailConfigurationStatus } from "../mail/mail.service";

export type BankTransferConfigurationField =
  | "BANK_NAME"
  | "BANK_ACCOUNT_NAME"
  | "BANK_ACCOUNT_NUMBER"
  | "BANK_QR_IMAGE_URL";
export interface BankTransferPublicConfig {
  ready: boolean;
  missingFields: BankTransferConfigurationField[];
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  qrImageUrl: string | null;
  transferContent: string;
}
export interface AdminPaymentConfigurationStatus {
  bankTransfer: {
    ready: boolean;
    missingFields: BankTransferConfigurationField[];
  };
  mail: ReturnType<typeof getMailConfigurationStatus>;
}

const text = (value: string | undefined): string | null =>
  value?.trim() || null;
function validQr(value: string | null): boolean {
  if (
    !value ||
    /^(file:|javascript:|data:)/i.test(value) ||
    /^[a-zA-Z]:[\\/]/.test(value)
  )
    return false;
  if (value.startsWith("/")) return !value.startsWith("//");
  if (!value.startsWith("https://")) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function getBankTransferPublicConfig(
  orderNumber: string,
): BankTransferPublicConfig {
  const bankName = text(process.env.BANK_NAME),
    accountName = text(process.env.BANK_ACCOUNT_NAME),
    accountNumber = text(process.env.BANK_ACCOUNT_NUMBER),
    qrImageUrl = text(process.env.BANK_QR_IMAGE_URL);
  const missingFields: BankTransferConfigurationField[] = [];
  if (!bankName) missingFields.push("BANK_NAME");
  if (!accountName) missingFields.push("BANK_ACCOUNT_NAME");
  if (!accountNumber) missingFields.push("BANK_ACCOUNT_NUMBER");
  if (!validQr(qrImageUrl)) missingFields.push("BANK_QR_IMAGE_URL");
  return {
    ready: missingFields.length === 0,
    missingFields,
    bankName,
    accountName,
    accountNumber,
    qrImageUrl: validQr(qrImageUrl) ? qrImageUrl : null,
    transferContent: `GYMFIT ${orderNumber}`,
  };
}

export function getAdminPaymentConfigurationStatus(): AdminPaymentConfigurationStatus {
  const bank = getBankTransferPublicConfig("STATUS_ONLY");
  return {
    bankTransfer: { ready: bank.ready, missingFields: bank.missingFields },
    mail: getMailConfigurationStatus(),
  };
}
