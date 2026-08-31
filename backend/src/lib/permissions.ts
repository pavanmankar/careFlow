export function hasPermissions(owned: string[], required: string[]): boolean {
  return required.every((code) => owned.includes(code));
}
