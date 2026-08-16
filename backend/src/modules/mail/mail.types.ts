export interface MailMessage { to:string; subject:string; text:string; html?:string }
export type MailConfigurationField='MAIL_HOST'|'MAIL_PORT'|'MAIL_SECURE'|'MAIL_USER'|'MAIL_APP_PASSWORD'|'ADMIN_NOTIFICATION_EMAIL';
export interface MailConfigurationStatus { configured:boolean; missingFields:MailConfigurationField[] }
export type MailSendReason='SENT'|'NOT_CONFIGURED'|'DELIVERY_FAILED';
export interface MailSendResult { configured:boolean; attempted:boolean; sent:boolean; reason:MailSendReason }
