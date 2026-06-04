import { useEffect, useState } from 'react';

/**
 * Tracks whether the page has scrolled far enough to show a "back to top"
 * affordance, and exposes the scroll action used by that control.
 */
export const useScroll = () => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    if (window.scrollY > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  return { isVisible, scrollToTop };
};
