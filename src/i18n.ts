import { getRequestConfig } from 'next-intl/server';
import { getUserProfile } from './lib/user-storage';

export default getRequestConfig(async () => {
  // Get user's language from localStorage (client-side) or default to 'en'
  // In Next.js App Router, this runs on server, so we'll use a different approach
  // We'll pass locale via middleware or use client-side detection

  const locale = 'en'; // Default, will be overridden client-side

  return {
    locale,
    messages: (await import(`./locales/${locale}.json`)).default,
  };
});
