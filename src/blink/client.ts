import { createClient } from '@blinkdotnew/sdk'

export const blink = createClient({
  projectId: import.meta.env.VITE_BLINK_PROJECT_ID || 'aftermath-platform-ks8kmq50',
  publishableKey: import.meta.env.VITE_BLINK_PUBLISHABLE_KEY || 'blnk_pk_ReVFXEvO_aD7K96NRQRLqsrYoQCmAPgB',
  authRequired: false,
  auth: { mode: 'managed' },
})
