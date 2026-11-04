import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { CarCard, Empty, Loading, useLoad } from '../components/ui.jsx';

export default function Favorites() {
  const { data, loading } = useLoad(() => api('/cars/favorites'));
  const cars = data?.cars || [];
  return (
    <main className="container col" style={{ gap: 20 }}>
      <div className="col" style={{ gap: 2 }}><h1>المفضلة</h1><span className="muted">{cars.length} سيارة</span></div>
      {loading ? <Loading /> : cars.length === 0 ? (
        <Empty title="ما في سيارات بالمفضلة" text="اضغط على «احفظ» بأي سيارة عشان تحفظها هون وترجعلها بعدين." action={<Link className="btn" to="/search">دوّر على سيارة</Link>} />
      ) : <div className="grid cards">{cars.map((c) => <CarCard key={c._id} car={c} />)}</div>}
    </main>
  );
}
