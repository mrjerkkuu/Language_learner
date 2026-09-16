// categoriesForPart — which categories are actually used, by items with the
// given part, in the canonical order/labels from `allCategories`.
//
// `part === 'all'` returns every category unfiltered (nothing to narrow down
// to). Otherwise only categories that at least one item in `items` uses
// *for that part* are kept — this is computed straight from the data, so it
// never drifts out of sync with a manually maintained part→category table.
export function categoriesForPart(items, part, allCategories) {
  if (part === 'all') return allCategories
  const present = new Set(items.filter((it) => it.part === part).map((it) => it.category))
  return allCategories.filter((c) => present.has(c.id))
}
