import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { CarCard, Empty, ErrorBox, Loading, Stars, useLoad } from '../components/ui.jsx';
import MapView from '../components/MapView.jsx';
import { BRANDS, CITIES, FUEL, TRANSMISSION, money, isoDay } from '../labels.js';

export default function Search() {
  const [params, setParams] = useSearchParams();
  const get = (k) => params.get(k) || '';
  const [view, setView] = useState(params.get('near') ? 'map' : 'list');
  const [pos, setPos] = useState(null);
  const [selected, setSelected] = useState(null);
  const near = params.get('near') === '1';

  useEffect(() => {
    if (!near || pos) return;
    navigator.geolocation?.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setPos({ lat: 31.9038, lng: 35.2034 }), // fallback: Ramallah
    );
  }, [near, pos]);

  const query = useMemo(() => ({
    city: near ? '' : get('city'), start: get('start'), end: get('end'), minPrice: get('minPrice'), maxPrice: get('maxPrice'),
    transmission: get('transmission'), fuel: get('fuel'), brand: get('brand'), seats: get('seats'), minYear: get('minYear'), q: get('q'),
    sort: get('sort') || (near ? 'distance' : ''), ...(near && pos ? pos : {}),
  }), [params, pos]); // eslint-disable-line react-hooks/exhaustive-deps
  const { data, loading, error } = useLoad(() => (near && !pos ? new Promise(() => {}) : api(`/cars${qs(query)}`)), [JSON.stringify(query)]);

  const set = (k, v) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p, { replace: true }); };
  const toggle = (k, v) => { const cur = get(k).split(',').filter(Boolean); set(k, (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]).join(',')); };
  const days = get('start') && get('end') ? Math.max(1, Math.round((new Date(get('end')) - new Date(get('start'))) / 86400000)) : 0;
  const onSelect = useCallback((g) => setSelected(g), []);
  const cars = data?.cars || [];

  return (
    <main className="container col" style={{ gap: 20 }}>
      <form className="card row" style={{ alignItems: 'flex-end' }} onSubmit={(e) => e.preventDefault()}>
        <div className="field grow" style={{ minWidth: 180 }}>
          <label htmlFor="city">وين؟</label>
          <select id="city" className="input" value={near ? 'near' : get('city')} onChange={(e) => {
            const p = new URLSearchParams(params);
            if (e.target.value === 'near') { p.set('near', '1'); p.delete('city'); setView('map'); } else { p.delete('near'); p.set('city', e.target.value); }
            setParams(p, { replace: true });
          }}>
            <option value="">كل المدن</option>
            <option value="near">قريب مني (الخريطة)</option>
            {Object.entries(CITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="field"><label htmlFor="s">الاستلام</label><input id="s" type="date" className="input" value={get('start')} min={isoDay(Date.now())} onChange={(e) => set('start', e.target.value)} /></div>
        <div className="field"><label htmlFor="e">التسليم</label><input id="e" type="date" className="input" value={get('end')} min={get('start')} onChange={(e) => set('end', e.target.value)} /></div>
      </form>

      <div className="split filters">
        <aside className="card col sticky" aria-label="الفلاتر">
          <div className="row between"><b>الفلاتر</b><button type="button" className="btn ghost sm" onClick={() => setParams(new URLSearchParams({ ...(get('city') && { city: get('city') }), ...(near && { near: '1' }), ...(get('start') && { start: get('start'), end: get('end') }) }))}>مسح الكل</button></div>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <input className="input" type="number" placeholder="من ₪" value={get('minPrice')} onChange={(e) => set('minPrice', e.target.value)} aria-label="أقل سعر" />
            <input className="input" type="number" placeholder="لـ ₪" value={get('maxPrice')} onChange={(e) => set('maxPrice', e.target.value)} aria-label="أعلى سعر" />
          </div>
          <b className="small">ناقل الحركة</b>
          <div className="chips">{Object.entries(TRANSMISSION).map(([k, v]) => <button type="button" key={k} className={`chip ${get('transmission').includes(k) ? 'on' : ''}`} onClick={() => toggle('transmission', k)}>{v}</button>)}</div>
          <b className="small">نوع الوقود</b>
          <div className="chips">{Object.entries(FUEL).map(([k, v]) => <button type="button" key={k} className={`chip ${get('fuel').includes(k) ? 'on' : ''}`} onClick={() => toggle('fuel', k)}>{v}</button>)}</div>
          <b className="small">الماركة</b>
          <select className="input" value={get('brand')} onChange={(e) => set('brand', e.target.value)}><option value="">كل الماركات</option>{BRANDS.map((b) => <option key={b}>{b}</option>)}</select>
          <b className="small">سنة الصنع</b>
          <select className="input" value={get('minYear')} onChange={(e) => set('minYear', e.target.value)}><option value="">أي سنة</option><option value="2025">2025 وأحدث</option><option value="2023">2023 وأحدث</option><option value="2020">2020 وأحدث</option></select>
          <b className="small">عدد المقاعد</b>
          <div className="chips">{['4', '5', '7'].map((n) => <button type="button" key={n} className={`chip ${get('seats') === n ? 'on' : ''}`} onClick={() => set('seats', get('seats') === n ? '' : n)}>{n}+</button>)}</div>
        </aside>

        <section className="col">
          <div className="row between">
            <div className="col" style={{ gap: 0 }}>
              <h2>{near ? 'سيارات قريبة منك' : `سيارات متاحة${get('city') ? ` في ${CITIES[get('city')]}` : ''}`}</h2>
              <span className="muted small">{cars.length} سيارة{days ? ` · ${days} أيام` : ''}</span>
            </div>
            <div className="row">
              <input className="input" style={{ width: 200 }} placeholder="ابحث باسم السيارة" value={get('q')} onChange={(e) => set('q', e.target.value)} aria-label="ابحث باسم السيارة" />
              <select className="input" style={{ width: 160 }} value={get('sort')} onChange={(e) => set('sort', e.target.value)} aria-label="رتّب حسب">
                <option value="">الأنسب</option><option value="price">الأقل سعراً</option><option value="rating">الأعلى تقييماً</option>{near && <option value="distance">الأقرب لموقعي</option>}
              </select>
              <div className="chips">
                <button type="button" className={`chip ${view === 'list' ? 'on' : ''}`} onClick={() => setView('list')}>قائمة</button>
                <button type="button" className={`chip ${view === 'map' ? 'on' : ''}`} onClick={() => setView('map')}>خريطة</button>
              </div>
            </div>
          </div>
          <ErrorBox error={error} />
          {view === 'map' && (
            <>
              <MapView cars={cars} center={near ? pos : null} onSelectCompany={onSelect} />
              {selected && (
                <div className="card row between">
                  <div className="col" style={{ gap: 2 }}>
                    <b>{selected.company.name}</b>
                    <span className="small muted"><Stars value={selected.company.ratingAvg} /> · {selected.cars.length} سيارات متاحة · من {money(Math.min(...selected.cars.map((c) => c.dailyPrice)))}/يوم</span>
                  </div>
                  <Link className="btn secondary sm" to={`/companies/${selected.company._id}`}>صفحة الشركة</Link>
                </div>
              )}
            </>
          )}
          {loading ? <Loading /> : cars.length === 0 ? (
            <Empty title="ما في سيارات بتطابق الفلاتر" text="جرّب توسّع نطاق السعر، أو شيل فلتر من الفلاتر المفعّلة." />
          ) : (
            <div className="grid cards">{cars.map((c) => <CarCard key={c._id} car={c} days={days} />)}</div>
          )}
        </section>
      </div>
    </main>
  );
}
