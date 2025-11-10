import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function scrapeGoogleAIBlogs() {
  const sourceFile = path.join(__dirname, '..', 'google_ai_blogs.html');
  const outputFile = path.join(__dirname, 'google_ai_blogs.json');

  let allBlogs = [];

  console.error('Loading HTML file...');
  const html = await fs.readFile(sourceFile, 'utf8');
  const $ = cheerio.load(html);

  console.error('Extracting blog entries...');

  // Find all search result containers
  const results = $('.search-result');
  console.error(`Found ${results.length} search results`);

  results.each((i, element) => {
    const $element = $(element);

    // Extract date from eyebrow
    const eyebrow = $element.find('.search-result__eyebrow').text().trim();
    let date = null;
    if (eyebrow) {
      // Format: "NOV. 7, 2025 / AI" -> extract date part
      const parts = eyebrow.split(' / ');
      if (parts.length > 0) {
        date = parts[0].trim();
      }
    }

    // Extract title and URL
    const $titleLink = $element.find('.search-result__title a');
    const title = $titleLink.text().trim() || null;
    const url = $titleLink.attr('href') || null;

    allBlogs.push({
      title,
      url,
      date
    });

    // Debug output for first few entries
    if (i < 3) {
      console.error(`Entry ${i + 1}:`, { title: title?.substring(0, 50), url, date });
    }
  });

  // Write to JSON file
  await fs.writeFile(outputFile, JSON.stringify(allBlogs, null, 2));
  console.error(`\n✓ Scraped ${allBlogs.length} blog entries`);
  console.error(`✓ Output saved to: ${outputFile}`);

  // Check for null values
  const nullTitles = allBlogs.filter(b => !b.title).length;
  const nullUrls = allBlogs.filter(b => !b.url).length;
  const nullDates = allBlogs.filter(b => !b.date).length;

  console.error('\n=== Data Quality Check ===');
  console.error(`Total entries: ${allBlogs.length}`);
  console.error(`Entries with null title: ${nullTitles}`);
  console.error(`Entries with null url: ${nullUrls}`);
  console.error(`Entries with null date: ${nullDates}`);

  if (nullTitles > 0 || nullUrls > 0 || nullDates > 0) {
    console.error('\n⚠️ WARNING: Found null values!');
    // Show which entries have nulls
    allBlogs.forEach((blog, idx) => {
      if (!blog.title || !blog.url || !blog.date) {
        console.error(`Entry ${idx}: title=${!!blog.title}, url=${!!blog.url}, date=${!!blog.date}`);
      }
    });
  } else {
    console.error('✓ All entries have complete data');
  }

  return allBlogs;
}

// Run the scraper
scrapeGoogleAIBlogs().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
