import { Outlet, useLocation } from 'react-router-dom';
import { TopNav } from './Sidebar';

export function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-bg-primary transition-colors duration-300">
      <TopNav />
      <main key={location.pathname} className="af-fade px-12 py-8 max-w-[1440px] mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
