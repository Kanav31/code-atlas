export interface NewsletterSubscription {
  id: string;
  email: string;
  subscribedAt: string;
  unsubscribedAt: string | null;
}

export interface SubscribeDto {
  email: string;
}
