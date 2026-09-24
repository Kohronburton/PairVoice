import {NextRequest,NextResponse} from 'next/server';
import {sessionClient,serviceClient} from '../../../lib/supabase-server';

async function current(){
 const auth=await sessionClient(),{data}=await auth.auth.getUser();
 if(!data.user)return null;
 const db=serviceClient();
 const {data:participant}=await db.from('participants').select('id,primary_language_code').eq('auth_user_id',data.user.id).maybeSingle();
 return participant?{db,participant}:null;
}

export async function GET(req:NextRequest){
 const ctx=await current();if(!ctx)return NextResponse.json({error:'Sign in required.'},{status:401});
 const campaignSlug=req.nextUrl.searchParams.get('campaign')||'';
 if(!campaignSlug)return NextResponse.json({error:'campaign is required.'},{status:400});
 const {data:campaign}=await ctx.db.from('campaigns').select('id,slug,name').eq('slug',campaignSlug).maybeSingle();
 if(!campaign)return NextResponse.json({error:'Campaign not found.'},{status:404});
 const {data:enrollment}=await ctx.db.from('campaign_enrollments').select('id,campaign_version_id,accepted_terms_at').eq('campaign_id',campaign.id).eq('participant_id',ctx.participant.id).maybeSingle();
 if(!enrollment)return NextResponse.json({error:'Join this campaign first.'},{status:404});
 const {data:docs,error}=await ctx.db.from('legal_documents').select('id,document_key,title,body_text,version,content_sha256').eq('scope','CAMPAIGN').eq('campaign_version_id',enrollment.campaign_version_id).eq('locale',ctx.participant.primary_language_code).eq('status','PUBLISHED').in('document_key',['CAMPAIGN_TERMS','PARTICIPANT_CONSENT']).order('document_key');
 if(error)return NextResponse.json({error:'Unable to load campaign documents.'},{status:500});
 const {data:accepted}=await ctx.db.from('legal_document_acceptances').select('document_id,accepted_at').eq('participant_id',ctx.participant.id).eq('enrollment_id',enrollment.id);
 const acceptedIds=new Set((accepted||[]).map(x=>x.document_id));
 return NextResponse.json({campaign,documents:docs||[],acceptedDocumentIds:[...acceptedIds],complete:(docs||[]).length===2&&(docs||[]).every(d=>acceptedIds.has(d.id))});
}

export async function POST(req:NextRequest){
 const ctx=await current();if(!ctx)return NextResponse.json({error:'Sign in required.'},{status:401});
 try{
  const b=await req.json(),campaignSlug=String(b.campaignSlug||''),documentIds=Array.isArray(b.documentIds)?b.documentIds.map(String):[];
  if(!campaignSlug||documentIds.length<2)return NextResponse.json({error:'Campaign and both required document acceptances are required.'},{status:400});
  const {data,error}=await ctx.db.rpc('accept_campaign_documents',{p_participant_id:ctx.participant.id,p_campaign_slug:campaignSlug,p_document_ids:documentIds});
  if(error){
   const m=String(error.message||''),message=m.includes('not_published')?'Required campaign documents have not been published yet.':m.includes('not_accepted')?'Accept every required campaign document.':'Unable to record campaign acceptance.';
   return NextResponse.json({error:message},{status:409});
  }
  return NextResponse.json(data);
 }catch(e){console.error(e);return NextResponse.json({error:'Unable to record campaign acceptance.'},{status:500})}
}
