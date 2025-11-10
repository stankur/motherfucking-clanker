import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { renderFetchToFile } from '../render-fetch.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function scrapeGoogleAIBlogs() {
  const baseUrl = 'https://developers.googleblog.com/en/search/?technology_categories=AI';
  const outputFile = path.join(__dirname, 'google_ai_blogs.json');
  const MAX_PAGES = 3;

  let allBlogs = [];
  let currentPage = 1;

  console.error('=== Starting Google AI Blogs Scraper ===\n');

  while (currentPage <= MAX_PAGES) {
    console.error(`\n--- Processing Page ${currentPage} ---`);

    // Construct URL
    const url = currentPage === 1 ? baseUrl : `${baseUrl}&page=${currentPage}`;
    const fileName = path.join(__dirname, `google_ai_blogs_page_${currentPage}.html`);

    try {
      // Fetch the page
      console.error(`Fetching: ${url}`);
      await renderFetchToFile(url, fileName);
      console.error(`✓ Saved to: ${fileName}`);

      // Load and parse HTML
      const html = await fs.readFile(fileName, 'utf8');
      const $ = cheerio.load(html);

      // Extract blog entries
      const results = $('.search-result');
      console.error(`Found ${results.length} search results on page ${currentPage}`);

      if (results.length === 0) {
        console.error('No more results found. Stopping pagination.');
        break;
      }

      let pageBlogs = [];
      results.each((i, element) => {
        const $element = $(element);

        // Extract date from eyebrow
        const eyebrow = $element.find('.search-result__eyebrow').text().trim();
        let date = null;
        if (eyebrow) {
          const parts = eyebrow.split(' / ');
          if (parts.length > 0) {
            date = parts[0].trim();
          }
        }

        // Extract title and URL
        const $titleLink = $element.find('.search-result__title a');
        const title = $titleLink.text().trim() || null;
        const url = $titleLink.attr('href') || null;

        pageBlogs.push({
          title,
          url,
          date
        });
      });

      // Add to master list
      allBlogs.push(...pageBlogs);

      // Show sample from this page
      if (pageBlogs.length > 0) {
        console.error(`Sample from page ${currentPage}:`, {
          title: pageBlogs[0].title?.substring(0, 50) + '...',
          date: pageBlogs[0].date
        });
      }

      // Write incrementally to JSON
      await fs.writeFile(outputFile, JSON.stringify(allBlogs, null, 2));
      console.error(`✓ Updated JSON (${allBlogs.length} total entries)`);

      // Check for next page button
      const $nextButton = $('a[aria-label="Next"]');
      const hasNextPage = $nextButton.length > 0 && !$nextButton.hasClass('disabled');

      if (!hasNextPage) {
        console.error('\nNo next page button found. Reached end of results.');
        break;
      }

      currentPage++;

    } catch (error) {
      console.error(`Error processing page ${currentPage}:`, error.message);
      break;
    }
  }

  console.error('\n=== Scraping Complete ===');
  console.error(`Total pages processed: ${Math.min(currentPage, MAX_PAGES)}`);
  console.error(`Total entries scraped: ${allBlogs.length}`);

  // Data quality check
  const nullTitles = allBlogs.filter(b => !b.title).length;
  const nullUrls = allBlogs.filter(b => !b.url).length;
  const nullDates = allBlogs.filter(b => !b.date).length;

  console.error('\n=== Data Quality Check ===');
  console.error(`Entries with null title: ${nullTitles}`);
  console.error(`Entries with null url: ${nullUrls}`);
  console.error(`Entries with null date: ${nullDates}`);

  if (nullTitles > 0 || nullUrls > 0 || nullDates > 0) {
    console.error('\n⚠️ WARNING: Found null values!');
    allBlogs.forEach((blog, idx) => {
      if (!blog.title || !blog.url || !blog.date) {
        console.error(`Entry ${idx}: title=${!!blog.title}, url=${!!blog.url}, date=${!!blog.date}`);
      }
    });
  } else {
    console.error('✓ All entries have complete data');
  }

  console.error(`\n✓ Final output saved to: ${outputFile}`);

  return allBlogs;
}

// Run the scraper
scrapeGoogleAIBlogs().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
