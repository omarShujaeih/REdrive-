import { DAY_NAMES, WEEK_ORDER, companyHours } from '../labels.js';

const TIMES = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

// Weekly opening hours of a branch, Saturday first; today is highlighted.
export function OpeningHours({ company }) {
  const hours = companyHours(company);
  const today = new Date().getDay();
  return (
    <ul className="hours-list">
      {WEEK_ORDER.map((day) => {
        const h = hours.find((x) => x.day === day);
        return (
          <li key={day} className={day === today ? 'today' : ''}>
            <span>{DAY_NAMES[day]}{day === today ? ' (اليوم)' : ''}</span>
            {h?.closed ? <span className="closed">مسكّر</span> : <span className="ltr">{h?.open} – {h?.close}</span>}
          </li>
        );
      })}
    </ul>
  );
}

// Company settings: open/closed per day plus opening and closing hour.
export function HoursEditor({ value, onChange }) {
  const set = (day, patch) => onChange(value.map((h) => (h.day === day ? { ...h, ...patch } : h)));
  return (
    <div className="hours-editor" role="group" aria-label="ساعات الدوام">
      {WEEK_ORDER.map((day) => {
        const h = value.find((x) => x.day === day);
        return (
          <div key={day} className={`hours-row ${h.closed ? 'is-closed' : ''}`}>
            <b>{DAY_NAMES[day]}</b>
            <label className="check">
              <input type="checkbox" checked={!h.closed} onChange={(e) => set(day, { closed: !e.target.checked })} />
              <span>{h.closed ? 'مسكّر' : 'فاتح'}</span>
            </label>
            <select className="input" aria-label={`فتح يوم ${DAY_NAMES[day]}`} value={h.open} disabled={h.closed} onChange={(e) => set(day, { open: e.target.value })}>
              {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="input" aria-label={`سكّر يوم ${DAY_NAMES[day]}`} value={h.close} disabled={h.closed} onChange={(e) => set(day, { close: e.target.value })}>
              {TIMES.slice(1).concat('23:59').map((t) => <option key={t} value={t}>{t === '23:59' ? '24:00' : t}</option>)}
            </select>
          </div>
        );
      })}
    </div>
  );
}
