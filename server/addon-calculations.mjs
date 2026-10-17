export function nonnegative(value){const n=Number(value);return Number.isFinite(n)&&n>=0&&n<=1e9?n:NaN;}
export function compareAgreement({balance,entry,installments,monthly,fees,capacity}){
 const a=[balance,entry,installments,monthly,fees,capacity].map(nonnegative);
 if(a.some(Number.isNaN)||!Number.isInteger(a[2])||a[2]>600||a[0]<=0)return null;
 const total=a[1]+a[2]*a[3]+a[4];
 return {total,difference:a[0]-total,differencePercent:(a[0]-total)/a[0]*100,monthlyFits:a[3]<=a[5],firstPeriod:a[1]+(a[2]>0?a[3]:0)+a[4]};
}
export function unitPrice({price,quantity,unit}){
 const p=nonnegative(price),q=nonnegative(quantity);const units={g:['peso',.001,'kg'],kg:['peso',1,'kg'],ml:['volume',.001,'L'],l:['volume',1,'L'],un:['unidade',1,'unidade']};
 if(!Number.isFinite(p)||!Number.isFinite(q)||q<=0||!units[unit])return null;
 const [category,factor,label]=units[unit];return {value:p/(q*factor),category,label};
}
export function offerPrice({materials,transport,fixed,hours,hourly,fees,margin}){
 const a=[materials,transport,fixed,hours,hourly,fees,margin].map(nonnegative);
 if(a.some(Number.isNaN)||a[5]+a[6]>=100)return null;
 const cost=a[0]+a[1]+a[2],labor=a[3]*a[4],base=cost+labor,price=base/(1-(a[5]+a[6])/100);
 return {cost,labor,base,price,feesValue:price*a[5]/100,marginValue:price*a[6]/100};
}
