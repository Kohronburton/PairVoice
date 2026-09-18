import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export async function GET(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return NextResponse.json({error:'Not configured'},{status:503});
 const db=createClient(url,key,{auth:{persistSession:false}});
 const [
  {count:leads},{count:usLeads},{count:spainLeads},{count:converted},
  {data:spendRows},{data:campaignRows}
 ]=await Promise.all([
  db.from('leads').select('*',{count:'exact',head:true}).neq('status','unsubscribed'),
  db.from('leads').select('*',{count:'exact',head:true}).neq('status','unsubscribed').eq('country','United States'),
  db.from('leads').select('*',{count:'exact',head:true}).neq('status','unsubscribed').eq('country','Spain'),
  db.from('leads').select('*',{count:'exact',head:true}).eq('status','converted'),
  db.from('acquisition_spend').select('campaign_key,amount_cents,impressions,clicks'),
  db.from('leads').select('campaign_key,status')
 ]);
 const total=leads||0,target=20000,totalSpendCents=(spendRows||[]).reduce((s:any,r:any)=>s+(r.amount_cents||0),0);
 const totalClicks=(spendRows||[]).reduce((s:any,r:any)=>s+(r.clicks||0),0);
 const totalImpressions=(spendRows||[]).reduce((s:any,r:any)=>s+(r.impressions||0),0);
 const cplCents=total?Math.round(totalSpendCents/total):null;
 const customers=converted||0;
 const cacCents=customers?Math.round(totalSpendCents/customers):null;
 const leadConversionRate=total?Math.round((customers/total)*10000)/100:null;
 const ctr=totalImpressions?Math.round((totalClicks/totalImpressions)*10000)/100:null;
 const cpcCents=totalClicks?Math.round(totalSpendCents/totalClicks):null;
 const byCampaign:any={};
 for(const r of campaignRows||[]){const k=r.campaign_key||'organic';byCampaign[k]??={leads:0,customers:0,spendCents:0,clicks:0,impressions:0};byCampaign[k].leads++;if(r.status==='converted')byCampaign[k].customers++;}
 for(const r of spendRows||[]){const k=r.campaign_key||'unknown';byCampaign[k]??={leads:0,customers:0,spendCents:0,clicks:0,impressions:0};byCampaign[k].spendCents+=r.amount_cents||0;byCampaign[k].clicks+=r.clicks||0;byCampaign[k].impressions+=r.impressions||0;}
 const campaigns=Object.entries(byCampaign).map(([campaignKey,v]:any)=>({campaignKey,...v,cplCents:v.leads?Math.round(v.spendCents/v.leads):null,cacCents:v.customers?Math.round(v.spendCents/v.customers):null,conversionRate:v.leads?Math.round((v.customers/v.leads)*10000)/100:null}));
 return NextResponse.json({
  leads:total,usLeads:usLeads||0,spainLeads:spainLeads||0,customers,
  target,progress:Math.round((total/target)*10000)/100,totalSpendCents,cplCents,cacCents,
  leadConversionRate,totalClicks,totalImpressions,ctr,cpcCents,campaigns
 });
}
