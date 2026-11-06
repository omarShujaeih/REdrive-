import { useState } from 'react';
import { isoDay } from '../labels.js';
import { Icon } from './ui.jsx';

const WEEK = ['سبت', 'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'];

// Month calendar. dayClass(key) returns css classes; disabled(key) disables a day; onPick(key) on click.
// tone="company" shows bookings in blue (company view); the default shows taken days in grey (renter view).
export default function Calendar({ dayClass = () => '', disabled = () => false, onPick, initial, tone = '' }) {
  const [month, setMonth] = useState(() => { const d = initial ? new Date(initial) : new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const first = (month.getDay() + 1) % 7; // week starts on Saturday
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  const shift = (n) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  return (
    <div className="col" style={{ gap: 8 }}>
      <div className="row between">
        <button type="button" className="btn ghost sm" onClick={() => shift(-1)} aria-label="الشهر السابق"><Icon name="chevronRight" /></button>
        <b>{month.toLocaleDateString('ar-JO-u-nu-latn', { month: 'long', year: 'numeric' })}</b>
        <button type="button" className="btn ghost sm" onClick={() => shift(1)} aria-label="الشهر التالي"><Icon name="chevronLeft" /></button>
      </div>
      <div className={`cal ${tone}`}>
        {WEEK.map((w) => <div className="h" key={w}>{w}</div>)}
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const key = isoDay(d);
          return (
            <button type="button" key={key} className={dayClass(key)} disabled={disabled(key)} onClick={() => onPick?.(key)}>
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
