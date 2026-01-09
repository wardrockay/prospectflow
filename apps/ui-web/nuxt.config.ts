// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: ['@nuxt/ui'],

  devServer: {
    port: 4000,
    host: '0.0.0.0',
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.API_BASE_URL || 'http://localhost:3001',
      cognitoHostedUI: process.env.COGNITO_HOSTED_UI || '',
      cognitoClientId: process.env.COGNITO_CLIENT_ID || '',
      cognitoRedirectUri: process.env.COGNITO_REDIRECT_URI || 'http://localhost:4000/auth/callback',
    },
  },

  typescript: {
    strict: true,
    typeCheck: false, // Disable vite-plugin-checker to avoid vue-tsc dependency
  },

  compatibilityDate: '2024-01-09',
});
