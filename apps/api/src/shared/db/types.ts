import { customType } from "drizzle-orm/pg-core";

/** Half-open calendar range `[start, end)`, Postgres `daterange`. */
export type DateRange = { start: string; end: string };

export const daterange = customType<{ data: DateRange; driverData: string }>({
  dataType: () => "daterange",
  toDriver: ({ start, end }) => `[${start},${end})`,
  fromDriver: (value) => {
    const match = /^\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)$/.exec(value);
    if (!match?.[1] || !match[2]) throw new Error(`Unexpected daterange value: ${value}`);
    return { start: match[1], end: match[2] };
  },
});

/** Case-insensitive text (requires the `citext` extension). */
export const citext = customType<{ data: string }>({ dataType: () => "citext" });
