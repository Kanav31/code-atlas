import { redirect } from 'next/navigation';

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    redirect('/auth/verified?status=error');
  }

  const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
  redirect(`${apiUrl}/api/auth/verify-email?token=${token}`);
}
