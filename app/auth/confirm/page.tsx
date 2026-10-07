import {redirect} from 'next/navigation';

function safe(v:string|undefined){return v&&v.startsWith('/')&&!v.startsWith('//')&&!/[\\\u0000-\u001f\u007f]/.test(v)?v:'/dashboard'}

export default async function ConfirmPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const q=await searchParams,token=q.token_hash||'',next=safe(q.next),type=q.type==='signup'?'signup':'magiclink';
 if(!token)redirect('/?auth=invalid');
 return <main className="authShell"><section className="authCard">
  <div className="eyebrow">PAIRVOICE SECURITY</div>
  <h1>Confirm your access</h1>
  <p>This extra tap protects your one-time sign-in from email scanners and link previews.</p>
  <form method="post" action="/auth/confirm/complete">
   <input type="hidden" name="token_hash" value={token}/>
   <input type="hidden" name="type" value={type}/>
   <input type="hidden" name="next" value={next}/>
   <button type="submit">Continue to PairVoice →</button>
  </form>
  <small>Only press Continue if you requested this PairVoice email.</small>
 </section></main>;
}
