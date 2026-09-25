import {NextRequest,NextResponse} from 'next/server';
import {createServerClient} from '@supabase/ssr';

function admin(req:NextRequest){
 const user=process.env.PAIRVOICE_ADMIN_USER,pass=process.env.PAIRVOICE_ADMIN_PASSWORD;
 if(!user||!pass)return new NextResponse('Admin access is not configured.',{status:503});
 const auth=req.headers.get('authorization')||'';
 if(auth.startsWith('Basic ')){try{
  const decoded=atob(auth.slice(6)),split=decoded.indexOf(':');
  if(split>=0&&decoded.slice(0,split)===user&&decoded.slice(split+1)===pass)return NextResponse.next();
 }catch{}}
 return new NextResponse('Authentication required.',{status:401,headers:{'WWW-Authenticate':'Basic realm="PairVoice Admin", charset="UTF-8"'}});
}

export async function middleware(req:NextRequest){
 if(req.nextUrl.pathname.startsWith('/admin')||req.nextUrl.pathname.startsWith('/api/admin'))return admin(req);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return NextResponse.next();
 let response=NextResponse.next({request:req});
 const supabase=createServerClient(url,key,{cookies:{
  getAll:()=>req.cookies.getAll(),
  setAll(items){items.forEach(({name,value,options})=>{req.cookies.set(name,value);response.cookies.set(name,value,options);});}
 }});
 await supabase.auth.getUser();
 response.headers.set('Cache-Control','private, no-store');
 return response;
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']};
