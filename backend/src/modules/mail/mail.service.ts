import nodemailer,{Transporter} from 'nodemailer';
import { config } from '../../config/config';
import { logger } from '../../utils/logger';
import type { MailConfigurationField,MailConfigurationStatus,MailMessage,MailSendResult } from './mail.types';

let transporter:Transporter|null=null;
let transporterKey:string|null=null;

function isAcceptanceTransport():boolean{
  return process.env.MAIL_MODE==='acceptance'
    && process.env.NODE_ENV==='test'
    && /^GYMFIT_(?:DB_)?(?:SELLER\d+[A-Z]?_)?ACCEPTANCE_[A-Za-z0-9_]+$/i.test(config.db.database);
}

export function getMailConfigurationStatus():MailConfigurationStatus{
  if(isAcceptanceTransport())return {configured:true,missingFields:[]};
  const missingFields:MailConfigurationField[]=[];
  const host=process.env.MAIL_HOST?.trim();
  const port=Number(process.env.MAIL_PORT);
  const secure=process.env.MAIL_SECURE;
  const user=process.env.MAIL_USER?.trim();
  const password=process.env.MAIL_APP_PASSWORD;
  const adminEmail=process.env.ADMIN_NOTIFICATION_EMAIL?.trim();
  if(!host)missingFields.push('MAIL_HOST');
  if(!Number.isSafeInteger(port)||port<1||port>65535)missingFields.push('MAIL_PORT');
  if(secure!=='true'&&secure!=='false')missingFields.push('MAIL_SECURE');
  if(!user)missingFields.push('MAIL_USER');
  if(password===undefined||password.length===0)missingFields.push('MAIL_APP_PASSWORD');
  if(!adminEmail||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail))missingFields.push('ADMIN_NOTIFICATION_EMAIL');
  return {configured:missingFields.length===0,missingFields};
}

function getTransporter():Transporter|null{
  const status=getMailConfigurationStatus();
  if(!status.configured)return null;
  const host=process.env.MAIL_HOST?.trim() as string;
  const port=Number(process.env.MAIL_PORT);
  const secure=process.env.MAIL_SECURE==='true';
  const user=process.env.MAIL_USER?.trim() as string;
  const password=process.env.MAIL_APP_PASSWORD as string;
  const key=`${host}:${port}:${secure}:${user}`;
  if(transporter&&transporterKey===key)return transporter;
  transporter=nodemailer.createTransport({host,port,secure,auth:{user,pass:password}});
  transporterKey=key;
  return transporter;
}

export const mailService={
  configurationStatus:getMailConfigurationStatus,
  async send(message:MailMessage):Promise<MailSendResult>{
    if(isAcceptanceTransport()){
      logger.info('Mail delivery accepted by isolated acceptance transport',{recipientCount:message.to?1:0});
      return {configured:true,attempted:true,sent:true,reason:'SENT'};
    }
    const status=getMailConfigurationStatus();
    const transport=getTransporter();
    if(!status.configured||!transport){logger.warn('Mail delivery skipped: configuration incomplete');return {configured:false,attempted:false,sent:false,reason:'NOT_CONFIGURED'};}
    try{await transport.sendMail({from:process.env.MAIL_USER?.trim(),to:message.to,subject:message.subject,text:message.text,html:message.html});return {configured:true,attempted:true,sent:true,reason:'SENT'};}
    catch(error:unknown){logger.warn(`Mail delivery failed: ${error instanceof Error?error.message:'unknown error'}`);return {configured:true,attempted:true,sent:false,reason:'DELIVERY_FAILED'};}
  },
};
