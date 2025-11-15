'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';

import { ApiError, apiFetch } from '../lib/api';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter at least 2 characters').max(120),
  email: z.email('Enter a valid email address').max(254),
  message: z.string().trim().min(1, 'Tell us what you would like to know').max(500, 'Keep it under 500 characters'),
});

type FormValues = z.infer<typeof schema>;

function failureMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 429) return 'Too many enquiries from this address. Please wait a minute and try again.';
  if (err instanceof ApiError) return 'The enquiry was not saved. Please try again later.';
  return 'Network error: the enquiry was not sent. Check your connection and try again.';
}

export function LeadForm() {
  // Campaign links such as ?utm_source=newsletter are recorded with the enquiry.
  const utmSource = useSearchParams().get('utm_source')?.slice(0, 120) || undefined;
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await apiFetch('/leads', { method: 'POST', body: JSON.stringify({ ...values, utmSource }) });
      setSentTo(values.email);
      reset();
    } catch (err) {
      // The draft stays in the form so nothing has to be retyped.
      toast.error(failureMessage(err));
    }
  };

  const describedBy = (field: keyof FormValues) => (errors[field] ? `lead-${field}-error` : undefined);
  const fieldError = (field: keyof FormValues) =>
    errors[field] && <p id={`lead-${field}-error`} className="mt-1.5 text-sm font-medium text-clay-700">{errors[field]?.message}</p>;

  return (
    <div id="lead-form" className="grid scroll-mt-6 gap-10 md:grid-cols-[1fr_1.3fr]">
      <div>
        <h2 className="text-2xl font-semibold sm:text-3xl">Ask about a bottle</h2>
        <p className="mt-3 text-ink-soft">
          Capacity, materials, which one suits a lunchbox or a long hike: send a question and it is stored with your email address
          so it can be answered.
        </p>
        <p className="mt-3 text-sm text-ink-soft">Your details are used only to reply to this enquiry.</p>
      </div>

      {sentTo ? (
        <div role="status" className="self-start rounded-2xl border border-moss-600 bg-white p-6">
          <p className="font-display text-xl font-semibold">Thanks, your question is in.</p>
          <p className="mt-2 text-ink-soft">The reply will go to {sentTo}.</p>
          <Button variant="secondary" className="mt-5" onClick={() => setSentTo(null)}>Ask another question</Button>
        </div>
      ) : (
        <form className="space-y-5 rounded-2xl bg-white p-6 shadow-sm" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <label htmlFor="lead-name" className="mb-1.5 block font-semibold">Name</label>
            <Input id="lead-name" autoComplete="name" maxLength={120} aria-invalid={Boolean(errors.name)}
              aria-describedby={describedBy('name')} placeholder="Jane Doe" {...register('name')} />
            {fieldError('name')}
          </div>
          <div>
            <label htmlFor="lead-email" className="mb-1.5 block font-semibold">Email</label>
            <Input id="lead-email" type="email" autoComplete="email" maxLength={254} aria-invalid={Boolean(errors.email)}
              aria-describedby={describedBy('email')} placeholder="jane@example.com" {...register('email')} />
            {fieldError('email')}
          </div>
          <div>
            <label htmlFor="lead-message" className="mb-1.5 block font-semibold">Question</label>
            <Textarea id="lead-message" rows={4} maxLength={500} aria-invalid={Boolean(errors.message)}
              aria-describedby={describedBy('message')} placeholder="Which bottle keeps drinks cold the longest?" {...register('message')} />
            {fieldError('message')}
          </div>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Sending…' : 'Send question'}</Button>
        </form>
      )}
    </div>
  );
}
