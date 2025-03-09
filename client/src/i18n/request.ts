import { getUserLocale } from '@/services/locale';
import {getRequestConfig} from 'next-intl/server';
 
export default getRequestConfig(async () => {
  // Provide a static locale from cookies
  const locale = await getUserLocale()
  return {
    locale,
    messages: (await import(`../../localization/${locale}.json`)).default
  };
});