const env = import.meta.env;

export const PRODUCTION = env.VITE_APP_PRODUCTION === 'true';
export const API_URL = env.VITE_APP_API_URL;
export const GOOGLE_OAUTH_CLIENT_ID = env.VITE_APP_GOOGLE_OAUTH_CLIENT_ID;