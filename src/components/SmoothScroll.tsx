import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { useLocation } from 'react-router-dom';

// Routes where Lenis must be completely disabled (app-shell dashboards with their own scroll containers)
const DASHBOARD_PREFIXES = ['/dashboard/student', '/dashboard/institute', '/dashboard/staff', '/admin'];

function isDashboardRoute(pathname: string) {
  return DASHBOARD_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const lenisRef = useRef<Lenis | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Manage Lenis lifecycle based on dashboard vs public routes
  useEffect(() => {
    const isDashboard = isDashboardRoute(location.pathname);

    if (isDashboard) {
      // If entering a dashboard, destroy Lenis so native container scroll works seamlessly
      if (lenisRef.current) {
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        lenisRef.current.destroy();
        lenisRef.current = null;
      }
      (window as any).__lenis = null;
      document.documentElement.style.removeProperty('overflow');
      document.body.style.removeProperty('overflow');
    } else {
      // Public pages: initialize Lenis if not already active
      if (!lenisRef.current) {
        const lenis = new Lenis({
          duration: 0.95,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          orientation: 'vertical',
          gestureOrientation: 'vertical',
          smoothWheel: true,
          touchMultiplier: 1.5,
          wheelMultiplier: 1.0,
        });

        lenisRef.current = lenis;
        (window as any).__lenis = lenis;

        function raf(time: number) {
          lenis.raf(time);
          rafIdRef.current = requestAnimationFrame(raf);
        }
        rafIdRef.current = requestAnimationFrame(raf);
      }
    }
  }, [location.pathname]);

  // Ensure scroll position resets to top on every route change or scrolls to anchor hash
  useEffect(() => {
    if (location.hash) {
      const el = document.querySelector(location.hash);
      if (el) {
        if (lenisRef.current) {
          lenisRef.current.scrollTo(location.hash, { immediate: true });
        } else {
          el.scrollIntoView({ behavior: 'smooth' });
        }
        return;
      }
    }

    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    }
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname, location.search, location.hash]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (lenisRef.current) {
        lenisRef.current.destroy();
        lenisRef.current = null;
      }
      (window as any).__lenis = null;
      document.documentElement.style.removeProperty('overflow');
      document.body.style.removeProperty('overflow');
    };
  }, []);

  return <>{children}</>;
}
