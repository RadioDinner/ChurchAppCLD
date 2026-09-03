import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';
import base from './base.js';

/** Flat config for the Next.js app. */
export default [
  ...base,
  ...nextCoreWebVitals,
  ...nextTypescript,
  prettier,
  { ignores: ['.next/**', 'next-env.d.ts'] },
];
