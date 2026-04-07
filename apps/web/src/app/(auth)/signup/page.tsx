import type { Metadata } from 'next';
import SignupForm from './SignupForm';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Sign up for Code Atlas and start learning backend engineering through interactive visualizers.',
  alternates: { canonical: 'https://code-atlas-web.vercel.app/signup' },
};

export default function SignupPage() {
  return <SignupForm />;
}
