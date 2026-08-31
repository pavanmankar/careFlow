import { ulid } from 'ulid';

/** Crockford Base32 ULID (26 chars). Use for table primary keys. */
export const ULID = {
  random(): string {
    return ulid();
  },
};
