"use client";
export default function Error({ reset }) {
  return (
    <section className="card state-card" role="alert">
      <div className="state-icon" aria-hidden="true">!</div>
      <h1>কিছু একটা ভুল হয়েছে</h1>
      <p>পেজটি লোড করা যায়নি। আবার চেষ্টা করুন।</p>
      <p className="muted">Something went wrong. Please try again.</p>
      <div className="row" style={{ justifyContent: "center" }}>
        <button type="button" className="btn" onClick={() => reset()}>আবার চেষ্টা করুন / Try again</button>
        <a className="btn ghost" href="/">হোম / Home</a>
      </div>
    </section>
  );
}
