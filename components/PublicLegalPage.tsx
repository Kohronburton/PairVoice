import {serviceClient} from '../../lib/supabase-server';
export const dynamic='force-dynamic';
export default async function LegalPage({kind}:{kind:'PRIVACY'|'TERMS'}){
 const db=serviceClient();
 const {data}=await db.from('legal_documents').select('title,body_text,version,published_at').eq('scope','SITE').eq('document_key',kind).eq('locale','en').eq('status','PUBLISHED').maybeSingle();
 return <main style={{maxWidth:820,margin:'0 auto',padding:'40px 20px'}}><div className="logo">PAIR<span>VOICE</span></div>
  {data?<><p className="eyebrow">{kind.replace('_',' ')}</p><h1>{data.title}</h1><p>Version {data.version} · Published {new Date(data.published_at).toLocaleDateString()}</p><article className="card" style={{whiteSpace:'pre-wrap'}}>{data.body_text}</article></>:
  <><p className="eyebrow">{kind}</p><h1>Document not published.</h1><p>PairVoice is not launch-certified until the reviewed {kind.toLowerCase()} document is published.</p></>}
  <p style={{marginTop:24}}><a href="/">← PairVoice</a></p></main>;
}
