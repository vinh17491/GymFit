import { logger } from '../../utils/logger';
import { expireEligibleOrders } from './order-expiration.service';
import { orderReservationConfig } from './order-reservation.config';

let timer:NodeJS.Timeout|null=null;
let running=false;

async function runExpirationBatch():Promise<void>{
  if(running)return;
  running=true;
  try{
    const result=await expireEligibleOrders();
    if(result.expired>0||result.failed>0)logger.info(`Order expiration batch: selected=${result.selected} expired=${result.expired} failed=${result.failed}`);
  }catch(error:unknown){logger.error('Order expiration batch failed',error instanceof Error?error.message:String(error));}
  finally{running=false;}
}

export function startOrderExpirationRunner():void{
  if(timer)return;
  timer=setInterval(()=>{void runExpirationBatch();},orderReservationConfig.expirationIntervalSeconds*1000);
  timer.unref();
  void runExpirationBatch();
}

export function stopOrderExpirationRunner():void{
  if(timer){
    clearInterval(timer);
    timer=null;
  }
}
