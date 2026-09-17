'use client';

import { FormEvent, useState } from 'react';

export default function Home() {
  const [sent, setSent] = useState(false);
  function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); setSent(true); }

  return <main>
    <nav><div className="logo">PAIR<span>VOICE</span></div><a href="#join">Join now</a></nav>
    <section className="hero">
      <div className="eyebrow">PAID VOICE OPPORTUNITIES • MULTIPLE LANGUAGES & ACCENTS</div>
      <h1>Your voice<br/><em>has value.</em></h1>
      <p className="lead">Join PairVoice and get matched with paid voice-recording projects. Our introductory opportunity pays <strong>$50 total per accepted pair</strong>.</p>
      <div className="actions"><a className="primary" href="#join">Sign up for voice work →</a><span>Free to join • 18+</span></div>
      <div className="chips"><b>English</b><b>Español</b><b>US Accents</b><b>UK Accents</b><b>More coming</b></div>
    </section>

    <section className="steps">
      <div><i>01</i><h3>Create your profile</h3><p>Tell us your language, accent and location. It takes about 60 seconds.</p></div>
      <div><i>02</i><h3>Invite your partner</h3><p>Some projects need two voices. Send your personal link to your partner.</p></div>
      <div><i>03</i><h3>Qualify & record</h3><p>Complete the project requirements and submit your recording.</p></div>
      <div><i>04</i><h3>Get paid</h3><p>Approved work becomes eligible for payment under the project's terms.</p></div>
    </section>

    <section className="join" id="join">
      <div><div className="eyebrow">JOIN THE VOICE COMMUNITY</div><h2>Start with your<br/>first opportunity.</h2><p>Create your free profile now. If a project requires a pair, we'll give you a personal invitation link for your second participant.</p><div className="affiliate"><strong>Earn by referring others, too.</strong><br/>PairVoice members can receive referral rewards on eligible approved missions completed by people they directly refer.</div></div>
      <div className="card">
        {sent ? <div className="success"><div>✓</div><h3>You're on the PairVoice list.</h3><p>Next, we'll match your profile with opportunities that fit your language, accent and location.</p></div> : <form onSubmit={submit}>
          <h3>Create your free profile</h3><label>First name<input required name="firstName" placeholder="Your first name"/></label>
          <label>Email<input required type="email" name="email" placeholder="you@email.com"/></label>
          <label>Country<select required name="country" defaultValue=""><option value="" disabled>Select your country</option><option>United States</option><option>Spain</option><option>United Kingdom</option><option>Mexico</option><option>Other</option></select></label>
          <label>Primary language<select required name="language" defaultValue=""><option value="" disabled>Select language</option><option>English</option><option>Spanish</option><option>Other</option></select></label>
          <label>Accent / dialect<input required name="accent" placeholder="e.g. American, British, Spain Spanish"/></label>
          <label className="check"><input required type="checkbox"/> <span>I confirm I am 18+ and agree to be contacted about PairVoice opportunities.</span></label>
          <button>Create my PairVoice account →</button><small>No signup fee. Project eligibility and compensation vary by opportunity.</small>
        </form>}
      </div>
    </section>
    <footer><div className="logo">PAIR<span>VOICE</span></div><p>Paid voices. Real people. Global opportunities.</p></footer>
  </main>;
}
