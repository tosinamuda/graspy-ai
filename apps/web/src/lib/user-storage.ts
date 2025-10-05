/**
 * User Profile LocalStorage Management
 * Handles saving and retrieving user data from browser localStorage
 */

import { setLocaleCookie } from './locale-cookie';

export interface UserProfile {
  id: string;
  country: string;
  language: string;
  gradeLevel: string;
  createdAt: string;
  updatedAt: string;
  onboardingCompleted: boolean;
}

const USER_PROFILE_KEY = 'graspy_user_profile';

/**
 * Generate a simple unique ID
 */
function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Save user profile to localStorage
 */
export function saveUserProfile(profile: Partial<UserProfile>): UserProfile {
  const existing = getUserProfile();

  const updatedProfile: UserProfile = {
    id: existing?.id || generateUserId(),
    country: profile.country || existing?.country || '',
    language: profile.language || existing?.language || '',
    gradeLevel: profile.gradeLevel || existing?.gradeLevel || '',
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    onboardingCompleted: profile.onboardingCompleted ?? existing?.onboardingCompleted ?? false,
  };

  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(updatedProfile));

  // Also save language to cookie for server-side access
  if (updatedProfile.language) {
    setLocaleCookie(updatedProfile.language);
  }

  return updatedProfile;
}

/**
 * Get user profile from localStorage
 */
export function getUserProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(USER_PROFILE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as UserProfile;
  } catch (error) {
    console.error('Error reading user profile:', error);
    return null;
  }
}

/**
 * Check if user has completed onboarding
 */
export function hasCompletedOnboarding(): boolean {
  const profile = getUserProfile();
  return profile?.onboardingCompleted ?? false;
}

/**
 * Clear user profile (for testing or reset)
 */
export function clearUserProfile(): void {
  localStorage.removeItem(USER_PROFILE_KEY);
}

/**
 * Update specific fields in user profile
 */
export function updateUserProfile(updates: Partial<UserProfile>): UserProfile {
  return saveUserProfile(updates);
}
