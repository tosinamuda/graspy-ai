/**
 * Countries and Languages supported by graspy
 * Uses Intl API to support all countries while prioritizing crisis zones
 */

export interface Country {
  code: string;
  languages: string[];
}

/**
 * Supported language codes - names generated dynamically via Intl API
 */
export const SUPPORTED_LANGUAGES = [
  'ar', // Arabic
  'en', // English
  'fr', // French
  'es', // Spanish
  'yo', // Yoruba
  'ha', // Hausa
  'ig', // Igbo
  'ps', // Pashto
  'fa', // Dari/Persian
  'so', // Somali
  'sw', // Swahili
  'am', // Amharic
  'ku', // Kurdish
  'ur', // Urdu
  'bn', // Bengali
  'pt', // Portuguese
  'hi', // Hindi
  'zh', // Chinese
  'ru', // Russian
  'de', // German
  'it', // Italian
  'ja', // Japanese
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

/**
 * Crisis zone countries - shown first in the dropdown
 * Mapped with their common languages
 */
export const CRISIS_ZONE_COUNTRIES: Country[] = [
  { code: 'PS', languages: ['ar', 'en'] },
  { code: 'NG', languages: ['en', 'yo', 'ha', 'ig'] },
  { code: 'AF', languages: ['ps', 'fa', 'en'] },
  { code: 'SY', languages: ['ar', 'en', 'ku'] },
  { code: 'SO', languages: ['so', 'ar', 'en'] },
  { code: 'SD', languages: ['ar', 'en'] },
  { code: 'SS', languages: ['en', 'ar'] },
  { code: 'YE', languages: ['ar', 'en'] },
  { code: 'IQ', languages: ['ar', 'ku', 'en'] },
  { code: 'LB', languages: ['ar', 'en', 'fr'] },
  { code: 'JO', languages: ['ar', 'en'] },
  { code: 'ET', languages: ['am', 'en'] },
  { code: 'KE', languages: ['sw', 'en'] },
  { code: 'UG', languages: ['en', 'sw'] },
  { code: 'PK', languages: ['ur', 'en'] },
  { code: 'BD', languages: ['bn', 'en'] },
  { code: 'CD', languages: ['fr', 'sw', 'en'] },
  { code: 'CF', languages: ['fr', 'en'] },
  { code: 'TD', languages: ['fr', 'ar', 'en'] },
  { code: 'MM', languages: ['en'] }, // Myanmar
  { code: 'VE', languages: ['es', 'en'] }, // Venezuela
];

/**
 * Get all available countries from Intl API
 * Returns crisis zones first, then all other countries alphabetically
 */
export function getAllCountries(): Country[] {
  // Get all country codes from Intl.supportedValuesOf (if available) or fallback to common ISO codes
  let allCountryCodes: string[] = [];

  try {
    // @ts-ignore - supportedValuesOf is not in all TypeScript versions yet
    if (Intl.supportedValuesOf) {
      // @ts-ignore
      allCountryCodes = Intl.supportedValuesOf('region');
    } else {
      // Fallback: comprehensive list of ISO 3166-1 alpha-2 country codes
      allCountryCodes = getAllCountryCodesFallback();
    }
  } catch {
    allCountryCodes = getAllCountryCodesFallback();
  }

  const crisisZoneCodes = new Set(CRISIS_ZONE_COUNTRIES.map(c => c.code));

  // Filter out crisis zones from all countries
  const otherCountryCodes = allCountryCodes.filter(code => !crisisZoneCodes.has(code));

  // Create country objects for non-crisis zones with default language mapping
  const otherCountries: Country[] = otherCountryCodes.map(code => ({
    code,
    languages: getDefaultLanguagesForCountry(code),
  }));

  // Sort other countries alphabetically by name
  otherCountries.sort((a, b) => {
    const nameA = getCountryName(a.code);
    const nameB = getCountryName(b.code);
    return nameA.localeCompare(nameB);
  });

  // Return crisis zones first, then all others
  return [...CRISIS_ZONE_COUNTRIES, ...otherCountries];
}

/**
 * Fallback list of ISO 3166-1 alpha-2 country codes
 */
function getAllCountryCodesFallback(): string[] {
  return [
    'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT',
    'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI',
    'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY',
    'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN',
    'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM',
    'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK',
    'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL',
    'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM',
    'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR',
    'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN',
    'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS',
    'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK',
    'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW',
    'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP',
    'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM',
    'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW',
    'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM',
    'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF',
    'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW',
    'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI',
    'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW',
  ];
}

/**
 * Get default languages for a country based on common mappings
 */
function getDefaultLanguagesForCountry(countryCode: string): string[] {
  // Common country -> language mappings
  const countryLanguageMap: Record<string, string[]> = {
    US: ['en', 'es'],
    GB: ['en'],
    CA: ['en', 'fr'],
    AU: ['en'],
    NZ: ['en'],
    IE: ['en'],
    IN: ['hi', 'en'],
    CN: ['zh', 'en'],
    JP: ['ja', 'en'],
    KR: ['en'],
    DE: ['de', 'en'],
    FR: ['fr', 'en'],
    ES: ['es', 'en'],
    IT: ['it', 'en'],
    PT: ['pt', 'en'],
    BR: ['pt', 'en'],
    RU: ['ru', 'en'],
    MX: ['es', 'en'],
    AR: ['es', 'en'],
    CL: ['es', 'en'],
    CO: ['es', 'en'],
    PE: ['es', 'en'],
    EG: ['ar', 'en'],
    SA: ['ar', 'en'],
    AE: ['ar', 'en'],
    MA: ['ar', 'fr', 'en'],
    DZ: ['ar', 'fr', 'en'],
    TN: ['ar', 'fr', 'en'],
    TR: ['en'],
    IR: ['fa', 'en'],
    TH: ['en'],
    VN: ['en'],
    ID: ['en'],
    PH: ['en'],
    MY: ['en'],
    SG: ['en', 'zh'],
    ZA: ['en'],
    GH: ['en'],
    TZ: ['sw', 'en'],
    RW: ['en', 'fr'],
    UA: ['en'],
    PL: ['en'],
    RO: ['en'],
    GR: ['en'],
    NL: ['en'],
    BE: ['fr', 'en'],
    SE: ['en'],
    NO: ['en'],
    DK: ['en'],
    FI: ['en'],
    CH: ['de', 'fr', 'it', 'en'],
  };

  return countryLanguageMap[countryCode] || ['en'];
}

/**
 * Get language name in English using Intl API
 */
export function getLanguageName(languageCode: string, displayLang: string = 'en'): string {
  try {
    const displayNames = new Intl.DisplayNames([displayLang], { type: 'language' });
    return displayNames.of(languageCode) || languageCode;
  } catch {
    return languageCode;
  }
}

/**
 * Get language name in its native script using Intl API
 */
export function getLanguageNativeName(languageCode: string): string {
  try {
    const displayNames = new Intl.DisplayNames([languageCode], { type: 'language' });
    return displayNames.of(languageCode) || languageCode;
  } catch {
    return languageCode;
  }
}

/**
 * Get country name using Intl API
 */
export function getCountryName(countryCode: string, displayLang: string = 'en'): string {
  // Custom overrides for consistency
  const customNames: Record<string, string> = {
    'OTHER': 'Other',
    'PS': 'Palestine',
  };

  if (customNames[countryCode]) {
    return customNames[countryCode];
  }

  try {
    const displayNames = new Intl.DisplayNames([displayLang], { type: 'region' });
    return displayNames.of(countryCode) || countryCode;
  } catch {
    return countryCode;
  }
}

/**
 * Get formatted language info for display
 */
export function getLanguageInfo(languageCode: string) {
  return {
    code: languageCode,
    name: getLanguageName(languageCode),
    nativeName: getLanguageNativeName(languageCode),
  };
}

export const GRADE_LEVELS = [
  { value: 'beginner', label: 'Beginner (Ages 6-8)', ageRange: '6-8' },
  { value: 'elementary', label: 'Elementary (Ages 9-11)', ageRange: '9-11' },
  { value: 'middle', label: 'Middle (Ages 12-14)', ageRange: '12-14' },
  { value: 'high', label: 'High (Ages 15-17)', ageRange: '15-17' },
];
