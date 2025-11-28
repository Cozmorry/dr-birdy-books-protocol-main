import { useState, useEffect } from 'react';

const ONBOARDING_KEY = 'dbb_onboarding_completed';
const ONBOARDING_VERSION = '1.0'; // Increment this to show onboarding again to existing users

export function useOnboarding() {
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkOnboarding = () => {
      try {
        const completed = localStorage.getItem(ONBOARDING_KEY);
        const version = localStorage.getItem(`${ONBOARDING_KEY}_version`);
        
        // If no onboarding record exists, or version is outdated, show onboarding
        if (!completed || version !== ONBOARDING_VERSION) {
          setIsFirstTime(true);
        } else {
          setIsFirstTime(false);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setIsFirstTime(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboarding();
  }, []);

  const completeOnboarding = () => {
    try {
      localStorage.setItem(ONBOARDING_KEY, 'true');
      localStorage.setItem(`${ONBOARDING_KEY}_version`, ONBOARDING_VERSION);
      setIsFirstTime(false);
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  return {
    isFirstTime,
    isLoading,
    completeOnboarding,
  };
}

