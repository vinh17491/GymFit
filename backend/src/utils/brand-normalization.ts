export function normalizeBrandName(value:string):string {
  return value.normalize('NFC').trim().toLowerCase().replace(/\s+/g,' ');
}
