import { useEffect, useRef, useState } from 'react';
import { money } from '../labels.js';

const KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;
let loader;
function loadGoogle() {
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&language=ar&region=PS`;
      s.async = true;
      s.onload = () => resolve(window.google);
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  return loader;
}

// Groups cars by rental company (one pin per company) and shows a preview card on click.
export default function MapView({ cars, center, onSelectCompany }) {
  const ref = useRef(null);
  const [failed, setFailed] = useState(!KEY);

  useEffect(() => {
    if (!KEY) return undefined;
    let markers = [];
    loadGoogle().then((google) => {
      const map = new google.maps.Map(ref.current, { center: center || { lat: 31.9, lng: 35.2 }, zoom: center ? 12 : 9, mapTypeControl: false, streetViewControl: false });
      const groups = {};
      cars.forEach((c) => {
        const id = c.company?._id; const p = c.pickupLocation;
        if (!id || p?.lat == null) return;
        groups[id] = groups[id] || { company: c.company, pos: { lat: p.lat, lng: p.lng }, cars: [] };
        groups[id].cars.push(c);
      });
      markers = Object.values(groups).map((g) => {
        const m = new google.maps.Marker({ map, position: g.pos, label: { text: money(Math.min(...g.cars.map((c) => c.dailyPrice))), fontSize: '12px', fontWeight: '700' } });
        m.addListener('click', () => onSelectCompany?.(g));
        return m;
      });
      if (center) new google.maps.Marker({ map, position: center, icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#1B2F5E', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 } });
    }).catch(() => setFailed(true));
    return () => markers.forEach((m) => m.setMap(null));
  }, [cars, center, onSelectCompany]);

  if (failed) {
    return (
      <div className="map-box" style={{ display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
        <div className="col" style={{ alignItems: 'center' }}>
          <b>الخريطة بتحتاج مفتاح Google Maps</b>
          <span className="muted small">حط VITE_GOOGLE_MAPS_KEY بملف client/.env. لهلأ السيارات مرتّبة حسب القرب من موقعك تحت.</span>
        </div>
      </div>
    );
  }
  return <div className="map-box" ref={ref} />;
}
