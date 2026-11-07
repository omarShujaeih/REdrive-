import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { CarCard, Empty, ErrorBox, Icon, PageHead, SkeletonCards, Stars, useLoad } from '../components/ui.jsx';
import MapView from '../components/MapView.jsx';
import { BRANDS, CITIES, FUEL, TRANSMISSION, initial, money, isoDay } from '../labels.js';

const FILTER_KEYS = ['minPrice', 'maxPrice', 'transmission', 'fuel', 'brand', 'minYear', 'seats'];

export default function Search() {
  const [params, setParams] = useSearchParams();
  const get = (k) => params.get(k) || '';
  const [view, setView] = useState(params.get('near') ? 'map' : 'list');
  const [pos, setPos] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
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
  const clearFilters = () => setParams(new URLSearchParams({ ...(get('city') && { city: get('city') }), ...(near && { near: '1' }), ...(get('start') && { start: get('start'), end: get('end') }) }));
  const days = get('start') && get('end') ? Math.max(1, Math.round((new Date(get('end')) - new Date(get('start'))) / 86400000)) : 0;
  const onSelect = useCallback((g) => setSelected(g), []);
  const cars = data?.cars || [];
  const active = FILTER_KEYS.filter((k) => get(k)).length;
  const title = near ? 'سيارات قريبة منك' : get('city') ? `سيارات متاحة في ${CITIES[get('city')]}` : 'كل السيارات المتاحة';

  return (
    <main>
      <div className="page-band search-band">
        <div className="container">
          <PageHead
            crumbs={[['/', 'الرئيسية'], [null, 'تصفّح السيارات']]}
            kicker="تصفّح السيارات"
            title={title}
            sub="سيارات من شركات مرخّصة وموثّقة. اختار المدينة والتواريخ، وفلتر حسب اللي بيناسبك."
          />
          <form className="search-card" onSubmit={(e) => e.preventDefault()} aria-label="المدينة والتواريخ">
            <div className="field grow">
              <label htmlFor="city"><Icon name="pin" size={18} color="var(--blue)" />وين؟</label>
              <select id="city" className="input" value={near ? 'near' : get('city')} onChange={(e) => {
                const p = new URLSearchParams(params);
                if (e.target.value === 'near') { p.set('near', '1'); p.delete('city'); setView('map'); } else { p.delete('near'); if (e.target.value) p.set('city', e.target.value); else p.delete('city'); }
                setParams(p, { replace: true });
              }}>
                <option value="">كل المدن</option>
                <option value="near">قريب مني (الخريطة)</option>
                {Object.entries(CITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="field"><label htmlFor="s"><Icon name="calendar" size={18} color="var(--blue)" />الاستلام</label><input id="s" type="date" className="input" value={get('start')} min={isoDay(Date.now())} onChange={(e) => set('start', e.target.value)} /></div>
            <div className="field"><label htmlFor="e"><Icon name="calendar" size={18} color="var(--blue)" />التسليم</label><input id="e" type="date" className="input" value={get('end')} min={get('start')} onChange={(e) => set('end', e.target.value)} /></div>
          </form>
        </div>
      </div>

      <div className="container page-body">
        <div className="split filters">
          <aside id="filters" className={`panel filters-panel stick${showFilters ? ' open' : ''}`} aria-label="الفلاتر">
            <div className="fp-head">
              <h2><Icon name="filter" size={18} />الفلاتر</h2>
              <button type="button" className="btn ghost sm" onClick={clearFilters} disabled={!active}>مسح الكل</button>
            </div>
            <div className="fp-sec">
              <b>السعر باليوم (₪)</b>
              <div className="price-pair">
                <input className="input" type="number" inputMode="numeric" min="0" placeholder="من" value={get('minPrice')} onChange={(e) => set('minPrice', e.target.value)} aria-label="أقل سعر باليوم" />
                <input className="input" type="number" inputMode="numeric" min="0" placeholder="لـ" value={get('maxPrice')} onChange={(e) => set('maxPrice', e.target.value)} aria-label="أعلى سعر باليوم" />
              </div>
            </div>
            <div className="fp-sec">
              <b>ناقل الحركة</b>
              <div className="chips">{Object.entries(TRANSMISSION).map(([k, v]) => <button type="button" key={k} className={`chip ${get('transmission').includes(k) ? 'on' : ''}`} aria-pressed={get('transmission').includes(k)} onClick={() => toggle('transmission', k)}>{v}</button>)}</div>
            </div>
            <div className="fp-sec">
              <b>نوع الوقود</b>
              <div className="chips">{Object.entries(FUEL).map(([k, v]) => <button type="button" key={k} className={`chip ${get('fuel').includes(k) ? 'on' : ''}`} aria-pressed={get('fuel').includes(k)} onClick={() => toggle('fuel', k)}>{v}</button>)}</div>
            </div>
            <div className="fp-sec">
              <label className="bold small" htmlFor="brand">الماركة</label>
              <select id="brand" className="input" value={get('brand')} onChange={(e) => set('brand', e.target.value)}><option value="">كل الماركات</option>{BRANDS.map((b) => <option key={b}>{b}</option>)}</select>
            </div>
            <div className="fp-sec">
              <label className="bold small" htmlFor="year">سنة الصنع</label>
              <select id="year" className="input" value={get('minYear')} onChange={(e) => set('minYear', e.target.value)}><option value="">أي سنة</option><option value="2025">2025 وأحدث</option><option value="2023">2023 وأحدث</option><option value="2020">2020 وأحدث</option></select>
            </div>
            <div className="fp-sec">
              <b>عدد المقاعد</b>
              <div className="chips">{['4', '5', '7'].map((n) => <button type="button" key={n} className={`chip ${get('seats') === n ? 'on' : ''}`} aria-pressed={get('seats') === n} onClick={() => set('seats', get('seats') === n ? '' : n)}>{n}+</button>)}</div>
            </div>
          </aside>

          <section className="col" style={{ gap: 16 }} aria-label="النتائج">
            <div className="results-bar">
              <div className="row" style={{ gap: 10 }}>
                <button type="button" className="btn secondary sm filters-toggle" aria-expanded={showFilters} aria-controls="filters" onClick={() => setShowFilters(!showFilters)}>
                  <Icon name="filter" size={18} />الفلاتر{active > 0 && <span className="badge blue">{active}</span>}
                </button>
                <span className="count" aria-live="polite">{loading ? 'عم ندوّر…' : `${cars.length} سيارة${days ? ` · ${days} أيام` : ''}`}</span>
              </div>
              <div className="results-tools">
                <div className="input-wrap has-lead">
                  <span className="lead-ic"><Icon name="search" size={18} /></span>
                  <input className="input" type="search" placeholder="ابحث باسم السيارة" value={get('q')} onChange={(e) => set('q', e.target.value)} aria-label="ابحث باسم السيارة" />
                </div>
                <select className="input" value={get('sort')} onChange={(e) => set('sort', e.target.value)} aria-label="رتّب حسب">
                  <option value="">الأنسب</option><option value="price">الأقل سعراً</option><option value="rating">الأعلى تقييماً</option>{near && <option value="distance">الأقرب لموقعي</option>}
                </select>
                <div className="segmented inline" role="group" aria-label="طريقة العرض">
                  <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}><Icon name="list" size={18} />قائمة</button>
                  <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}><Icon name="map" size={18} />خريطة</button>
                </div>
              </div>
            </div>

            <ErrorBox error={error} />
            {view === 'map' && (
              <>
                <MapView cars={cars} center={near ? pos : null} onSelectCompany={onSelect} />
                {selected && (
                  <div className="panel company-strip">
                    <div className="row" style={{ gap: 12 }}>
                      <span className="co-avatar">{initial(selected.company.name)}</span>
                      <div className="col" style={{ gap: 2 }}>
                        <b>{selected.company.name}</b>
                        <span className="small muted"><Stars value={selected.company.ratingAvg} /> · {selected.cars.length} سيارات متاحة · من {money(Math.min(...selected.cars.map((c) => c.dailyPrice)))}/يوم</span>
                      </div>
                    </div>
                    <Link className="btn secondary sm" to={`/companies/${selected.company._id}`}>صفحة الشركة</Link>
                  </div>
                )}
              </>
            )}
            {loading ? <SkeletonCards count={6} /> : cars.length === 0 ? (
              <Empty
                title="ما في سيارات بتطابق بحثك"
                text="جرّب توسّع نطاق السعر، أو شيل فلتر من الفلاتر المفعّلة، أو اختار تواريخ ثانية."
                action={active > 0 ? <button type="button" className="btn secondary" onClick={clearFilters}>مسح الفلاتر</button> : null}
              />
            ) : (
              <div className="grid cards">{cars.map((c) => <CarCard key={c._id} car={c} days={days} />)}</div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
