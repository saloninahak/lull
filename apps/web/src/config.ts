/**
 * the things that are personal to whoever runs this, set at build time
 * (readme 13.8). on vercel they're project environment variables.
 */

/** where `email me` on home goes. no address, no link. */
export const contactEmail: string =
  (import.meta.env.VITE_CONTACT_EMAIL as string | undefined)?.trim() ?? '';
