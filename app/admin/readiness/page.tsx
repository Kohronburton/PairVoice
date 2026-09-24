import {redirect} from 'next/navigation';
import {requireAdmin} from '../../../lib/admin-server';

type Check={key:string;label:string;pass:boolean;blocking:boolean;detail:string};

export default async function ReleaseReadiness(){
 const admin=await requireAdmin();
 if(!admin)redirect('/?signin=1');
 const db=admin.db;
 const [controlsQ,payoutQ,outboxQ,campaignsQ,versionsQ,accessQ,bindingsQ,providersQ,credentialsQ]=await Promise.all([
  db.from('subsystem_controls').select('subsystem,enabled,reason'),
  db.from('provider_payout_attempts').select('id,state').in('state',['UNKNOWN','MANUAL_REVIEW']),
  db.from('outbox_events').select('id').eq('status','DEAD_LETTER'),
  db.from('campaigns').select('id,slug,name,active,provider').eq('active',true),
  db.from('campaign_versions').select('id,campaign_id,status,invitation_code_mode').eq('status','PUBLISHED'),
  db.from('campaign_access').select('campaign_id,invitation_code,launch_url'),
  db.from('campaign_provider_bindings').select('campaign_id,campaign_version_id,provider_id,purpose,active').eq('active',true),
  db.from('provider_integrations').select('id,provider_key,status'),
  db.from('provider_credentials').select('provider_id,campaign_id,status').eq('status','AVAILABLE')
 ]);
 const checks:Check[]=[];
 for(const key of ['MATCHING','WORK','PAYOUT','MESSAGING','REFERRAL']){
  const c=(controlsQ.data||[]).find(x=>x.subsystem===key);
  checks.push({key,label:`${key} subsystem`,pass:c?.enabled===true,blocking:key!=='REFERRAL',detail:c?.enabled?'Enabled':c?.reason||'Paused'});
 }
 checks.push({key:'payouts',label:'Payout reconciliation queue',pass:(payoutQ.data||[]).length===0,blocking:true,detail:`${(payoutQ.data||[]).length} unresolved`});
 checks.push({key:'messages',label:'Dead-letter messages',pass:(outboxQ.data||[]).length===0,blocking:false,detail:`${(outboxQ.data||[]).length} dead letter`});
 const versions=versionsQ.data||[],access=accessQ.data||[],bindings=bindingsQ.data||[],providers=providersQ.data||[],credentials=credentialsQ.data||[];
 for(const campaign of campaignsQ.data||[]){
  const version=versions.find(v=>v.campaign_id===campaign.id),ca=access.find(a=>a.campaign_id===campaign.id);
  const wb=version?bindings.find(b=>b.campaign_version_id===version.id&&b.purpose==='WORK'):null,wp=wb?providers.find(p=>p.id===wb.provider_id):null;
  checks.push({key:`${campaign.slug}-published`,label:`${campaign.name}: published`,pass:Boolean(version),blocking:true,detail:version?'Published':'Missing'});
  checks.push({key:`${campaign.slug}-work`,label:`${campaign.name}: work provider`,pass:Boolean(wp&&wp.status==='ACTIVE'),blocking:true,detail:wp?.provider_key||'Missing'});
  if(String(campaign.provider||'').toUpperCase()==='FUNCROWD')checks.push({key:`${campaign.slug}-launch`,label:`${campaign.name}: launch URL`,pass:Boolean(ca?.launch_url),blocking:true,detail:ca?.launch_url?'Configured':'Missing'});
  if(version?.invitation_code_mode&&version.invitation_code_mode!=='NONE')checks.push({key:`${campaign.slug}-code`,label:`${campaign.name}: invitation code`,pass:Boolean(ca?.invitation_code),blocking:true,detail:ca?.invitation_code?'Configured':'Missing'});
  const cb=version?bindings.filter(b=>b.campaign_version_id===version.id&&b.purpose==='CREDENTIAL'):[];
  if(cb.length){const n=cb.reduce((sum,b)=>sum+credentials.filter(c=>c.provider_id===b.provider_id&&c.campaign_id===campaign.id).length,0);checks.push({key:`${campaign.slug}-creds`,label:`${campaign.name}: credentials`,pass:n>0,blocking:true,detail:`${n} available`})}
 }
 const blocking=checks.filter(x=>x.blocking&&!x.pass);
 return <main style={{maxWidth:1100,margin:'0 auto',padding:'32px 20px'}}>
  <div className="logo">PAIR<span>VOICE</span></div><p className="eyebrow">ADMIN · RELEASE</p>
  <h1>{blocking.length===0?'Operational gates clear':'Launch blockers remain'}</h1>
  <p>{blocking.length} blocking operational check(s). Environment-secret checks are available through the protected readiness API and should also be green in staging.</p>
  <div className="opportunityGrid" style={{marginTop:24}}>{checks.map(c=><article className="opportunityCard" key={c.key}><small>{c.blocking?'RELEASE GATE':'WATCH'}</small><h3>{c.pass?'✓':'✕'} {c.label}</h3><p>{c.detail}</p></article>)}</div>
 </main>;
}
