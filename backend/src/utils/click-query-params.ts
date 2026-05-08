export type ClickQueryParams = Record<string, string | string[]>;

export const getStringQueryParam = (
  params: ClickQueryParams,
  key: string
): string | null => {
  const value = params[key];

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return null;
};

export const parseClickQueryParams = (
  raw: unknown
): ClickQueryParams | null => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const result: ClickQueryParams = {};

  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") {
      result[key] = value;
      continue;
    }

    if (Array.isArray(value)) {
      const normalized = value.filter(
        (item): item is string => typeof item === "string"
      );

      if (normalized.length > 0) {
        result[key] = normalized;
      }
    }
  }

  return result;
};
