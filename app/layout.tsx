import type {Metadata} from 'next';import './globals.css';
export const metadata:Metadata={
 title:'PairVoice | Paid Voice Opportunities',
 description:'Join PairVoice free and get notified about paid voice-recording projects matched to your language and location.',
 robots:{index:true,follow:true},
 openGraph:{title:'PairVoice — Your Voice Has Value',description:'Join free for early access to paid voice-recording opportunities.',type:'website'}
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
