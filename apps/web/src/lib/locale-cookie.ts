/**
 * Locale Cookie Management
 * Handles storing and retrieving user's language preference via cookies
 */

const LOCALE_COOKIE_NAME = 'graspy_locale';

/**
 * Set locale cookie (client-side)
 */
export function setLocaleCookie(locale: string) {
  if (typeof document === 'undefined') return;

  // Set cookie for 1 year
  const maxAge = 365 * 24 * 60 * 60;
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Get locale from cookie (client-side)
 */
export function getLocaleCookie(): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split('; ');
  const localeCookie = cookies.find(cookie => cookie.startsWith(`${LOCALE_COOKIE_NAME}=`));

  if (localeCookie) {
    return localeCookie.split('=')[1];
  }

  return null;
}

/**
 * Get locale from cookie (server-side - Next.js)
 */
export function getLocaleFromHeaders(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split('; ');
  const localeCookie = cookies.find(cookie => cookie.startsWith(`${LOCALE_COOKIE_NAME}=`));

  if (localeCookie) {
    return localeCookie.split('=')[1];
  }

  return null;
}
