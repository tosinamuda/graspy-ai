'use client';

import { useI18n } from '@/lib/i18n-context';
import LanguageSwitcher from './LanguageSwitcher';

export default function TopMenu() {
  const { t } = useI18n();

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
            G
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">graspy</h1>
            <p className="text-xs text-gray-500">{t('menu.tagline')}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-6">
          <a
            href="/dashboard"
            className="text-gray-700 hover:text-teal-600 font-medium transition-colors"
          >
            {t('menu.dashboard')}
          </a>
          <a
            href="#"
            className="text-gray-700 hover:text-teal-600 font-medium transition-colors"
          >
            {t('menu.myProgress')}
          </a>
          <a
            href="#"
            className="text-gray-700 hover:text-teal-600 font-medium transition-colors"
          >
            {t('menu.settings')}
          </a>
        </nav>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <div className="w-9 h-9 bg-teal-600 rounded-full flex items-center justify-center text-white font-semibold cursor-pointer hover:bg-teal-700 transition-colors">
            U
          </div>
        </div>
      </div>
    </header>
  );
}
