import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// No sidebar — this layout owns /dashboard only.
// All sub-routes (/dashboard/api, etc.) are inside app/(dashboard)/ and get
// the sidebar layout from there; this file does NOT cascade into them.
export default function DashboardHomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  if (!cookieStore.has('logged_in')) {
    redirect('/login');
  }

  return (
    <div
      style={{
        background: '#080c10',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}
