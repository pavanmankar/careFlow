export interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export function formatAddress(address: Address | null | undefined): string {
  if (!address) {
    return '';
  }
  return [address.line1, address.line2, address.city, address.state, address.postalCode, address.country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
}

export function hasAddress(address: Address | null | undefined): boolean {
  return Boolean(formatAddress(address));
}
