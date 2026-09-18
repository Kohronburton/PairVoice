import './globals.css'

export const metadata = {
  title: 'PairVoice | Proyecto España',
  description: 'PairVoice gestiona proyectos remunerados de conversación y voz.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body>{children}</body></html>
}
