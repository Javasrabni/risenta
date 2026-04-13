'use client';

import { useEffect, useState } from 'react';
import Navbar from './navbar';

export default function ConditionalNavbar() {
  const [mounted, setMounted] = useState(false);
  const [showNavbar, setShowNavbar] = useState(false);

  useEffect(() => {
    // Only run after mount (client-side)
    setMounted(true);
    
    // Check if we're on the write subdomain
    const hostname = window.location.hostname;
    const isWriteSubdomain = hostname === 'write.risentta.com' || hostname.startsWith('write.');
    setShowNavbar(!isWriteSubdomain);
  }, []);

  // Don't render anything during SSR/preload
  if (!mounted) return null;
  
  // After mount, only show if not on write subdomain
  if (!showNavbar) return null;

  return (
    <div className='fixed bottom-8 z-100 left-0 right-0 flex items-center justify-center'>
      <Navbar />
    </div>
  );
}
