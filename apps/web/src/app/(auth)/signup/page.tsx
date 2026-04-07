import type { Metadata } from 'next';
import SignupForm from './SignupForm';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Sign up for Code Atlas and start learning backend engineering through interactive visualizers.',
};

export default function SignupPage() {
  return <SignupForm />;
}
