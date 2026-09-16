const steps = [
  'Comprueba si cumples los requisitos',
  'Invita a tu pareja',
  'Completa la preparación',
  'Realiza las conversaciones en FunCrowd',
  'Espera la revisión del proyecto',
  'Recibe el pago si el trabajo es aceptado',
]

export default function Home() {
  return (
    <main className="shell">
      <nav className="nav"><strong>PairVoice</strong><span>Proyecto España</span></nav>
      <section className="hero">
        <span className="eyebrow">PROYECTO REMUNERADO DE VOZ · ESPAÑA</span>
        <h1>Conversaciones reales.<br/>Proceso sencillo.</h1>
        <p className="lead">Buscamos parejas de hablantes nativos de español de España para un proyecto de grabación de conversaciones naturales.</p>
        <div className="pay"><strong>50 $</strong><span>TOTAL por pareja por completar correctamente el proyecto y superar la revisión requerida.</span></div>
        <a className="primary" href="/apply">Comprobar requisitos</a>
      </section>
      <section className="facts">
        <div><strong>2</strong><span>participantes</span></div>
        <div><strong>7</strong><span>conversaciones</span></div>
        <div><strong>21–22</strong><span>min aprox. cada una</span></div>
      </section>
      <section className="card"><h2>Cómo funciona</h2>{steps.map((s,i)=><div className="step" key={s}><b>{i+1}</b><span>{s}</span></div>)}</section>
      <section className="notice"><strong>Importante</strong><p>PairVoice gestiona la selección, coordinación, seguimiento, revisión y pago. Las grabaciones se realizan mediante la aplicación externa FunCrowd. Completar las siete conversaciones no significa automáticamente que el trabajo haya sido aceptado.</p></section>
    </main>
  )
}
