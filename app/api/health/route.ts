import {NextResponse} from 'next/server';
export async function GET(){
 const configured=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
 return NextResponse.json({ok:configured,service:'pairvoice',environment:'coming-soon',databaseConfigured:configured},{status:configured?200:503});
}
