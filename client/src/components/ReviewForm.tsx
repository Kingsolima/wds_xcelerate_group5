import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { SCORE_KEYS, SCORE_LABELS, type ScoreKey } from '@/data/data';
import { api } from '@/data/api';
import { Button } from './Button';
import { Field, Select, TextArea, TextInput } from './Field';
import { StarInput } from './StarInput';

const TERMS = ['2026–27', '2025–26', '2024–25', '2023–24', '2026 summer', '2025 summer'];

const schema = z.object({
  rating: z.number().int().min(1, 'Pick an overall rating'),
  landlord: z.number().int().min(1, 'Rate the landlord'),
  condition: z.number().int().min(1, 'Rate the condition'),
  value: z.number().int().min(1, 'Rate the value'),
  quiet: z.number().int().min(1, 'Rate how quiet it was'),
  title: z.string().trim().min(4, 'Write a short title, like “Great landlord, thin walls”').max(80, 'Keep the title under 80 characters'),
  body: z.string().trim().min(40, 'Tell people a bit more: at least 40 characters').max(3000, 'Keep it under 3,000 characters'),
  name: z.string().trim().min(2, 'Write your first name'),
  detail: z.string().trim().min(2, 'Write your year and program, like “3rd-year Science”'),
  livedThere: z.string(),
});

type Values = z.input<typeof schema>;
type Errors = Partial<Record<keyof Values, string>>;

const empty: Values = {
  rating: 0,
  landlord: 0,
  condition: 0,
  value: 0,
  quiet: 0,
  title: '',
  body: '',
  name: '',
  detail: '',
  livedThere: TERMS[1]!,
};

export function ReviewForm({ listingId, onDone }: { listingId: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Values>(empty);
  const [errors, setErrors] = useState<Errors>({});

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const mutation = useMutation({
    mutationFn: (v: z.output<typeof schema>) =>
      api.createReview({
        listingId,
        author: { name: v.name, detail: v.detail },
        livedThere: v.livedThere,
        rating: v.rating,
        scores: { landlord: v.landlord, condition: v.condition, value: v.value, quiet: v.quiet },
        title: v.title,
        body: v.body,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['reviews'] }),
        queryClient.invalidateQueries({ queryKey: ['listings'] }),
        queryClient.invalidateQueries({ queryKey: ['landlords'] }),
      ]);
      onDone();
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Values;
        next[key] ??= issue.message;
      }
      setErrors(next);
      // Send focus to the first field that needs fixing.
      const first = Object.keys(next)[0];
      event.currentTarget.querySelector<HTMLElement>(`[data-field="${first}"] input, [data-field="${first}"] textarea, [data-field="${first}"] select`)?.focus();
      return;
    }
    mutation.mutate(parsed.data);
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6 rounded-2xl bg-white p-5 shadow-card md:p-8">
      <div data-field="rating">
        <StarInput name="rating" label="Overall" value={values.rating} onChange={(n) => set('rating', n)} invalid={Boolean(errors.rating)} />
        {errors.rating && <p className="mt-1 font-text text-[0.8125rem] text-danger">{errors.rating}</p>}
      </div>

      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {SCORE_KEYS.map((key: ScoreKey) => (
          <div key={key} data-field={key}>
            <StarInput name={key} label={SCORE_LABELS[key]} size={20} value={values[key]} onChange={(n) => set(key, n)} invalid={Boolean(errors[key])} />
            {errors[key] && <p className="mt-1 font-text text-[0.8125rem] text-danger">{errors[key]}</p>}
          </div>
        ))}
      </div>

      <div data-field="title">
        <Field label="Title" error={errors.title}>
          {(a) => <TextInput {...a} value={values.title} maxLength={80} onChange={(e) => set('title', e.target.value)} />}
        </Field>
      </div>
      <div data-field="body">
        <Field
          label="Your review"
          hint="What was the landlord like? Anything you wish you had known before signing?"
          error={errors.body}
        >
          {(a) => <TextArea {...a} rows={5} value={values.body} onChange={(e) => set('body', e.target.value)} />}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div data-field="name">
          <Field label="First name" error={errors.name}>
            {(a) => <TextInput {...a} autoComplete="given-name" value={values.name} onChange={(e) => set('name', e.target.value)} />}
          </Field>
        </div>
        <div data-field="detail">
          <Field label="Year and program" error={errors.detail}>
            {(a) => <TextInput {...a} value={values.detail} onChange={(e) => set('detail', e.target.value)} />}
          </Field>
        </div>
        <div data-field="livedThere">
          <Field label="When you lived there">
            {(a) => (
              <Select {...a} value={values.livedThere} onChange={(e) => set('livedThere', e.target.value)}>
                {TERMS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </div>

      {mutation.isError && (
        <p role="alert" className="rounded-xl bg-danger-wash px-4 py-3 font-text text-sm text-danger">
          Your review didn’t send. Check your connection and try again.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Posting…' : 'Post review'}
        </Button>
        <Button color="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
