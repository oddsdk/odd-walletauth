export function isStringArray(a: unknown): a is string[] {
  return Array.isArray(a) && a.every(x => typeof x === "string")
}