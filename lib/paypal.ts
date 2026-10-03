type PayPalMode='sandbox'|'live';

function baseUrl(){
 const mode=(process.env.PAYPAL_MODE||'sandbox').toLowerCase() as PayPalMode;
 return mode==='live'?'https://api-m.paypal.com':'https://api-m.sandbox.paypal.com';
}

async function accessToken(){
 const id=process.env.PAYPAL_CLIENT_ID,secret=process.env.PAYPAL_CLIENT_SECRET;
 if(!id||!secret)throw new Error('paypal_credentials_missing');
 const auth=Buffer.from(`${id}:${secret}`).toString('base64');
 const r=await fetch(`${baseUrl()}/v1/oauth2/token`,{
  method:'POST',
  headers:{Authorization:`Basic ${auth}`,'Content-Type':'application/x-www-form-urlencoded'},
  body:'grant_type=client_credentials',
  cache:'no-store'
 });
 if(!r.ok)throw new Error(`paypal_oauth_${r.status}`);
 const j=await r.json() as {access_token?:string};
 if(!j.access_token)throw new Error('paypal_oauth_token_missing');
 return j.access_token;
}

export async function createPayPalPayout(input:{
 senderBatchId:string;
 senderItemId:string;
 recipientEmail:string;
 amountCents:number;
 currency:string;
 note?:string;
}){
 const token=await accessToken();
 const amount=(input.amountCents/100).toFixed(2);
 const r=await fetch(`${baseUrl()}/v1/payments/payouts`,{
  method:'POST',
  headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
  body:JSON.stringify({
   sender_batch_header:{
    sender_batch_id:input.senderBatchId,
    recipient_type:'EMAIL',
    email_subject:'Your PairVoice payout'
   },
   items:[{
    recipient_type:'EMAIL',
    receiver:input.recipientEmail,
    amount:{value:amount,currency:input.currency.toUpperCase()},
    sender_item_id:input.senderItemId,
    note:input.note||'PairVoice approved-work payout'
   }]
  }),
  cache:'no-store'
 });
 const payload=await r.json().catch(()=>({})) as any;
 if(!r.ok){
  const err=new Error(`paypal_payout_${r.status}`) as Error&{payload?:unknown};
  err.payload=payload;throw err;
 }
 return payload;
}

export async function verifyPayPalWebhook(headers:Headers,event:unknown){
 const webhookId=process.env.PAYPAL_WEBHOOK_ID;
 if(!webhookId)throw new Error('paypal_webhook_id_missing');
 const token=await accessToken();
 const body={
  auth_algo:headers.get('paypal-auth-algo'),
  cert_url:headers.get('paypal-cert-url'),
  transmission_id:headers.get('paypal-transmission-id'),
  transmission_sig:headers.get('paypal-transmission-sig'),
  transmission_time:headers.get('paypal-transmission-time'),
  webhook_id:webhookId,
  webhook_event:event
 };
 const r=await fetch(`${baseUrl()}/v1/notifications/verify-webhook-signature`,{
  method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
  body:JSON.stringify(body),cache:'no-store'
 });
 const payload=await r.json().catch(()=>({})) as {verification_status?:string};
 return r.ok&&payload.verification_status==='SUCCESS';
}
