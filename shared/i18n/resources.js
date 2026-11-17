// i18next resources for every language pack. Add a line here when you add a locales/<code>.json file.
import en from './locales/en.json';
import hi from './locales/hi.json';
import pa from './locales/pa.json';
import bn from './locales/bn.json';
import mr from './locales/mr.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import gu from './locales/gu.json';
import kn from './locales/kn.json';
import ml from './locales/ml.json';
import or from './locales/or.json';

export const resources = Object.fromEntries(
  Object.entries({ en, hi, pa, bn, mr, ta, te, gu, kn, ml, or }).map(([code, translation]) => [code, { translation }])
);
