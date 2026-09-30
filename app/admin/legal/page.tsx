'use client';
import {useCallback,useEffect,useState} from 'react';
type Doc={id:string;scope:string;document_key:string;locale:string;version:number;status:string;title:string;published_at:string|null;campaign_versions:any};
type Version={id:string;version:number;status:string;language_code:string;campaigns:any};
const one=(v:any)=>Array.isArray(v)?v[0]:v;
export default function LegalAdmin(){
 const[docs,setDocs]=useState<Doc[]>([]),[versions,setVersions]=useState<Version[]>([]),[scope,setScope]=useState('SITE'),[key,setKey]=useState('PRIVACY'),[campaignVersionId,setCampaignVersionId]=useState(''),[locale,setLocale]=useState('en'),[title,setTitle]=useState(''),[body,setBody]=useState(''),[reason,setReason]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{const r=await fetch('/api/admin/legal-documents',{cache:'no-store'}),d=await r.json();if(r.ok){setDocs(d.documents||[]);setVersions(d.campaignVersions||[])}else setStatus(d.error||'Unable to load documents.')},[]);
 useEffect(()=>{void load()},[load]);
 useEffect(()=>{setKey(scope==='SITE'?'PRIVACY':'CAMPAIGN_TERMS')},[scope]);
 async function create(){
  setBusy(true);setStatus('');const r=await fetch('/api/admin/legal-documents',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'CREATE',scope,documentKey:key,campaignVersionId:scope==='CAMPAIGN'?campaignVersionId:null,locale,title,bodyText:body,reason})}),d=await r.json();setBusy(false);
  if(!r.ok){setStatus(d.error||'Unable to create draft.');return}setStatus('Draft created. Review it before publishing.');setTitle('');setBody('');await load();
 }
 async function publish(id:string){
  const why=window.prompt('Publication reason / approval evidence:');if(!why)return;setBusy(true);const r=await fetch('/api/admin/legal-documents',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'PUBLISH',documentId:id,reason:why})}),d=await r.json();setBusy(false);
  if(!r.ok){setStatus(d.error||'Unable to publish.');return}setStatus('Published. Previous version was retired.');await load();
 }
 return <main style={{maxWidth:1100,margin:'0 auto',padding:'32px 20px'}}><div className="logo">PAIR<span>VOICE</span></div><p className="eyebrow">ADMIN · LEGAL DOCUMENTS</p><h1>Publish reviewed text, <em>never placeholders.</em></h1>
  <p>This console versions the exact text participants see and accept. PairVoice does not generate legal approval; publish only reviewed/approved content.</p>
  <section className="card"><h2>New draft</h2><label>Scope<select value={scope} onChange={e=>setScope(e.target.value)}><option value="SITE">Site</option><option value="CAMPAIGN">Campaign</option></select></label>
   <label>Document<select value={key} onChange={e=>setKey(e.target.value)}>{scope==='SITE'?<><option value="PRIVACY">Privacy</option><option value="TERMS">Terms</option></>:<><option value="CAMPAIGN_TERMS">Campaign terms</option><option value="PARTICIPANT_CONSENT">Participant consent</option></>}</select></label>
   {scope==='CAMPAIGN'&&<label>Campaign version<select value={campaignVersionId} onChange={e=>setCampaignVersionId(e.target.value)}><option value="">Choose…</option>{versions.map(v=>{const c=one(v.campaigns);return <option key={v.id} value={v.id}>{c?.name||'Campaign'} · v{v.version} · {v.language_code}</option>})}</select></label>}
   <label>Locale<input value={locale} onChange={e=>setLocale(e.target.value)} placeholder="en"/></label><label>Title<input value={title} onChange={e=>setTitle(e.target.value)}/></label>
   <label>Reviewed document text<textarea rows={14} value={body} onChange={e=>setBody(e.target.value)}/></label><label>Draft reason / source<input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Attorney-reviewed text dated…"/></label>
   <button disabled={busy||!title||body.trim().length<40||(scope==='CAMPAIGN'&&!campaignVersionId)} onClick={create}>{busy?'Saving…':'Create immutable-version draft →'}</button>
  </section>
  {status&&<p role="status">{status}</p>}
  <section style={{marginTop:36}}><h2>Document versions</h2><div className="opportunityGrid">{docs.map(d=>{const cv=one(d.campaign_versions),c=one(cv?.campaigns);return <article className="opportunityCard" key={d.id}><small>{d.status} · {d.scope}</small><h3>{d.title}</h3><p>{d.document_key} · {d.locale} · v{d.version}{c?' · '+c.name:''}</p>{d.status==='DRAFT'&&<button disabled={busy} onClick={()=>publish(d.id)}>Publish reviewed version →</button>}</article>})}</div></section>
 </main>;
}
