type ClassValue = string | false | null | undefined;

/** Joins class names, skipping falsy ones. */
export function cn(...classes: ClassValue[]) {
  return classes.filter(Boolean).join(' ');
}
