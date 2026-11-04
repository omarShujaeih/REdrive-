import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { money } from '../labels.js';

const SUGGESTIONS = ['بدي سيارة عائلية 7 ركاب بالخليل', 'سيارة رخيصة بنابلس', 'كيف بلغي الحجز؟', 'شو الوثائق المطلوبة؟'];

export default function Assistant() {
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'أهلاً! أنا مساعد Redrive. احكيلي شو السيارة اللي بدك إياها، أو اسألني عن الدفع والإلغاء والتوثيق.' }]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const session = useRef(Math.random().toString(36).slice(2));

  const send = async (t) => {
    const msg = (t ?? text).trim();
    if (!msg) return;
    setText(''); setBusy(true);
    setMessages((m) => [...m, { role: 'user', text: msg }]);
    try {
      const r = await api('/chat', { method: 'POST', body: { text: msg, sessionId: session.current } });
      setMessages((m) => [...m, { role: 'assistant', text: r.text, cars: r.cars }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', text: e.message }]);
    } finally { setBusy(false); }
  };

  return (
    <main className="container col" style={{ gap: 16, maxWidth: 760 }}>
      <div className="col" style={{ gap: 2 }}><h1>اسأل Redrive</h1><span className="muted">مساعد ذكي، بيرد خلال ثواني</span></div>
      <div className="card chat" style={{ minHeight: 360 }} aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.text}
            {m.cars?.length > 0 && (
              <div className="col" style={{ gap: 6, marginTop: 8 }}>
                {m.cars.map((c) => <Link key={c._id} to={`/cars/${c._id}`} className="card" style={{ padding: 10 }}><b>{c.brand} {c.model} {c.year}</b><div className="muted small">{c.seats} مقاعد · {money(c.dailyPrice)}/يوم</div></Link>)}
              </div>
            )}
          </div>
        ))}
        {busy && <div className="bubble assistant muted">عم يكتب…</div>}
      </div>
      <div className="chips">{SUGGESTIONS.map((s) => <button type="button" key={s} className="chip" onClick={() => send(s)}>{s}</button>)}</div>
      <form className="row" style={{ flexWrap: 'nowrap' }} onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input className="input" placeholder="رسالتك" value={text} onChange={(e) => setText(e.target.value)} aria-label="رسالتك" />
        <button className="btn" disabled={busy}>أرسل</button>
      </form>
    </main>
  );
}
