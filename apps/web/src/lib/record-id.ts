const RECORD_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

interface QueryParameters {
  get(name: string): string | null;
}

export function readRecordId(query: QueryParameters, parameterName = 'id'): string | null {
  const value = query.get(parameterName);
  if (value === null || !RECORD_ID_PATTERN.test(value)) return null;
  return value;
}
