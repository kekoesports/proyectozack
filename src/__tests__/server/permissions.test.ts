import {
  canSeeAll,
  canDelete,
  assertCanDelete,
  needsVisibilityFilter,
} from '@/lib/permissions';

describe('canSeeAll', () => {
  it('returns true for admin', () => {
    expect(canSeeAll('admin')).toBe(true);
  });

  it('returns true for manager', () => {
    expect(canSeeAll('manager')).toBe(true);
  });

  it('returns false for staff', () => {
    expect(canSeeAll('staff')).toBe(false);
  });

  it('returns false for brand', () => {
    expect(canSeeAll('brand')).toBe(false);
  });
});

describe('canDelete', () => {
  it('returns true for admin', () => {
    expect(canDelete('admin')).toBe(true);
  });

  it('returns false for manager', () => {
    expect(canDelete('manager')).toBe(false);
  });

  it('returns false for staff', () => {
    expect(canDelete('staff')).toBe(false);
  });

  it('returns false for brand', () => {
    expect(canDelete('brand')).toBe(false);
  });
});

describe('assertCanDelete', () => {
  it('does not throw for admin', () => {
    expect(() => assertCanDelete('admin')).not.toThrow();
  });

  it('throws with message forbidden:delete:manager for manager', () => {
    expect(() => assertCanDelete('manager')).toThrow('forbidden:delete:manager');
  });

  it('throws with message forbidden:delete:staff for staff', () => {
    expect(() => assertCanDelete('staff')).toThrow('forbidden:delete:staff');
  });

  it('throws with message forbidden:delete:brand for brand', () => {
    expect(() => assertCanDelete('brand')).toThrow('forbidden:delete:brand');
  });
});

describe('needsVisibilityFilter', () => {
  it('returns true for staff', () => {
    expect(needsVisibilityFilter('staff')).toBe(true);
  });

  it('returns false for admin', () => {
    expect(needsVisibilityFilter('admin')).toBe(false);
  });

  it('returns false for manager', () => {
    expect(needsVisibilityFilter('manager')).toBe(false);
  });

  it('returns false for brand', () => {
    expect(needsVisibilityFilter('brand')).toBe(false);
  });
});
