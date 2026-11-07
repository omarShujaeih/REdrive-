import { useState } from 'react';
import { Icon } from './ui.jsx';

// Coordinates of a branch or pick-up point: typed, taken from the device, or copied from a preset
// (for example the company's saved location). Both empty means "no location".
export default function LocationField({ label, hint, value, onChange, presets = [] }) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const lat = value?.lat ?? '';
  const lng = value?.lng ?? '';
  const has = lat !== '' && lng !== '';

  const useMine = () => {
    if (!navigator.geolocation) { setError('المتصفح ما بيدعم تحديد الموقع.'); return; }
    setLocating(true); setError('');
    navigator.geolocation.getCurrentPosition(
      (p) => { onChange({ lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) }); setLocating(false); },
      () => { setError('ما قدرنا نحدد موقعك. اسمح للمتصفح بالموقع أو اكتب الإحداثيات.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="field">
      <span className="bold">{label}</span>
      {hint && <span className="hint">{hint}</span>}
      <div className="form-grid">
        <input className="input ltr" inputMode="decimal" placeholder="خط العرض (lat)" value={lat} onChange={(e) => onChange({ lat: e.target.value, lng })} aria-label={`${label}: خط العرض`} />
        <input className="input ltr" inputMode="decimal" placeholder="خط الطول (lng)" value={lng} onChange={(e) => onChange({ lat, lng: e.target.value })} aria-label={`${label}: خط الطول`} />
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn secondary sm" onClick={useMine} disabled={locating}><Icon name="pin" size={18} />{locating ? 'عم نحدد موقعك…' : 'استخدم موقعي الحالي'}</button>
        {presets.filter((p) => p.value?.lat != null && p.value?.lng != null).map((p) => (
          <button type="button" key={p.label} className="btn secondary sm" onClick={() => onChange({ lat: String(p.value.lat), lng: String(p.value.lng) })}><Icon name={p.icon || 'building'} size={18} />{p.label}</button>
        ))}
        {has && <a className="btn ghost sm" href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer"><Icon name="map" size={18} />شوفه على الخريطة</a>}
        {has && <button type="button" className="btn ghost sm" onClick={() => onChange({ lat: '', lng: '' })}>امسح الموقع</button>}
      </div>
      {error && <span className="error" role="alert">{error}</span>}
    </div>
  );
}

// Both empty, or both valid coordinates. Returns an error message or ''.
export function locationError(v) {
  const lat = v?.lat ?? ''; const lng = v?.lng ?? '';
  if (lat === '' && lng === '') return '';
  const la = Number(lat); const lo = Number(lng);
  if (lat === '' || lng === '' || !Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) return 'إحداثيات الموقع مش صحيحة: اكتب خط العرض وخط الطول، أو امسحهم.';
  return '';
}
