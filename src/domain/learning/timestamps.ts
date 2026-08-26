const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

/** Accepts only canonical UTC instants that round-trip without normalization. */
export const isIsoInstant = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.length !== 24 || !ISO_INSTANT.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.valueOf()) && date.toISOString() === value;
};
