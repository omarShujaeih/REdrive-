import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { CarCard, Empty, PageHead, SkeletonCards, useLoad } from '../components/ui.jsx';

export default function Favorites() {
  const { data, loading } = useLoad(() => api('/cars/favorites'));
  const cars = data?.cars || [];
  return (
    <main>
      <div className="page-band">
        <div className="container">
          <PageHead crumbs={[['/', 'الرئيسية'], [null, 'المفضلة']]} kicker="حسابي" title="المفضلة" sub={loading ? 'السيارات اللي حفظتها عشان ترجعلها بعدين.' : `${cars.length} سيارة محفوظة`} />
        </div>
      </div>
      <div className="container page-body">
        {loading ? <SkeletonCards count={3} className="grid cards three" /> : cars.length === 0 ? (
          <Empty icon="heart" title="ما في سيارات بالمفضلة" text="اضغط على «احفظ» بأي سيارة عشان تحفظها هون وترجعلها بعدين." action={<Link className="btn" to="/search">دوّر على سيارة</Link>} />
        ) : <div className="grid cards three">{cars.map((c) => <CarCard key={c._id} car={c} />)}</div>}
      </div>
    </main>
  );
}
