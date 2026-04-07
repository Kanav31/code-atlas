import type { Metadata } from 'next';
import ForgotPasswordForm from './ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Forgot your password? Enter your email and we\'ll send you a reset link to get back into Code Atlas.',
  alternates: { canonical: 'https://code-atlas-web.vercel.app/forgot-password' },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
