function positiveSafeInteger(name:string,fallback:number,max?:number,min=1):number {
  const raw=process.env[name];
  if(raw===undefined)return fallback;
  const value=Number(raw);
  if(!Number.isSafeInteger(value)||value<min||(max!==undefined&&value>max))return fallback;
  return value;
}

export const orderReservationConfig={
  reservationMinutes:positiveSafeInteger('ORDER_RESERVATION_MINUTES',30,10080),
  expirationBatchSize:positiveSafeInteger('ORDER_EXPIRATION_BATCH_SIZE',100,1000),
  expirationIntervalSeconds:positiveSafeInteger('ORDER_EXPIRATION_INTERVAL_SECONDS',60,86400,30),
};
