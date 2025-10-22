export function createSlug(source: string, existing: Set<string>): string {
  const normalized = source
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const base = normalized || 'subject';
  let slug = base;
  let suffix = 2;

  while (existing.has(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  existing.add(slug);
  return slug;
}

export function normalizeSubjectList(
  subjects: Array<{ name: string; slug?: string } | string>,
): { subjects: { name: string; slug: string }[]; nameToSlug: Map<string, string> } {
  const existing = new Set<string>();
  const normalized: { name: string; slug: string }[] = [];
  const nameToSlug = new Map<string, string>();

  for (const entry of subjects) {
    const name = typeof entry === 'string' ? entry : entry.name;
    const trimmed = name.trim();
    if (!trimmed) {
      continue;
    }

    const providedSlug = typeof entry === 'string' ? undefined : entry.slug?.trim();
    const slug = providedSlug && !existing.has(providedSlug)
      ? (existing.add(providedSlug), providedSlug)
      : createSlug(trimmed, existing);

    normalized.push({ name: trimmed, slug });
    nameToSlug.set(trimmed, slug);
  }

  return { subjects: normalized, nameToSlug };
}
