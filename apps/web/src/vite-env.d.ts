/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** where the room server lives, when it isn't on this site's own address */
  readonly VITE_ROOM_URL?: string;
  /** the address behind `email me` on home */
  readonly VITE_CONTACT_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
