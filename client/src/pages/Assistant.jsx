import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { Icon, PageHead } from '../components/ui.jsx';
import { money } from '../labels.js';

const SUGGESTIONS = ['بدي سيارة عائلية 7 ركاب بالخليل', 'سيارة رخيصة بنابلس', 'كيف بلغي الحجز؟', 'شو الوثائق المطلوبة؟'];

export default function Assistant() {
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'أهلاً! أنا مساعد Redrive. احكيلي شو السيارة اللي بدك إياها، أو اسألني عن الدفع والإلغاء والتوثيق.' }]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const session = useRef(Math.random().toString(36).slice(2));
  const endRef = useRef(null);

  useEffect(() => { if (messages.length > 1) endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [messages, busy]);

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
    <main>
      <div className="page-band">
        <div className="container">
          <PageHead crumbs={[['/', 'الرئيسية'], [null, 'المساعد الذكي']]} kicker="مساعد Redrive" title="اسأل Redrive" sub="احكيلي وين وإيمتى وشو نوع السيارة، أو اسأل عن الدفع والإلغاء والتوثيق." />
        </div>
      </div>
      <div className="container page-body">
        <div className="narrow-col">
          <div className="panel chat chat-panel" aria-live="polite" aria-label="المحادثة">
            {messages.map((m, i) => (
              <div key={i} className={`bubble ${m.role}`}>
                {m.text}
                {m.cars?.length > 0 && (
                  <div className="col" style={{ gap: 6, marginTop: 10 }}>
                    {m.cars.map((c) => (
                      <Link key={c._id} to={`/cars/${c._id}`} className="bubble-car">
                        <span className="col" style={{ gap: 0 }}><b>{c.brand} {c.model} {c.year}</b><span className="muted small">{c.seats} مقاعد · {money(c.dailyPrice)}/يوم</span></span>
                        <Icon name="arrowLeft" size={18} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && <div className="bubble assistant muted">عم يكتب…</div>}
            <span ref={endRef} />
          </div>
          <div className="chips" aria-label="اقتراحات">{SUGGESTIONS.map((s) => <button type="button" key={s} className="chip" disabled={busy} onClick={() => send(s)}>{s}</button>)}</div>
          <form className="composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input className="input" placeholder="اكتب رسالتك…" value={text} onChange={(e) => setText(e.target.value)} aria-label="رسالتك" />
            <button type="submit" className="btn" disabled={busy || !text.trim()}><Icon name="chat" size={18} />أرسل</button>
          </form>
        </div>
      </div>
    </main>
  );
}
