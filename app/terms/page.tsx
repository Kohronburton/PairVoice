export const dynamic='force-dynamic';
import LegalPage from '../../components/PublicLegalPage';
export default async function Terms({searchParams}:{searchParams:Promise<{lang?:string}>}){
 const {lang}=await searchParams;
 return <LegalPage kind="TERMS" locale={lang}/>;
}
