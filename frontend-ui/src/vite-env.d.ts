/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_LOG_MODE: string;
  readonly VITE_ZKP_APP_PEPPER: string;
  readonly VITE_USE_JWT_ZK_LOGIN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
