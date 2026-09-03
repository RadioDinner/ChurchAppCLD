import expoConfig from 'eslint-config-expo/flat.js';
import prettier from 'eslint-config-prettier';
import base from './base.js';

/** Flat config for the Expo app. */
export default [
  ...base,
  ...expoConfig,
  prettier,
  { ignores: ['.expo/**', 'android/**', 'ios/**', 'metro.config.js', 'babel.config.js'] },
];
