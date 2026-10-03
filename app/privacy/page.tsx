export const dynamic='force-dynamic';
import LegalPage from '../../components/PublicLegalPage';
export default async function Privacy({searchParams}:{searchParams:Promise<{lang?:string}>}){
 const {lang}=await searchParams;
 return <LegalPage kind="PRIVACY" locale={lang}/>;
}
