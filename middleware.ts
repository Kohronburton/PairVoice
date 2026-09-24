import {NextRequest,NextResponse} from 'next/server';

export function middleware(req:NextRequest){
 const user=process.env.PAIRVOICE_ADMIN_USER;
 const pass=process.env.PAIRVOICE_ADMIN_PASSWORD;
 if(!user||!pass)return new NextResponse('Admin access is not configured.',{status:503});
 const auth=req.headers.get('authorization')||'';
 if(auth.startsWith('Basic ')){
  try{
   const decoded=atob(auth.slice(6));
   const split=decoded.indexOf(':');
   const suppliedUser=split>=0?decoded.slice(0,split):'';
   const suppliedPass=split>=0?decoded.slice(split+1):'';
   if(suppliedUser===user&&suppliedPass===pass)return NextResponse.next();
  }catch{}
 }
 return new NextResponse('Authentication required.',{status:401,headers:{'WWW-Authenticate':'Basic realm="PairVoice Admin", charset="UTF-8"'}});
}

export const config={matcher:['/admin/:path*','/api/admin/:path*']};
