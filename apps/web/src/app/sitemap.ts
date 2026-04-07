import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://code-atlas-web.vercel.app';
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/signup`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/forgot-password`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];
}
