import { useState, type FormEvent } from 'react';
import type { z } from 'zod';
import { fieldErrors } from './post-schemas';

/** Minimal form state: values, per-field errors cleared as you fix them, and a validated submit. */
export function useForm<S extends z.ZodType>(schema: S, initial: z.input<S>) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const set = <K extends keyof z.input<S>>(key: K, value: z.input<S>[K]) => {
    setValues((v) => ({ ...(v as object), [key]: value }) as z.input<S>);
    setErrors((e) => (e[key as string] ? { ...e, [key as string]: undefined } : e));
  };

  const handleSubmit = (onValid: (data: z.output<S>) => void) => (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = schema.safeParse(values);
    if (parsed.success) {
      onValid(parsed.data);
      return;
    }
    const next = fieldErrors(parsed.error);
    setErrors(next);
    const first = Object.keys(next)[0];
    event.currentTarget
      .querySelector<HTMLElement>(`[name="${first}"], [data-field="${first}"] input, [data-field="${first}"] button`)
      ?.focus();
  };

  return { values, errors, set, handleSubmit };
}
