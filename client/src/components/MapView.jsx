import { useEffect, useRef, useState } from 'react';
import { money } from '../labels.js';

const KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;
const PALESTINE = { lat: 31.9, lng: 35.2 };

// Loads the Maps script once; a failed load is forgotten so "try again" really retries.
let loader;
function loadGoogle() {
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&language=ar&region=PS`;
      s.async = true;
      s.onload = () => (window.google?.maps ? resolve(window.google) : reject(new Error('maps')));
      s.onerror = () => { s.remove(); reject(new Error('maps')); };
      document.head.appendChild(s);
    }).catch((err) => { loader = undefined; throw err; });
  }
  return loader;
}

// One pin per rental company with its lowest daily price; a click shows the company card under the map.
function groupByCompany(cars) {
  const groups = {};
  cars.forEach((c) => {
    const id = c.company?._id; const p = c.pickupLocation;
    if (!id || p?.lat == null || p?.lng == null) return;
    groups[id] = groups[id] || { company: c.company, pos: { lat: p.lat, lng: p.lng }, cars: [] };
    groups[id].cars.push(c);
  });
  return Object.values(groups);
}

export default function MapView({ cars, center, onSelectCompany }) {
  const box = useRef(null);
  const mapRef = useRef(null);
  const markers = useRef([]);
  const meMarker = useRef(null);
  const [google, setGoogle] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const groups = groupByCompany(cars);
  const hidden = cars.length - groups.reduce((n, g) => n + g.cars.length, 0);

  // Load the script and create the map once (again after "try again").
  useEffect(() => {
    if (!KEY) return undefined;
    let alive = true;
    loadGoogle().then((g) => {
      if (!alive || !box.current) return;
      mapRef.current = new g.maps.Map(box.current, { center: PALESTINE, zoom: 9, mapTypeControl: false, streetViewControl: false, fullscreenControl: false });
      setFailed(false);
      setGoogle(g);
    }).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [attempt]);

  // Update the pins when the results change, and fit the map to them (and to "my location").
  useEffect(() => {
    const map = mapRef.current;
    if (!google || !map) return;
    markers.current.forEach((m) => m.setMap(null));
    markers.current = groups.map((g) => {
      const m = new google.maps.Marker({ map, position: g.pos, title: g.company.name, label: { text: money(Math.min(...g.cars.map((c) => c.dailyPrice))), fontSize: '12px', fontWeight: '700' } });
      m.addListener('click', () => onSelectCompany?.(g));
      return m;
    });
    meMarker.current?.setMap(null);
    meMarker.current = center ? new google.maps.Marker({ map, position: center, title: 'موقعك', icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#2F6BFF', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 } }) : null;
    const points = [...groups.map((g) => g.pos), ...(center ? [center] : [])];
    if (points.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      points.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, 48);
    } else if (points.length === 1) {
      map.setCenter(points[0]); map.setZoom(13);
    } else {
      map.setCenter(PALESTINE); map.setZoom(9);
    }
  }, [google, JSON.stringify(groups.map((g) => [g.company._id, g.pos, g.cars.length])), center?.lat, center?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!KEY || failed) {
    return (
      <div className="map-box" style={{ display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
        <div className="col" style={{ alignItems: 'center' }}>
          <b>{KEY ? 'ما قدرنا نحمّل الخريطة' : 'الخريطة بتحتاج مفتاح Google Maps'}</b>
          <span className="muted small">{KEY ? 'تأكد من الإنترنت وجرّب مرة ثانية. السيارات معروضة تحت.' : 'حط VITE_GOOGLE_MAPS_KEY بملف client/.env. لهلأ السيارات مرتّبة حسب القرب من موقعك تحت.'}</span>
          {KEY && <button type="button" className="btn secondary sm" onClick={() => { setFailed(false); setAttempt((a) => a + 1); }}>جرّب مرة ثانية</button>}
        </div>
      </div>
    );
  }
  return (
    <div className="col" style={{ gap: 6 }}>
      <div className="map-box" ref={box} role="region" aria-label="خريطة السيارات" />
      {hidden > 0 && <span className="muted small">{hidden === 1 ? 'في سيارة وحدة' : `في ${hidden} سيارات`} بدون موقع على الخريطة، بتلاقيهم بالقائمة.</span>}
    </div>
  );
}
