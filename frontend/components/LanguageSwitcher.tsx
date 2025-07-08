'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { ChevronDownIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
}

const languages: LanguageOption[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    dir: 'ltr'
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    dir: 'rtl'
  }
];

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'dropdown' | 'toggle' | 'inline';
}

export default function LanguageSwitcher({ 
  className = '', 
  variant = 'dropdown' 
}: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation('common');
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = async (languageCode: string) => {
    const selectedLanguage = languages.find(lang => lang.code === languageCode);
    
    if (selectedLanguage) {
      // Update document direction
      document.documentElement.dir = selectedLanguage.dir;
      document.documentElement.lang = languageCode;
      
      // Store preference
      localStorage.setItem('kitops-language', languageCode);
      
      // Update next-i18next
      await i18n.changeLanguage(languageCode);
      
      // Update Next.js router locale
      const { pathname, asPath, query } = router;
      router.push({ pathname, query }, asPath, { locale: languageCode });
      
      setIsOpen(false);
    }
  };

  // Toggle variant for mobile/compact displays
  if (variant === 'toggle') {
    return (
      <button
        onClick={() => handleLanguageChange(currentLanguage.code === 'en' ? 'ar' : 'en')}
        className={`
          inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 
          bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          ${className}
        `}
        title={t('language.switchLanguage')}
      >
        <GlobeAltIcon className="w-4 h-4 mr-2" />
        <span className="hidden sm:inline">{currentLanguage.nativeName}</span>
        <span className="sm:hidden">{currentLanguage.flag}</span>
      </button>
    );
  }

  // Inline variant for navigation bars
  if (variant === 'inline') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {languages.map((language) => (
          <button
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={`
              px-2 py-1 text-sm font-medium rounded-md transition-colors
              ${currentLanguage.code === language.code
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }
            `}
          >
            <span className="mr-1">{language.flag}</span>
            <span className="hidden sm:inline">{language.nativeName}</span>
          </button>
        ))}
      </div>
    );
  }

  // Default dropdown variant
  return (
    <div className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="
          inline-flex justify-center w-full px-4 py-2 text-sm font-medium 
          text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm 
          hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 
          focus:ring-blue-500
        "
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <GlobeAltIcon className="w-4 h-4 mr-2" />
        <span className="mr-2">{currentLanguage.flag}</span>
        <span className="hidden sm:inline mr-2">{currentLanguage.nativeName}</span>
        <ChevronDownIcon className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown menu */}
          <div className="
            absolute right-0 z-20 w-56 mt-2 origin-top-right bg-white border 
            border-gray-200 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 
            focus:outline-none
          ">
            <div className="py-1" role="menu">
              <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                {t('language.switchLanguage')}
              </div>
              
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`
                    w-full px-4 py-2 text-left text-sm hover:bg-gray-100 
                    transition-colors flex items-center
                    ${currentLanguage.code === language.code
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700'
                    }
                  `}
                  role="menuitem"
                >
                  <span className="mr-3 text-lg">{language.flag}</span>
                  <div className="flex flex-col">
                    <span className="font-medium">{language.nativeName}</span>
                    <span className="text-xs text-gray-500">{language.name}</span>
                  </div>
                  {currentLanguage.code === language.code && (
                    <div className="ml-auto">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Hook for getting current language info
export const useCurrentLanguage = () => {
  const { i18n } = useTranslation();
  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];
  
  return {
    language: currentLanguage,
    isRTL: currentLanguage.dir === 'rtl',
    isArabic: currentLanguage.code === 'ar',
    isEnglish: currentLanguage.code === 'en'
  };
};

// Utility function to initialize language and direction
export const initializeLanguage = () => {
  if (typeof window !== 'undefined') {
    const savedLanguage = localStorage.getItem('kitops-language');
    const browserLanguage = navigator.language.split('-')[0];
    const supportedLanguages = languages.map(lang => lang.code);
    
    let selectedLanguage = 'en'; // default
    
    if (savedLanguage && supportedLanguages.includes(savedLanguage)) {
      selectedLanguage = savedLanguage;
    } else if (supportedLanguages.includes(browserLanguage)) {
      selectedLanguage = browserLanguage;
    }
    
    const language = languages.find(lang => lang.code === selectedLanguage) || languages[0];
    
    // Set document direction and language
    document.documentElement.dir = language.dir;
    document.documentElement.lang = language.code;
    
    return language;
  }
  
  return languages[0];
};