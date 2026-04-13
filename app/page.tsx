import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Body from '@/components/sections/body';

export default async function Home() {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const subdomain = host.split('.')[0];
  
  // Handle write subdomain - redirect to /write
  if (subdomain === 'write' || host.startsWith('write.local.test')) {
    redirect('/write');
  }
  
  // Handle internal subdomain - redirect to /internal
  if (subdomain === 'internal' || host.startsWith('internal.local.test')) {
    redirect('/internal');
  }
  
  // Default: main domain landing page
  return (
    <div>
      <Body />
    </div>
  );
}
