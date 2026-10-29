import { lazy, Suspense, useEffect, useState } from 'react';
import { templateProfile } from './content';
import './archive.css';

const DesktopPortfolio = lazy(() => import('./DesktopPortfolio'));
const MobilePortfolio = lazy(() => import('./MobilePortfolio'));
const mobileQuery = '(max-width: 767px), (max-height: 500px) and (pointer: coarse)';

export default function PortfolioTemplate() {
  const [mobile, setMobile] = useState(() => matchMedia(mobileQuery).matches);
  useEffect(() => {
    const query = matchMedia(mobileQuery);
    const update = () => setMobile(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return <Suspense fallback={<div className="portfolio-loading" role="status">{templateProfile.brand}</div>}>
    {mobile ? <MobilePortfolio /> : <DesktopPortfolio />}
  </Suspense>;
}
