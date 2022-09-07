export function hasProp<K extends PropertyKey>(data: unknown, prop: K): data is Record<K, unknown> {
  return typeof data === "object" && data != null && prop in data
}

export function isString(a: unknown): a is string {
  return typeof a === "string"
}

export function isStringArray(a: unknown): a is string[] {
  return Array.isArray(a) && a.every(isString)
}