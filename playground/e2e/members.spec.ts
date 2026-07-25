import { expect, test } from '@playwright/test';

test('member cards separate labels and show their category context', async ({ page }) => {
  await page.goto('/members');

  const adaCard = page.locator('a[href="/members/ada"]');
  await expect(page.locator('.membership-directory')).toBeVisible();
  await expect(page.locator('.membership-directory__grid')).toBeVisible();
  await expect(adaCard).toHaveClass(/membership-member-card/);
  await expect(adaCard.locator('.membership-member-card__labels')).toBeVisible();
  await expect(adaCard).toContainText('Ada Lovelace');
  await expect(adaCard.getByText('Technologies')).toBeVisible();
  await expect(adaCard.getByText('Personal Interests')).toBeVisible();
  await expect(adaCard.locator('.membership-category--technologies')).toBeVisible();
  await expect(adaCard.locator('.membership-category--personal-interests')).toBeVisible();
  await expect(adaCard.locator('.membership-label--technologies-typescript')).toHaveText('TypeScript');
  await expect(adaCard.locator('.membership-label--personal-interests-hiking')).toHaveText('Hiking');
});

test('public profile renders labels under their category names', async ({ page }) => {
  await page.goto('/members/ada');

  await expect(page.locator('.membership-member-profile')).toBeVisible();
  await expect(page.locator('.membership-member-profile__identity')).toBeVisible();
  await expect(page.locator('.membership-member-profile__bio')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ada Lovelace' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Technologies' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Personal Interests' })).toBeVisible();
  await expect(page.locator('.membership-category--technologies .membership-label--typescript')).toHaveText('TypeScript');
  await expect(page.locator('.membership-category--personal-interests .membership-label--hiking')).toHaveText('Hiking');
  await expect(page.locator('.membership-member-profile__label-category')).toHaveCount(2);
});

test('member search includes labels not visible on the card and rebinds after page navigation', async ({ page }) => {
  await page.goto('/members');

  // Simulate Astro replacing the directory input during a client-side navigation.
  await page.evaluate(() => {
    const search = document.getElementById('member-search');
    if (!search) return;
    const replacement = search.cloneNode(true) as HTMLInputElement;
    replacement.removeAttribute('data-bound');
    search.replaceWith(replacement);
    document.dispatchEvent(new Event('astro:page-load'));
  });

  await page.getByPlaceholder('Search by name or label…').fill('photography');
  await expect(page.locator('a[href="/members/ada"]')).toBeVisible();
  await expect(page.locator('a[href="/members/grace"]')).toBeHidden();
});
