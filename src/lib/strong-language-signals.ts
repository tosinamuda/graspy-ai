/**
 * Strong Language Signals - Languages that strongly indicate a specific country
 *
 * These are languages that are either:
 * 1. Primarily/exclusively spoken in one country (Slovak → Slovakia)
 * 2. Have regional variants that clearly indicate location (pt-BR → Brazil)
 *
 * Excludes widely-spoken languages like English, French, Spanish (without region)
 * that don't give clear country signals
 */

export const STRONG_LANGUAGE_SIGNALS: Record<string, string> = {
  // European languages with strong country signals
  'sk': 'SK',           // Slovak → Slovakia
  'sk-SK': 'SK',
  'cs': 'CZ',           // Czech → Czech Republic
  'cs-CZ': 'CZ',
  'hu': 'HU',           // Hungarian → Hungary
  'hu-HU': 'HU',
  'pl': 'PL',           // Polish → Poland
  'pl-PL': 'PL',
  'da': 'DK',           // Danish → Denmark
  'da-DK': 'DK',
  'fi': 'FI',           // Finnish → Finland
  'fi-FI': 'FI',
  'sv': 'SE',           // Swedish → Sweden
  'sv-SE': 'SE',
  'no': 'NO',           // Norwegian → Norway
  'nb': 'NO',           // Norwegian Bokmål
  'nb-NO': 'NO',
  'nn': 'NO',           // Norwegian Nynorsk
  'nn-NO': 'NO',
  'el': 'GR',           // Greek → Greece
  'el-GR': 'GR',
  'ro': 'RO',           // Romanian → Romania
  'ro-RO': 'RO',
  'bg': 'BG',           // Bulgarian → Bulgaria
  'bg-BG': 'BG',
  'hr': 'HR',           // Croatian → Croatia
  'hr-HR': 'HR',
  'sr': 'RS',           // Serbian → Serbia
  'sr-RS': 'RS',
  'sl': 'SI',           // Slovenian → Slovenia
  'sl-SI': 'SI',
  'et': 'EE',           // Estonian → Estonia
  'et-EE': 'EE',
  'lv': 'LV',           // Latvian → Latvia
  'lv-LV': 'LV',
  'lt': 'LT',           // Lithuanian → Lithuania
  'lt-LT': 'LT',
  'mk': 'MK',           // Macedonian → North Macedonia
  'mk-MK': 'MK',
  'sq': 'AL',           // Albanian → Albania
  'sq-AL': 'AL',
  'ka': 'GE',           // Georgian → Georgia
  'ka-GE': 'GE',
  'hy': 'AM',           // Armenian → Armenia
  'hy-AM': 'AM',
  'is': 'IS',           // Icelandic → Iceland
  'is-IS': 'IS',
  'uk': 'UA',           // Ukrainian → Ukraine
  'uk-UA': 'UA',

  // Portuguese variants (strong signal)
  'pt-BR': 'BR',        // Brazilian Portuguese → Brazil
  'pt-PT': 'PT',        // European Portuguese → Portugal

  // Asian languages with strong country signals
  'ja': 'JP',           // Japanese → Japan
  'ja-JP': 'JP',
  'ko': 'KR',           // Korean → South Korea
  'ko-KR': 'KR',
  'th': 'TH',           // Thai → Thailand
  'th-TH': 'TH',
  'vi': 'VN',           // Vietnamese → Vietnam
  'vi-VN': 'VN',
  'tr': 'TR',           // Turkish → Turkey
  'tr-TR': 'TR',
  'he': 'IL',           // Hebrew → Israel
  'he-IL': 'IL',
  'id': 'ID',           // Indonesian → Indonesia
  'id-ID': 'ID',
  'ms': 'MY',           // Malay → Malaysia
  'ms-MY': 'MY',
  'tl': 'PH',           // Tagalog → Philippines
  'fil': 'PH',          // Filipino → Philippines
  'fil-PH': 'PH',
  'bn': 'BD',           // Bengali → Bangladesh (also India, but Bangladesh primary)
  'bn-BD': 'BD',
  'ne': 'NP',           // Nepali → Nepal
  'ne-NP': 'NP',
  'si': 'LK',           // Sinhala → Sri Lanka
  'si-LK': 'LK',
  'km': 'KH',           // Khmer → Cambodia
  'km-KH': 'KH',
  'lo': 'LA',           // Lao → Laos
  'lo-LA': 'LA',
  'my': 'MM',           // Burmese → Myanmar
  'my-MM': 'MM',
  'mn': 'MN',           // Mongolian → Mongolia
  'mn-MN': 'MN',

  // Arabic regional variants (strong signals)
  'ar-SA': 'SA',        // Saudi Arabia
  'ar-EG': 'EG',        // Egypt
  'ar-PS': 'PS',        // Palestine
  'ar-JO': 'JO',        // Jordan
  'ar-LB': 'LB',        // Lebanon
  'ar-SY': 'SY',        // Syria
  'ar-IQ': 'IQ',        // Iraq
  'ar-YE': 'YE',        // Yemen
  'ar-SD': 'SD',        // Sudan
  'ar-DZ': 'DZ',        // Algeria
  'ar-MA': 'MA',        // Morocco
  'ar-TN': 'TN',        // Tunisia
  'ar-AE': 'AE',        // UAE
  'ar-KW': 'KW',        // Kuwait
  'ar-BH': 'BH',        // Bahrain
  'ar-QA': 'QA',        // Qatar
  'ar-OM': 'OM',        // Oman

  // African languages with strong signals
  'yo': 'NG',           // Yoruba → Nigeria
  'ig': 'NG',           // Igbo → Nigeria
  'ha': 'NG',           // Hausa → Nigeria (also Niger, but Nigeria primary)
  'af': 'ZA',           // Afrikaans → South Africa
  'af-ZA': 'ZA',
  'zu': 'ZA',           // Zulu → South Africa
  'zu-ZA': 'ZA',
  'xh': 'ZA',           // Xhosa → South Africa
  'xh-ZA': 'ZA',
  'sw-KE': 'KE',        // Swahili-Kenya → Kenya
  'sw-TZ': 'TZ',        // Swahili-Tanzania → Tanzania
  'am': 'ET',           // Amharic → Ethiopia
  'am-ET': 'ET',
  'so': 'SO',           // Somali → Somalia
  'so-SO': 'SO',

  // Crisis zone languages
  'ps': 'AF',           // Pashto → Afghanistan
  'ps-AF': 'AF',
  'fa-AF': 'AF',        // Dari → Afghanistan
  'ku-IQ': 'IQ',        // Kurdish-Iraq
  'ku-SY': 'SY',        // Kurdish-Syria

  // Chinese variants
  'zh-CN': 'CN',        // Simplified Chinese → China
  'zh-TW': 'TW',        // Traditional Chinese → Taiwan
  'zh-HK': 'HK',        // Hong Kong Chinese
};

/**
 * Check if a language code provides a strong signal for country detection
 */
export function getCountryFromLanguage(language: string): string | null {
  // Try exact match first
  if (STRONG_LANGUAGE_SIGNALS[language]) {
    return STRONG_LANGUAGE_SIGNALS[language];
  }

  // Try base language code (e.g., "sk" from "sk-SK")
  const baseLanguage = language.split('-')[0];
  if (STRONG_LANGUAGE_SIGNALS[baseLanguage]) {
    return STRONG_LANGUAGE_SIGNALS[baseLanguage];
  }

  return null;
}

/**
 * Check all user language preferences for strong signals
 */
export function getCountryFromLanguages(languages: string[]): string | null {
  for (const lang of languages) {
    const country = getCountryFromLanguage(lang);
    if (country) return country;
  }
  return null;
}
