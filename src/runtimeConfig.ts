/** Загруженный при старте whitelist (null — полный доступ у всех). */
let accessWhitelist: Set<number> | null = null;

export function setAccessWhitelist(ids: Set<number> | null): void {
  accessWhitelist = ids;
}

export function getAccessWhitelist(): Set<number> | null {
  return accessWhitelist;
}
