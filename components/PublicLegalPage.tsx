import {serviceClient} from '../lib/supabase-server';
export const dynamic='force-dynamic';

function localeChain(raw?:string){
 const normalized=String(raw||'en').trim().replace('_','-').toLowerCase();
 const base=normalized.split('-')[0]||'en';
 return [...new Set([normalized,base,'en'])];
}

export default async function LegalPage({kind,locale}:{kind:'PRIVACY'|'TERMS';locale?:string}){
 const db=serviceClient(),locales=localeChain(locale);
 const {data:rows}=await db.from('legal_documents').select('title,body_text,version,published_at,locale')
  .eq('scope','SITE').eq('document_key',kind).eq('status','PUBLISHED').in('locale',locales);
 const data=locales.map(l=>(rows||[]).find(r=>r.locale.toLowerCase()===l)).find(Boolean);
 const active=data?.locale||'en';
 return <main style={{maxWidth:820,margin:'0 auto',padding:'40px 20px'}}><div className="logo">PAIR<span>VOICE</span></div>
  <nav aria-label="Language" style={{display:'flex',gap:12,margin:'18px 0'}}>
   <a href={`?lang=en`} aria-current={active.startsWith('en')?'page':undefined}>English</a>
   <a href={`?lang=es`} aria-current={active.startsWith('es')?'page':undefined}>Español</a>
  </nav>
  {data?<><p className="eyebrow">{kind.replace('_',' ')}</p><h1>{data.title}</h1><p>Version {data.version} · {active.toUpperCase()} · Published {new Date(data.published_at).toLocaleDateString(active)}</p><article className="card" style={{whiteSpace:'pre-wrap'}}>{data.body_text}</article></>:
  <><p className="eyebrow">{kind}</p><h1>Document not published.</h1><p>PairVoice is not launch-certified until the reviewed {kind.toLowerCase()} document is published.</p></>}
  <p style={{marginTop:24}}><a href="/">← PairVoice</a></p></main>;
}
