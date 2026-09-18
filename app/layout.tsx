import type {Metadata} from 'next';import './globals.css';
export const metadata:Metadata={title:'PairVoice | Coming Soon',description:'Join PairVoice early access for paid voice-recording opportunities.',robots:{index:true,follow:true}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
