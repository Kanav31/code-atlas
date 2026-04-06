export type Provider = 'LOCAL' | 'GOOGLE' | 'GITHUB';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  provider: Provider;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  subscribeNewsletter?: boolean;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
}
