import type { Metadata } from 'next';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your Code Atlas account to access interactive systems engineering modules.',
  alternates: { canonical: 'https://code-atlas-web.vercel.app/login' },
};

export default function LoginPage() {
  return <LoginForm />;
}
