// Safe fetch utilities with runtime validation and structured error handling.

export interface SafeFetchResult<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export async function safeFetch<T>(url: string, options?: RequestInit): Promise<SafeFetchResult<T>> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const text = await response.text();
      let message = `HTTP ${response.status}`;
      try {
        const json = JSON.parse(text);
        if (json.error) message = json.error;
      } catch {
        if (text && text.length < 200) message = text;
      }
      return { data: null, error: message, status: response.status };
    }
    const data = await response.json() as T;
    return { data, error: null, status: response.status };
  } catch (err) {
    return { data: null, error: String(err), status: 0 };
  }
}

// Runtime validation: checks that an object has the expected keys with the expected types.
// Returns a list of validation errors (empty if valid).
export function validateShape(
  obj: any,
  schema: Record<string, 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any'>
): string[] {
  const errors: string[] = [];
  if (!obj || typeof obj !== 'object') {
    return ['Expected an object'];
  }
  for (const [key, type] of Object.entries(schema)) {
    if (!(key in obj)) {
      errors.push(`Missing required field: ${key}`);
      continue;
    }
    const val = obj[key];
    if (val === null || val === undefined) {
      if (type !== 'any') errors.push(`Field ${key} is null/undefined`);
      continue;
    }
    switch (type) {
      case 'string':
        if (typeof val !== 'string') errors.push(`Field ${key} should be string, got ${typeof val}`);
        break;
      case 'number':
        if (typeof val !== 'number') errors.push(`Field ${key} should be number, got ${typeof val}`);
        break;
      case 'boolean':
        if (typeof val !== 'boolean') errors.push(`Field ${key} should be boolean, got ${typeof val}`);
        break;
      case 'array':
        if (!Array.isArray(val)) errors.push(`Field ${key} should be array, got ${typeof val}`);
        break;
      case 'object':
        if (typeof val !== 'object' || Array.isArray(val)) errors.push(`Field ${key} should be object, got ${typeof val}`);
        break;
      case 'any':
        break;
    }
  }
  return errors;
}

// Coerce a response to a safe default if validation fails.
export function coerceOrDefault<T>(obj: any, schema: Record<string, string>, defaultValue: T): T {
  const errors = validateShape(obj, schema as any);
  if (errors.length > 0) {
    console.warn('[validation] Response shape mismatch:', errors, obj);
    return defaultValue;
  }
  return obj as T;
}

// Ensure an array response is always an array (never crashes on non-array).
export function ensureArray<T = any>(val: any): T[] {
  if (Array.isArray(val)) return val as T[];
  if (val === null || val === undefined) return [];
  return [val] as T[];
}

// Ensure a number or fallback to 0.
export function ensureNumber(val: any, fallback = 0): number {
  if (typeof val === 'number' && !isNaN(val)) return val;
  return fallback;
}

// Ensure a string or fallback to empty.
export function ensureString(val: any, fallback = ''): string {
  if (typeof val === 'string') return val;
  return fallback;
}
