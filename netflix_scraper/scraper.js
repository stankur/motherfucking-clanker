import * as cheerio from 'cheerio';
import { renderFetch } from '../render-fetch.js';

const SEED_URL = 'https://netflixtechblog.com/';

/**
 * Scrape Netflix TechBlog posts
 * @param {Object} options - Scraping options
 * @param {number} options.maxPages - Maximum number of pages to scrape (default: 1)
 * @returns {Promise<Array<{title: string, url: string, date: string}>>} Array of blog posts
 */
export async function scrape({ maxPages = 1 } = {}) {
  const posts = [];

  // Netflix TechBlog appears to be a single-page site with no pagination
  // All posts are loaded on the main page
  for (let page = 1; page <= maxPages; page++) {
    let url;
    if (page === 1) {
      url = SEED_URL;
    } else {
      // No pagination found in the HTML, so we only scrape page 1
      break;
    }

    console.log(`Scraping page ${page}: ${url}`);
    const html = await renderFetch(url);
    const $ = cheerio.load(html);

    // Find all blog post containers by data-href attribute
    $('div[data-href^="https://netflixtechblog.com/"]').each((i, element) => {
      const $post = $(element);

      // Extract URL from data-href attribute
      const postUrl = $post.attr('data-href');

      // Extract title from h2 tag
      const title = $post.find('h2.as.ge').first().text().trim();

      // Extract date from span.y.dz (skip the "min read" span)
      let date = '';
      const dateSpans = $post.find('span.y.dz');
      dateSpans.each((j, span) => {
        const text = $(span).text().trim();
        // The first span.y.dz that doesn't contain "min" or "read" is the date
        if (!text.includes('min') && !text.includes('read') && text) {
          date = text;
          return false; // break out of each loop
        }
      });

      // Only add if we have all required fields
      if (title && postUrl && date) {
        posts.push({
          title,
          url: postUrl,
          date
        });
      }
    });
  }

  // Deduplicate by URL (Netflix blog shows posts in multiple layouts)
  const uniquePosts = [];
  const seenUrls = new Set();
  for (const post of posts) {
    if (!seenUrls.has(post.url)) {
      seenUrls.add(post.url);
      uniquePosts.push(post);
    }
  }

  // Validation: ensure all items have required fields
  const invalidItems = uniquePosts.filter(post => !post.title || !post.url || !post.date);
  if (invalidItems.length > 0 && uniquePosts.length > 0) {
    throw new Error(`Found ${invalidItems.length} items missing required fields (title, url, or date)`);
  }

  if (uniquePosts.length === 0) {
    throw new Error('No blog posts found. Selectors may need adjustment.');
  }

  // Validation: ensure we have non-empty strings
  for (const post of uniquePosts) {
    if (typeof post.title !== 'string' || post.title.length === 0) {
      throw new Error(`Invalid title: ${post.title}`);
    }
    if (typeof post.url !== 'string' || post.url.length === 0) {
      throw new Error(`Invalid url: ${post.url}`);
    }
    if (typeof post.date !== 'string' || post.date.length === 0) {
      throw new Error(`Invalid date: ${post.date}`);
    }
  }

  console.log(`Successfully scraped ${uniquePosts.length} unique posts (${posts.length - uniquePosts.length} duplicates removed)`);
  return uniquePosts;
}
