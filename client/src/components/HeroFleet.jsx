import { useRef } from 'react';
import { Icon } from './ui.jsx';
import sportage from '../assets/hero/sportage.webp';
import tucson from '../assets/hero/tucson.webp';
import rav4 from '../assets/hero/rav4.webp';

// Real photos of three cars from the fleet (see assets/hero/CREDITS.md), cut out of their backgrounds.
// Each car carries an SVG layer drawn in the photo's own pixel space (`w` x `h` of the full-size cut-out)
// that traces its real LEDs: `drl` are the daytime-running-light strips, `lamps` the headlamp units.
// The layer is screen-blended over the photo, so the lights switch on, blink and glow on the real lamps.
const CARS = [
  {
    key: 'tucson', name: 'هيونداي توسان', src: tucson, w: 3562, h: 1782, slot: 'back-left', delay: 0.9,
    drl: ['M929 943 L1100 913', 'M887 1026 L1050 998', 'M867 1092 L992 1072', 'M854 1147 L933 1138', 'M1142 943 L1250 918 L1375 887'],
    lamps: [{ cx: 1258, cy: 1172, rx: 105, ry: 80 }, { cx: 150, cy: 1030, rx: 55, ry: 120, far: true }],
    width: 16,
  },
  {
    key: 'sportage', name: 'كيا سبورتاج', src: sportage, w: 3583, h: 2099, slot: 'front', delay: 0.4,
    drl: ['M1633 882 L1800 937 L1950 1003 L2042 1070 L2096 1132 L2067 1195 L1992 1287 L1900 1362 L1867 1377'],
    bars: ['M1692 1057 L1967 1049', 'M1696 1082 L1983 1074', 'M1700 1107 L2000 1099'],
    lamps: [{ cx: 1842, cy: 1095, rx: 200, ry: 80 }, { cx: 3490, cy: 1030, rx: 50, ry: 95, far: true }],
    width: 26,
  },
  {
    key: 'rav4', name: 'تويوتا RAV4', src: rav4, w: 3445, h: 1879, slot: 'back-right', delay: 1.4,
    drl: ['M1955 858 L1939 900 L1992 963', 'M1960 856 L2245 884 L2508 930'],
    lamps: [{ cx: 2192, cy: 953, rx: 160, ry: 70 }, { cx: 3320, cy: 870, rx: 45, ry: 60, far: true }],
    width: 16,
  },
];

function Leds({ car }) {
  const id = `led-${car.key}`;
  return (
    <svg className="leds" viewBox={`0 0 ${car.w} ${car.h}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="22" /></filter>
        <filter id={`${id}-halo`} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="70" /></filter>
        <radialGradient id={`${id}-lamp`}>
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset=".35" stopColor="#E4EFFF" stopOpacity=".75" />
          <stop offset="1" stopColor="#BFD6FF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-flare`}>
          <stop offset="0" stopColor="#CFE0FF" stopOpacity="0" />
          <stop offset=".5" stopColor="#FFFFFF" stopOpacity=".9" />
          <stop offset="1" stopColor="#CFE0FF" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Wide halo around every light */}
      <g filter={`url(#${id}-halo)`} opacity=".55">
        {car.drl.map((d) => <path key={d} d={d} fill="none" stroke="#CFE2FF" strokeWidth={car.width * 5} strokeLinecap="round" strokeLinejoin="round" />)}
        {car.lamps.map((l) => <ellipse key={`${l.cx}`} cx={l.cx} cy={l.cy} rx={l.rx * 1.4} ry={l.ry * 1.4} fill="#CFE2FF" />)}
      </g>
      {/* Headlamp units */}
      <g className="lamps">
        {car.lamps.map((l) => <ellipse key={`${l.cx}`} cx={l.cx} cy={l.cy} rx={l.rx} ry={l.ry} fill={`url(#${id}-lamp)`} opacity={l.far ? 0.8 : 1} />)}
        {car.lamps.filter((l) => !l.far).map((l) => (
          <rect key={`f${l.cx}`} className="flare" x={l.cx - l.rx * 4} y={l.cy - 6} width={l.rx * 8} height="12" rx="6" fill={`url(#${id}-flare)`} />
        ))}
      </g>
      {/* LED strips: soft glow, then the bright core that draws on like a welcome sequence */}
      <g filter={`url(#${id}-soft)`}>
        {car.drl.map((d) => <path key={d} d={d} fill="none" stroke="#E6F0FF" strokeWidth={car.width * 2.2} strokeLinecap="round" strokeLinejoin="round" />)}
        {car.bars?.map((d) => <path key={d} d={d} fill="none" stroke="#E6F0FF" strokeWidth="14" strokeLinecap="round" />)}
      </g>
      <g className="drl">
        {car.drl.map((d) => <path key={d} d={d} pathLength="1" fill="none" stroke="#FFFFFF" strokeWidth={car.width} strokeLinecap="round" strokeLinejoin="round" />)}
        {car.bars?.map((d) => <path key={d} d={d} pathLength="1" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />)}
      </g>
    </svg>
  );
}

export default function HeroFleet() {
  const ref = useRef(null);
  // Gentle depth parallax: the front car moves more than the two behind it.
  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    el.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  };
  return (
    <div
      ref={ref}
      className="fleet"
      onPointerMove={onMove}
      onPointerLeave={() => { ref.current?.style.setProperty('--px', 0); ref.current?.style.setProperty('--py', 0); }}
    >
      <span className="fleet-word" aria-hidden="true">REDRIVE</span>
      <span className="fleet-floor" aria-hidden="true" />
      {CARS.map((car) => (
        <div key={car.key} className={`fleet-car ${car.slot}`} style={{ '--d': `${car.delay}s` }}>
          <div className="fleet-depth">
            <img className="fleet-reflection" src={car.src} alt="" aria-hidden="true" />
            <img className="fleet-photo" src={car.src} alt={`${car.name} وأضويتها شغّالة`} width={car.w} height={car.h} fetchPriority={car.slot === 'front' ? 'high' : 'auto'} />
            <Leds car={car} />
          </div>
        </div>
      ))}
      <div className="fleet-chip chip-a">
        <span className="ic"><Icon name="clock" size={18} color="var(--electric)" /></span>
        <span><b>رد خلال 12 ساعة</b><small>وإلا بيرجعلك المبلغ كامل</small></span>
      </div>
      <div className="fleet-chip chip-b">
        <span className="ic"><Icon name="shield" size={18} color="var(--electric)" /></span>
        <span><b>إلغاء مجاني</b><small>أول 6 ساعات بعد الموافقة</small></span>
      </div>
    </div>
  );
}
