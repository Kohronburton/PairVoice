import {NextResponse} from 'next/server';
import {requireAdmin} from '../../../../lib/admin-server';

type Check={key:string;label:string;pass:boolean;blocking:boolean;detail:string};

export async function GET(){
 const admin=await requireAdmin();
 if(!admin)return NextResponse.json({error:'Forbidden'},{status:403});
 try{
  const db=admin.db;
  const [controlsQ,payoutQ,outboxQ,campaignsQ,versionsQ,accessQ,bindingsQ,providersQ,credentialsQ]=await Promise.all([
   db.from('subsystem_controls').select('subsystem,enabled,reason'),
   db.from('provider_payout_attempts').select('id,state').in('state',['UNKNOWN','MANUAL_REVIEW']),
   db.from('outbox_events').select('id').eq('status','DEAD_LETTER'),
   db.from('campaigns').select('id,slug,name,active,provider').eq('active',true),
   db.from('campaign_versions').select('id,campaign_id,status,invitation_code_mode').eq('status','PUBLISHED'),
   db.from('campaign_access').select('campaign_id,provider,invitation_code,launch_url'),
   db.from('campaign_provider_bindings').select('campaign_id,campaign_version_id,provider_id,purpose,active').eq('active',true),
   db.from('provider_integrations').select('id,provider_key,provider_type,status'),
   db.from('provider_credentials').select('provider_id,campaign_id,status').eq('status','AVAILABLE')
  ]);
  const queryError=[controlsQ.error,payoutQ.error,outboxQ.error,campaignsQ.error,versionsQ.error,accessQ.error,bindingsQ.error,providersQ.error,credentialsQ.error].find(Boolean);
  if(queryError)throw queryError;

  const checks:Check[]=[];
  const controls=controlsQ.data||[];
  for(const key of ['MATCHING','WORK','PAYOUT','MESSAGING','REFERRAL']){
   const c=controls.find(x=>x.subsystem===key);
   checks.push({key:`control_${key.toLowerCase()}`,label:`${key} subsystem enabled`,pass:c?.enabled===true,blocking:key!=='REFERRAL',detail:c?.enabled?'Enabled':c?.reason||'Paused'});
  }
  checks.push({key:'payout_reconciliation',label:'No unresolved payout outcomes',pass:(payoutQ.data||[]).length===0,blocking:true,detail:`${(payoutQ.data||[]).length} UNKNOWN/MANUAL_REVIEW attempt(s)`});
  checks.push({key:'message_dead_letters',label:'No dead-letter lifecycle messages',pass:(outboxQ.data||[]).length===0,blocking:false,detail:`${(outboxQ.data||[]).length} dead-letter message(s)`});

  const envChecks=[
   ['env_supabase','Supabase public configuration',Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),'NEXT_PUBLIC_SUPABASE_URL + publishable key'],
   ['env_service','Supabase service role',Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),'SUPABASE_SERVICE_ROLE_KEY'],
   ['env_site','Canonical site URL',Boolean(process.env.NEXT_PUBLIC_SITE_URL),'NEXT_PUBLIC_SITE_URL'],
   ['env_resend','Lifecycle email provider',Boolean(process.env.RESEND_API_KEY),'RESEND_API_KEY'],
   ['env_worker','Internal/cron worker secret',Boolean(process.env.PAIRVOICE_INTERNAL_SECRET||process.env.CRON_SECRET),'PAIRVOICE_INTERNAL_SECRET or CRON_SECRET'],
   ['env_crypto','Credential encryption key',Boolean(process.env.PAIRVOICE_CREDENTIAL_ENCRYPTION_KEY),'PAIRVOICE_CREDENTIAL_ENCRYPTION_KEY']
  ] as const;
  for(const [key,label,pass,detail] of envChecks)checks.push({key,label,pass,blocking:true,detail:pass?'Configured':`Missing ${detail}`});

  const versions=versionsQ.data||[],access=accessQ.data||[],bindings=bindingsQ.data||[],providers=providersQ.data||[],credentials=credentialsQ.data||[];
  for(const campaign of campaignsQ.data||[]){
   const version=versions.find(v=>v.campaign_id===campaign.id);
   const ca=access.find(a=>a.campaign_id===campaign.id);
   const workBinding=version?bindings.find(b=>b.campaign_version_id===version.id&&b.purpose==='WORK'):null;
   const workProvider=workBinding?providers.find(p=>p.id===workBinding.provider_id):null;
   checks.push({key:`campaign_${campaign.slug}_published`,label:`${campaign.name}: published version`,pass:Boolean(version),blocking:true,detail:version?'Published':'No published version'});
   checks.push({key:`campaign_${campaign.slug}_work`,label:`${campaign.name}: active work provider`,pass:Boolean(workProvider&&workProvider.status==='ACTIVE'),blocking:true,detail:workProvider?.provider_key||'No active WORK binding'});
   if(String(campaign.provider||'').toUpperCase()==='FUNCROWD'){
    checks.push({key:`campaign_${campaign.slug}_launch`,label:`${campaign.name}: external launch URL`,pass:Boolean(ca?.launch_url),blocking:true,detail:ca?.launch_url?'Configured':'Missing launch URL'});
   }
   if(version?.invitation_code_mode&&version.invitation_code_mode!=='NONE'){
    checks.push({key:`campaign_${campaign.slug}_code`,label:`${campaign.name}: invitation code`,pass:Boolean(ca?.invitation_code),blocking:true,detail:ca?.invitation_code?'Configured':'Missing invitation code'});
   }
   const credentialBindings=version?bindings.filter(b=>b.campaign_version_id===version.id&&b.purpose==='CREDENTIAL'):[];
   if(credentialBindings.length){
    const available=credentialBindings.reduce((sum,b)=>sum+credentials.filter(c=>c.provider_id===b.provider_id&&c.campaign_id===campaign.id).length,0);
    checks.push({key:`campaign_${campaign.slug}_credentials`,label:`${campaign.name}: credential inventory`,pass:available>0,blocking:true,detail:`${available} available credential(s)`});
   }
  }

  const blockingFailures=checks.filter(c=>c.blocking&&!c.pass);
  return NextResponse.json({ready:blockingFailures.length===0,blockingFailures:blockingFailures.length,checks});
 }catch(e){console.error(e);return NextResponse.json({error:'Unable to calculate release readiness.'},{status:500})}
}
