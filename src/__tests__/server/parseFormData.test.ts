import { z } from 'zod';
import { parseFormData } from '@/lib/forms/parseFormData';

describe('parseFormData', () => {
  const Schema = z.object({
    name: z.string().min(2),
    age: z.coerce.number().int().min(0),
    role: z.enum(['admin', 'staff']),
  });

  it('happy path: valid scalar FormData → ok with parsed data', () => {
    const fd = new FormData();
    fd.set('name', 'Alice');
    fd.set('age', '30');
    fd.set('role', 'admin');
    const r = parseFormData(fd, Schema);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toEqual({ name: 'Alice', age: 30, role: 'admin' });
    }
  });

  it('missing required field → fieldErrors keyed by field', () => {
    const fd = new FormData();
    fd.set('name', 'Alice');
    fd.set('age', '30');
    const r = parseFormData(fd, Schema);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.fieldErrors)).toContain('role');
      expect(r.fieldErrors.role?.length).toBeGreaterThan(0);
    }
  });

  it('multiple invalid fields → multiple fieldErrors entries', () => {
    const fd = new FormData();
    fd.set('name', 'A');
    fd.set('age', '-1');
    fd.set('role', 'hacker');
    const r = parseFormData(fd, Schema);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fieldErrors.name).toBeDefined();
      expect(r.fieldErrors.age).toBeDefined();
      expect(r.fieldErrors.role).toBeDefined();
    }
  });

  it('adversarial: File where string expected → fieldError, no throw', () => {
    const fd = new FormData();
    const fakeFile = new File([new Uint8Array([1, 2, 3])], 'evil.bin', { type: 'application/octet-stream' });
    fd.set('name', fakeFile);
    fd.set('age', '30');
    fd.set('role', 'staff');
    const r = parseFormData(fd, Schema);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.name).toBeDefined();
  });

  it('duplicate fields → last-wins (Object.fromEntries semantics)', () => {
    const fd = new FormData();
    fd.append('name', 'First');
    fd.append('name', 'Second');
    fd.set('age', '40');
    fd.set('role', 'admin');
    const r = parseFormData(fd, Schema);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.name).toBe('Second');
  });

  it('coercion applied: numeric string → number via z.coerce.number()', () => {
    const fd = new FormData();
    fd.set('name', 'Bob');
    fd.set('age', '42');
    fd.set('role', 'staff');
    const r = parseFormData(fd, Schema);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.age).toBe(42);
  });

  it('non-coercible numeric → fieldError on age', () => {
    const fd = new FormData();
    fd.set('name', 'Bob');
    fd.set('age', 'not-a-number');
    fd.set('role', 'staff');
    const r = parseFormData(fd, Schema);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.age).toBeDefined();
  });

  it('accumulates multiple errors on the same field', () => {
    const Multi = z.object({
      pwd: z.string().min(8).regex(/[A-Z]/, 'needs uppercase'),
    });
    const fd = new FormData();
    fd.set('pwd', 'short');
    const r = parseFormData(fd, Multi);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fieldErrors.pwd?.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('top-level form error (root path) keyed under "_form"', () => {
    const StrictSchema = z.object({ x: z.string() }).refine(() => false, { message: 'always fails' });
    const fd = new FormData();
    fd.set('x', 'value');
    const r = parseFormData(fd, StrictSchema);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const hasRoot = '_form' in r.fieldErrors || Object.keys(r.fieldErrors).length > 0;
      expect(hasRoot).toBe(true);
    }
  });
});
