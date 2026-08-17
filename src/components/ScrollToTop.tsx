import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    // If a hash exists (e.g. #section-id), scroll to that element
    if (hash) {
      const element = document.querySelector(hash);
      if (element) {
        if ((window as any).__lenis) {
          (window as any).__lenis.scrollTo(hash, { immediate: true });
        } else {
          element.scrollIntoView({ behavior: 'smooth' });
        }
        return;
      }
    }

    // Scroll window to top
    if ((window as any).__lenis) {
      (window as any).__lenis.scrollTo(0, { immediate: true });
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Reset scroll position on any scrollable main / dashboard containers
    const scrollableElements = document.querySelectorAll('main, [data-scroll-container], .overflow-y-auto');
    scrollableElements.forEach((el) => {
      el.scrollTop = 0;
    });
  }, [pathname, search, hash]);

  return null;
}
