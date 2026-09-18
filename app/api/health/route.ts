import {NextResponse} from 'next/server';
export async function GET(){
 const configured=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY);
 return NextResponse.json({ok:true,service:'pairvoice',environment:'preview',databaseConfigured:configured},{status:200});
}
