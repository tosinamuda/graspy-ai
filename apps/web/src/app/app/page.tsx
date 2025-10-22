'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { hasCompletedOnboarding } from '@/lib/user-storage';

export default function AppEntryPage() {
  const router = useRouter();

  useEffect(() => {
    const destination = hasCompletedOnboarding() ? '/app/learn' : '/app/onboarding';
    router.replace(destination);
  }, [router]);

  return null;
}
