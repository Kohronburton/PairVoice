import type {Metadata} from 'next';
export const metadata:Metadata={
 title:'PairVoice España | Oportunidades de voz pagadas',
 description:'Únete gratis a PairVoice y recibe avisos sobre proyectos pagados de grabación de voz en España.',
 robots:{index:true,follow:true},
 openGraph:{
  title:'PairVoice España — Tu voz tiene valor',
  description:'Acceso anticipado a oportunidades pagadas de grabación de voz en España.',
  type:'website',
  locale:'es_ES'
 }
};
export default function SpanishLayout({children}:{children:React.ReactNode}){return <>{children}</>}
