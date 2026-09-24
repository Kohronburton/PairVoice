import {NextRequest,NextResponse} from 'next/server';
import {sessionClient,serviceClient} from '../../../lib/supabase-server';
import {rankMatches,type MatchCandidate} from '../../../lib/matching';

async function currentParticipant(){
 const auth=await sessionClient(),{data}=await auth.auth.getUser();
 if(!data.user)return null;
 const db=serviceClient(),{data:p}=await db.from('participants').select('id,country_code,primary_language_code').eq('auth_user_id',data.user.id).maybeSingle();
 return p;
}
export async function POST(req:NextRequest){
 const me=await currentParticipant();if(!me)return NextResponse.json({error:'Sign in required.'},{status:401});
 const b=await req.json().catch(()=>({})),db=serviceClient();
 const availability=b.availability&&typeof b.availability==='object'?b.availability:{};
 const {error}=await db.from('partner_pool').upsert({participant_id:me.id,country_code:me.country_code,language_code:me.primary_language_code,availability,status:'WAITING',updated_at:new Date().toISOString()});
 if(error){console.error(error);return NextResponse.json({error:'Unable to join partner pool.'},{status:500})}
 const {data:rows,error:qError}=await db.from('partner_pool').select('participant_id,country_code,language_code,status,joined_at').eq('status','WAITING').eq('country_code',me.country_code).eq('language_code',me.primary_language_code).limit(100);
 if(qError)return NextResponse.json({error:'Unable to search partner pool.'},{status:500});
 const mine:MatchCandidate={id:me.id,countryCode:me.country_code,languageCode:me.primary_language_code,status:'WAITING',joinedAt:new Date().toISOString()};
 const candidates=(rows||[]).map((r:any)=>({id:r.participant_id,countryCode:r.country_code,languageCode:r.language_code,status:r.status,joinedAt:r.joined_at})) as MatchCandidate[];
 const best=rankMatches(mine,candidates)[0];
 return NextResponse.json({status:'WAITING',matchAvailable:Boolean(best)});
}
export async function DELETE(){
 const me=await currentParticipant();if(!me)return NextResponse.json({error:'Sign in required.'},{status:401});
 const db=serviceClient(),{error}=await db.from('partner_pool').update({status:'PAUSED',updated_at:new Date().toISOString()}).eq('participant_id',me.id);
 if(error)return NextResponse.json({error:'Unable to pause matching.'},{status:500});
 return NextResponse.json({status:'PAUSED'});
}
