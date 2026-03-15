import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Any webpage to markdown converter',
    description:
      'Convert any webpage to clean markdown using Readability.js and Turndown',
    permissions: ['activeTab'],
    commands: {
      'convert-page': {
        suggested_key: {
          default: 'Alt+M',
        },
        description: 'Convert current page to markdown',
      },
    },
  },
});
