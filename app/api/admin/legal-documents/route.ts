import {createHash} from 'crypto';
import {NextRequest,NextResponse} from 'next/server';
import {requireAdmin} from '../../../../lib/admin-server';

const siteKeys=new Set(['PRIVACY','TERMS']);
const campaignKeys=new Set(['CAMPAIGN_TERMS','PARTICIPANT_CONSENT']);

export async function GET(){
 const admin=await requireAdmin(['SUPER_ADMIN']);
 if(!admin)return NextResponse.json({error:'Forbidden'},{status:403});
 const [{data:documents,error},{data:versions,error:versionError}]=await Promise.all([
  admin.db.from('legal_documents').select('id,scope,document_key,campaign_version_id,locale,version,status,title,content_sha256,published_at,created_at,campaign_versions(id,version,campaigns(slug,name))').order('created_at',{ascending:false}),
  admin.db.from('campaign_versions').select('id,version,status,language_code,campaigns(slug,name)').in('status',['DRAFT','PUBLISHED']).order('created_at',{ascending:false})
 ]);
 if(error||versionError)return NextResponse.json({error:'Unable to load legal documents.'},{status:500});
 return NextResponse.json({documents:documents||[],campaignVersions:versions||[]});
}

export async function POST(req:NextRequest){
 const admin=await requireAdmin(['SUPER_ADMIN']);
 if(!admin)return NextResponse.json({error:'Forbidden'},{status:403});
 try{
  const b=await req.json(),action=String(b.action||'CREATE').toUpperCase();
  if(action==='PUBLISH'){
   if(!b.documentId||!String(b.reason||'').trim())return NextResponse.json({error:'documentId and publication reason are required.'},{status:400});
   const {error}=await admin.db.rpc('publish_legal_document',{
    p_document_id:String(b.documentId),p_actor_user_id:admin.user.id,p_actor_label:`ADMIN:${admin.role}`,p_reason:String(b.reason)
   });
   if(error){console.error(error);return NextResponse.json({error:error.message},{status:409})}
   return NextResponse.json({ok:true});
  }
  const scope=String(b.scope||'').toUpperCase(),key=String(b.documentKey||'').toUpperCase(),locale=String(b.locale||'en').toLowerCase().slice(0,10);
  const title=String(b.title||'').trim(),bodyText=String(b.bodyText||'').trim(),campaignVersionId=b.campaignVersionId?String(b.campaignVersionId):null;
  if(!['SITE','CAMPAIGN'].includes(scope)||!title||bodyText.length<40)return NextResponse.json({error:'Valid scope, title and reviewed document text are required.'},{status:400});
  if(scope==='SITE'&&!siteKeys.has(key))return NextResponse.json({error:'SITE documents must be PRIVACY or TERMS.'},{status:400});
  if(scope==='CAMPAIGN'&&(!campaignKeys.has(key)||!campaignVersionId))return NextResponse.json({error:'Campaign documents require a campaign version and CAMPAIGN_TERMS/PARTICIPANT_CONSENT key.'},{status:400});
  const query=admin.db.from('legal_documents').select('version').eq('scope',scope).eq('document_key',key).eq('locale',locale).order('version',{ascending:false}).limit(1);
  const {data:prior}=scope==='CAMPAIGN'?await query.eq('campaign_version_id',campaignVersionId):await query.is('campaign_version_id',null);
  const version=(prior?.[0]?.version||0)+1,contentSha=createHash('sha256').update(bodyText,'utf8').digest('hex');
  const {data,error}=await admin.db.from('legal_documents').insert({
   scope,document_key:key,campaign_version_id:scope==='CAMPAIGN'?campaignVersionId:null,
   locale,version,status:'DRAFT',title,body_text:bodyText,content_sha256:contentSha
  }).select('id,version,status').single();
  if(error){console.error(error);return NextResponse.json({error:'Unable to create legal document draft.'},{status:500})}
  await admin.db.from('audit_events').insert({
   actor_user_id:admin.user.id,actor_label:`ADMIN:${admin.role}`,role:admin.role,
   operation:'LEGAL_DOCUMENT_DRAFT_CREATED',resource_type:'LEGAL_DOCUMENT',resource_id:data.id,
   reason:String(b.reason||'Legal document draft created'),after_data:{scope,document_key:key,locale,version,sha256:contentSha}
  });
  return NextResponse.json({ok:true,document:data});
 }catch(e){console.error(e);return NextResponse.json({error:'Unable to update legal documents.'},{status:500})}
}
