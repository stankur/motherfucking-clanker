import * as cheerio from 'cheerio';
import { renderFetch } from '../render-fetch.js';

const SEED_URL = 'https://www.anthropic.com/engineering';

/**
 * Scrapes Anthropic's engineering blog
 * @param {Object} options - Scraping options
 * @param {number} options.maxPages - Maximum number of pages to scrape (default: 1)
 * @returns {Promise<Array<{title: string, url: string, date: string}>>}
 */
export async function scrape({ maxPages = 1 } = {}) {
  const results = [];

  // Page 1: always fetch the seed URL
  const html = await renderFetch(SEED_URL);
  const $ = cheerio.load(html);

  // Extract date mapping from JSON data embedded in the page
  const dateMap = new Map();
  try {
    // Search for article blocks with both publishedOn and slug
    // Pattern: publishedOn comes first, then slug in the JSON
    // Note: quotes are escaped as \" in the JSON string
    const articlePattern = /\\"publishedOn\\":\\"(\d{4}-\d{2}-\d{2})\\".*?\\"slug\\":\{.*?\\"current\\":\\"([^\\]+)\\"/gs;
    const matches = [...html.matchAll(articlePattern)];

    for (const match of matches) {
      const dateStr = match[1]; // Format: 2025-11-04
      const slug = match[2];

      // Convert date format to match the visible format (e.g., "Nov 04, 2025")
      const [year, month, day] = dateStr.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const formattedDate = `${monthNames[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
      dateMap.set(slug, formattedDate);
    }
  } catch (e) {
    // If JSON parsing fails, continue with DOM extraction only
    console.warn('Could not parse JSON data for dates:', e.message);
  }

  // Extract all articles
  const articles = $('article.ArticleList_article__LIMds');

  articles.each((_, article) => {
    const $article = $(article);

    // Get the link element
    const $link = $article.find('a.ArticleList_cardLink__VWIzl');
    const url = $link.attr('href');

    // Get title - check both h2 (featured) and h3 (regular)
    let title = $article.find('h2.display-sans-l.bold').text().trim();
    if (!title) {
      title = $article.find('h3.display-sans-s.bold').text().trim();
    }

    // Get date from DOM first
    let date = $article.find('div.ArticleList_date__2VTRg').text().trim();

    // If no date in DOM, try to get it from the JSON mapping using the slug
    if (!date && url) {
      const slug = url.split('/').pop();
      date = dateMap.get(slug) || '';
    }

    // Only add if we have at least title and url
    if (title && url) {
      results.push({
        title,
        url,
        date: date || ''
      });
    }
  });

  // Validation
  if (!Array.isArray(results)) {
    throw new Error('Results must be an array');
  }

  // Check if all items have required fields
  const missingFields = results.filter(item => !item.title || !item.url);
  if (missingFields.length > 0 && results.length > 0) {
    throw new Error(`Found ${missingFields.length} items missing required fields (title or url)`);
  }

  if (results.length === 0) {
    throw new Error('No articles found. Selectors may need adjustment.');
  }

  // Check if any items have dates - if some do but not all, that's expected (featured article)
  const itemsWithDates = results.filter(item => item.date);
  const itemsWithoutDates = results.filter(item => !item.date);

  // If some items have dates but most don't, there might be an issue
  if (itemsWithDates.length > 0 && itemsWithoutDates.length > itemsWithDates.length) {
    console.warn(`Warning: ${itemsWithoutDates.length} items missing dates out of ${results.length} total`);
  }

  return results;
}
