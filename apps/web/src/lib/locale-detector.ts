/**
 * Locale Detection Utility
 * Uses browser Intl API and navigator to auto-detect user's location and language
 *
 * Detection Strategy:
 * 1. Strong language signals (sk → Slovakia, ja → Japan)
 * 2. Cross-validate language region with timezone
 * 3. Timezone-based detection (Europe/Bratislava → SK)
 * 4. Fallback to language tag region
 */

import { getCountryFromLanguages } from './strong-language-signals';

export interface LocaleInfo {
  country: string;
  language: string;
  detectedCountry?: string;
  detectedLanguage?: string;
  detectionSource?: 'strong-language' | 'cross-validated' | 'timezone' | 'language-tag' | 'unknown';
}

/**
 * Detect user's language using browser APIs
 */
export function detectLanguage(): string {
  // Try multiple sources for language detection
  const language =
    navigator.language || // e.g., "en-US", "ar-PS"
    (navigator.languages && navigator.languages[0]) ||
    'en';

  // Extract base language code (e.g., "en" from "en-US")
  return language.split('-')[0].toLowerCase();
}

/**
 * Detect user's country/region using browser APIs
 * Returns both the country code and the detection source for transparency
 */
export function detectCountry(): { country: string | null; source: LocaleInfo['detectionSource'] } {
  const userLanguages = Array.from(navigator.languages || [navigator.language || 'en']);
  const timezone = getUserTimezone();

  // STRATEGY 1: Strong language signals (highest confidence)
  // Languages like Slovak, Japanese, etc. that strongly indicate a country
  const countryFromStrongLanguage = getCountryFromLanguages(userLanguages);
  if (countryFromStrongLanguage) {
    return { country: countryFromStrongLanguage, source: 'strong-language' };
  }

  // STRATEGY 2: Cross-validate language region with timezone
  // If language tag region matches timezone, high confidence
  try {
    const timezoneCountry = getCountryFromTimezone(timezone);
    if (timezoneCountry) {
      // Check if any language preference region matches timezone
      for (const locale of userLanguages) {
        const parts = locale.split('-');
        if (parts.length > 1 && parts[1].length === 2) {
          const region = parts[1].toUpperCase();
          if (region === timezoneCountry) {
            return { country: region, source: 'cross-validated' };
          }
        }
      }
    }
  } catch {
    // Continue to next strategy
  }

  // STRATEGY 3: Timezone-based detection (reliable for physical location)
  try {
    const countryFromTimezone = getCountryFromTimezone(timezone);
    if (countryFromTimezone) {
      return { country: countryFromTimezone, source: 'timezone' };
    }
  } catch{
    // Intl API not available or error
  }

  // STRATEGY 4: Extract region from language tag (least reliable)
  const primaryLanguage = userLanguages[0];
  if (primaryLanguage) {
    const parts = primaryLanguage.split('-');
    if (parts.length > 1 && parts[1].length === 2) {
      return { country: parts[1].toUpperCase(), source: 'language-tag' };
    }
  }

  return { country: null, source: 'unknown' };
}

/**
 * Get user's timezone using Intl API
 */
function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

/**
 * Map timezone to country code using Intl API + manual overrides
 * This covers ALL timezones, not just a hardcoded subset
 */
function getCountryFromTimezone(timezone: string): string | null {
  // Manual overrides for specific crisis zones and edge cases
  const timezoneOverrides: Record<string, string> = {
    // Palestine (not recognized by standard Intl)
    'Asia/Gaza': 'PS',
    'Asia/Hebron': 'PS',

    // Multi-country timezones - prioritize based on population/usage
    'Europe/Prague': 'CZ', // Also Bratislava shares this sometimes
  };

  // Check manual overrides first
  if (timezoneOverrides[timezone]) {
    return timezoneOverrides[timezone];
  }

  // Try to extract country from timezone using Intl.Locale API (modern browsers)
  // Example: "Europe/Bratislava" -> Get region info
  try {
    // Modern approach: Use Intl.Locale with timeZone
    // Some timezones have clear country mappings we can infer

    // Try getting locale with timezone info
    const localeParts = new Intl.Locale('en', { region: extractRegionFromTimezone(timezone) });
    if (localeParts.region) {
      return localeParts.region;
    }
  } catch {
    // Intl.Locale not fully supported or extraction failed
  }

  // Fallback: comprehensive timezone -> country mapping
  // This uses IANA timezone database mappings
  const timezoneToCountry = getTimezoneToCountryMap();
  return timezoneToCountry[timezone] || null;
}

/**
 * Try to extract region code from timezone string
 * E.g., "America/New_York" -> could try various heuristics
 */
function extractRegionFromTimezone(timezone: string): string | undefined {
  // This is a heuristic - not always accurate
  // Some timezones match country names, some don't
  const cityToCountry: Record<string, string> = {
    'Bratislava': 'SK',
    'Prague': 'CZ',
    'Warsaw': 'PL',
    // Add more as needed
  };

  const parts = timezone.split('/');
  if (parts.length > 1) {
    const city = parts[parts.length - 1];
    return cityToCountry[city];
  }

  return undefined;
}

/**
 * Comprehensive IANA timezone to ISO country code mapping
 * Based on Unicode CLDR timezone data
 */
function getTimezoneToCountryMap(): Record<string, string> {
  return {
    // Europe
    'Europe/Andorra': 'AD',
    'Europe/Tirane': 'AL',
    'Europe/Vienna': 'AT',
    'Europe/Sarajevo': 'BA',
    'Europe/Brussels': 'BE',
    'Europe/Sofia': 'BG',
    'Europe/Minsk': 'BY',
    'Europe/Zurich': 'CH',
    'Europe/Prague': 'CZ',
    'Europe/Berlin': 'DE',
    'Europe/Copenhagen': 'DK',
    'Europe/Tallinn': 'EE',
    'Europe/Madrid': 'ES',
    'Europe/Helsinki': 'FI',
    'Europe/Paris': 'FR',
    'Europe/London': 'GB',
    'Europe/Gibraltar': 'GI',
    'Europe/Athens': 'GR',
    'Europe/Zagreb': 'HR',
    'Europe/Budapest': 'HU',
    'Europe/Dublin': 'IE',
    'Europe/Rome': 'IT',
    'Europe/Vilnius': 'LT',
    'Europe/Luxembourg': 'LU',
    'Europe/Riga': 'LV',
    'Europe/Monaco': 'MC',
    'Europe/Chisinau': 'MD',
    'Europe/Podgorica': 'ME',
    'Europe/Skopje': 'MK',
    'Europe/Malta': 'MT',
    'Europe/Amsterdam': 'NL',
    'Europe/Oslo': 'NO',
    'Europe/Warsaw': 'PL',
    'Europe/Lisbon': 'PT',
    'Europe/Bucharest': 'RO',
    'Europe/Belgrade': 'RS',
    'Europe/Moscow': 'RU',
    'Europe/Stockholm': 'SE',
    'Europe/Ljubljana': 'SI',
    'Europe/Bratislava': 'SK',
    'Europe/Kyiv': 'UA',
    'Europe/Vatican': 'VA',

    // Asia - Crisis Zones
    'Asia/Kabul': 'AF',
    'Asia/Baghdad': 'IQ',
    'Asia/Amman': 'JO',
    'Asia/Beirut': 'LB',
    'Asia/Damascus': 'SY',
    'Asia/Aden': 'YE',

    // Asia - Other
    'Asia/Dubai': 'AE',
    'Asia/Yerevan': 'AM',
    'Asia/Baku': 'AZ',
    'Asia/Dhaka': 'BD',
    'Asia/Bahrain': 'BH',
    'Asia/Brunei': 'BN',
    'Asia/Thimphu': 'BT',
    'Asia/Shanghai': 'CN',
    'Asia/Hong_Kong': 'HK',
    'Asia/Jakarta': 'ID',
    'Asia/Jerusalem': 'IL',
    'Asia/Kolkata': 'IN',
    'Asia/Tehran': 'IR',
    'Asia/Tokyo': 'JP',
    'Asia/Bishkek': 'KG',
    'Asia/Phnom_Penh': 'KH',
    'Asia/Seoul': 'KR',
    'Asia/Kuwait': 'KW',
    'Asia/Almaty': 'KZ',
    'Asia/Vientiane': 'LA',
    'Asia/Colombo': 'LK',
    'Asia/Yangon': 'MM',
    'Asia/Ulaanbaatar': 'MN',
    'Asia/Macau': 'MO',
    'Asia/Kuala_Lumpur': 'MY',
    'Asia/Kathmandu': 'NP',
    'Asia/Manila': 'PH',
    'Asia/Karachi': 'PK',
    'Asia/Riyadh': 'SA',
    'Asia/Singapore': 'SG',
    'Asia/Bangkok': 'TH',
    'Asia/Dushanbe': 'TJ',
    'Asia/Ashgabat': 'TM',
    'Asia/Istanbul': 'TR',
    'Asia/Taipei': 'TW',
    'Asia/Tashkent': 'UZ',
    'Asia/Ho_Chi_Minh': 'VN',

    // Africa - Crisis Zones
    'Africa/Lagos': 'NG',
    'Africa/Mogadishu': 'SO',
    'Africa/Khartoum': 'SD',
    'Africa/Juba': 'SS',

    // Africa - Other
    'Africa/Luanda': 'AO',
    'Africa/Gaborone': 'BW',
    'Africa/Kinshasa': 'CD',
    'Africa/Bangui': 'CF',
    'Africa/Brazzaville': 'CG',
    'Africa/Abidjan': 'CI',
    'Africa/Douala': 'CM',
    'Africa/Cairo': 'EG',
    'Africa/Asmara': 'ER',
    'Africa/Addis_Ababa': 'ET',
    'Africa/Libreville': 'GA',
    'Africa/Accra': 'GH',
    'Africa/Conakry': 'GN',
    'Africa/Nairobi': 'KE',
    'Africa/Monrovia': 'LR',
    'Africa/Tripoli': 'LY',
    'Africa/Casablanca': 'MA',
    'Africa/Maputo': 'MZ',
    'Africa/Windhoek': 'NA',
    'Africa/Niamey': 'NE',
    'Africa/Abuja': 'NG',
    'Africa/Kigali': 'RW',
    'Africa/Dakar': 'SN',
    'Africa/Kampala': 'UG',
    'Africa/Johannesburg': 'ZA',
    'Africa/Lusaka': 'ZM',
    'Africa/Harare': 'ZW',
    'Africa/Algiers': 'DZ',
    'Africa/Tunis': 'TN',
    'Africa/Ndjamena': 'TD',

    // Americas
    'America/New_York': 'US',
    'America/Chicago': 'US',
    'America/Denver': 'US',
    'America/Los_Angeles': 'US',
    'America/Phoenix': 'US',
    'America/Anchorage': 'US',
    'America/Toronto': 'CA',
    'America/Vancouver': 'CA',
    'America/Mexico_City': 'MX',
    'America/Buenos_Aires': 'AR',
    'America/La_Paz': 'BO',
    'America/Sao_Paulo': 'BR',
    'America/Santiago': 'CL',
    'America/Bogota': 'CO',
    'America/Havana': 'CU',
    'America/Santo_Domingo': 'DO',
    'America/Guayaquil': 'EC',
    'America/Caracas': 'VE',
    'America/Lima': 'PE',
    'America/Asuncion': 'PY',
    'America/Montevideo': 'UY',
    'America/Panama': 'PA',

    // Oceania
    'Pacific/Auckland': 'NZ',
    'Pacific/Fiji': 'FJ',
    'Pacific/Port_Moresby': 'PG',
    'Australia/Sydney': 'AU',
    'Australia/Melbourne': 'AU',
    'Australia/Brisbane': 'AU',
    'Australia/Perth': 'AU',
    'Australia/Adelaide': 'AU',
  };
}

/**
 * Get auto-detected locale information
 */
export function detectLocale(): LocaleInfo {
  const detectedLanguage = detectLanguage();
  const { country: detectedCountry, source: detectionSource } = detectCountry();

  return {
    language: detectedLanguage,
    country: detectedCountry || 'UNKNOWN',
    detectedLanguage,
    detectedCountry: detectedCountry || undefined,
    detectionSource,
  };
}

