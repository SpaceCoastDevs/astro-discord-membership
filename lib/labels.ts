import type { LabelCategory } from '../types';

/**
 * Produces a stable palette index from the category display order. The index is
 * calculated from the complete ordered category list rather than the numeric
 * sort value itself, so sparse display orders still receive varied colors.
 */
export function getCategoryToneById(categories: LabelCategory[]): Map<string, number> {
  return new Map(
    [...categories]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .map((category, index) => [category.id, index % 7]),
  );
}
