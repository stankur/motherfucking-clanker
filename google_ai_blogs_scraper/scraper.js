import * as cheerio from 'cheerio';
import { renderFetch } from '../render-fetch.js';

const SEED_URL = 'https://developers.googleblog.com/en/search/?technology_categories=AI';

/**
 * Scrapes Google AI blog posts
 * @param {Object} options
 * @param {number} options.maxPages - Maximum number of pages to scrape (default: 1)
 * @returns {Promise<Array<{title: string, url: string, date: string}>>}
 */
export async function scrape({ maxPages = 1 } = {}) {
  const allArticles = [];
  let currentUrl = SEED_URL;
  let pageCount = 0;

  while (currentUrl && pageCount < maxPages) {
    pageCount++;
    console.error(`Scraping page ${pageCount}: ${currentUrl}`);

    // Fetch HTML in-memory
    const html = await renderFetch(currentUrl);
    const $ = cheerio.load(html);

    // Extract articles from current page
    const articles = [];
    $('.search-result').each((i, elem) => {
      const titleElem = $(elem).find('.search-result__title a');
      const dateElem = $(elem).find('.search-result__eyebrow');

      const title = titleElem.text().trim();
      const url = titleElem.attr('href');
      const date = dateElem.text().trim();

      articles.push({ title, url, date });
    });

    allArticles.push(...articles);
    console.error(`  Found ${articles.length} articles on page ${pageCount}`);

    // Get next page URL if we need more pages
    if (pageCount < maxPages) {
      const nextPageLink = $('.nav-buttons__right a[aria-label="Next"]');
      const isDisabled = nextPageLink.hasClass('disabled');

      if (!isDisabled && nextPageLink.attr('href')) {
        currentUrl = nextPageLink.attr('href');

        // Ensure absolute URL
        if (currentUrl && !currentUrl.startsWith('http')) {
          currentUrl = `https://developers.googleblog.com${currentUrl}`;
        }
      } else {
        // No more pages
        currentUrl = null;
      }
    } else {
      currentUrl = null;
    }
  }

  // Validation: ensure all items have required fields
  const invalid = allArticles.filter(item => !item.title || !item.url || !item.date);

  if (invalid.length > 0) {
    if (invalid.length === allArticles.length) {
      throw new Error(`All ${allArticles.length} items are missing required fields. Selectors may be incorrect.`);
    } else {
      throw new Error(`${invalid.length} out of ${allArticles.length} items are missing required fields (title/url/date).`);
    }
  }

  if (allArticles.length === 0) {
    throw new Error('No articles found. The page structure may have changed.');
  }

  return allArticles;
}
