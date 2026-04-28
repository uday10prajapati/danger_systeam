import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enTranslations from './locales/en.json'
import guTranslations from './locales/gu.json'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      gu: { translation: guTranslations }
    },
    lng: localStorage.getItem('language') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    saveMissing: false,
    initImmediate: false
  })

export default i18n
