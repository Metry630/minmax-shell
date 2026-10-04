/// <reference types="vite/client" />

// Named here because tsconfig's noPropertyAccessFromIndexSignature rejects
// import.meta.env.VITE_* when it only exists through vite's index signature.
interface ImportMetaEnv {
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_POSTHOG_HOST?: string;
}
