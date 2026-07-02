/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LOG_ACCESS_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
