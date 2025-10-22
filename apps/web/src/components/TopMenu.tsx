'use client';

import { useI18n } from '@/lib/i18n-context';
import LanguageSwitcher from './LanguageSwitcher';
import Link from 'next/link';

export default function TopMenu() {
  const { t } = useI18n();

  return (
    <header className="bg-white border-b border-sky-100 shadow-sm">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex flex-col leading-tight">
          <span className="text-xl font-semibold lowercase text-slate-900 tracking-tight">graspy</span>
          <span className="text-xs text-slate-500">{t('menu.tagline')}</span>
        </div>

      </div>
    </header>
  );
}
