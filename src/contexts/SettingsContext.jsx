import { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export function useSettings() {
  return useContext(SettingsContext);
}

export function SettingsProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'es';
  });

  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('currency') || 'MXN';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('currency', currency);
  }, [currency]);

  const formatCurrency = (amount) => {
    const currencySymbols = {
      MXN: '$',
      USD: '$'
    };
    
    const symbol = currencySymbols[currency] || '$';
    return `${symbol}${amount.toFixed(2)} ${currency}`;
  };

  const value = {
    language,
    setLanguage,
    currency,
    setCurrency,
    formatCurrency
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

