'use client';

import { useEffect } from 'react';
import { performanceMonitor, trackPageView } from '@/lib/webVitals';
import { usePathname } from 'next/navigation';

export default function WebVitalsMonitor() {
  const pathname = usePathname();

  useEffect(() => {
    // Initialize performance monitoring
    performanceMonitor.init();
    
    // Track initial page view
    trackPageView(pathname);
  }, []);

  useEffect(() => {
    // Track page changes
    trackPageView(pathname);
  }, [pathname]);

  // Component doesn't render anything
  return null;
}