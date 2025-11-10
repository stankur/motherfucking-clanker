current prompts to be integrated to the agent SDK

## First cycle:

The following is a feed of engineering blogs can you use grep to search for the following:

title of blog
URL of blog
date of the blog

The date data doesn't necessarily have to be in the format of date. Time indicators such as # days ago, # mins ago, etc would work too, just need to somehow signal recency. Remember case insensitive matching, if you are trying to match by day, or month for example, (jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec) not just matching to capitalized or not capitalized versions. And if you can't find this, look again, possible try to search near to the blog titles, because almost everytime the articles have dates. Don't assume that the date is wrapped in special tags like <time>

And then can you analyze how, if we are to build a scraper with cheerio. operating on the file, how would we select these things, such that we can get an array of

the objects with: title, date, and URL

This is a very long HTML, hence why I want you to use grep and be smart, since it is not possible to read the whole HTML file.

The other important bit is to investigate whether there seems to be a 'next page', or some indicator that this HTML is not the only page of the blog, and if there is a next page, do specify how we can go to the next page, so that in the cheerio scraper, we could use iterate and use the function in @render-fetch.js to fetch the content of the next page, and scrape again. If we use this, we would not be scraping from the file I give you though, in the subseqent pages, we would need to define the naming scheme on our own.

If you find an empirical pattern in the URL for getting the different, and you know the max page, you don't need to do aything with the next button, just iterate through the patterns directly, and fetch using render fetch

If you can see something in the next page URL that represents a page like a number at the end being 2 at the first page, you can safely assume that is part of the URL.

Note: when you use render-fetch in the implementation, use the in-memory `renderFetch(url)` only. Do NOT write any HTML files to disk (do not use `renderFetchToFile`). Subsequent pages must also be fetched in-memory.

At this stage, we should only plan for the scraper, so after, the dir structure and files should be exactly the same as before. You should not for instance, write a markdown summary of your changes. You may not create the scraper file yet.

Investigate, and let me know, this is the file: <name>.html

## Second cycle

Create or update a single file `<name>_scraper/scraper.js`. Do NOT initialize npm or create `package.json`. Do NOT create any other files.

Export a programmatic API:

-   `export async function scrape({ maxPages = 1 } = {}): Promise<Array<{title:string,url:string,date:string}>>`
-   Inside the file define `const SEED_URL = 'https://...'` (the blog listing URL).
-   Page 1: always `await renderFetch(SEED_URL)`; if pagination exists and `maxPages > 1`, compute next page URLs and `await renderFetch(nextUrl)` for pages 2..maxPages.
-   Extract items in DOM/top-to-bottom order and return a single array of `{ title, url, date }` (strings exactly as shown; never reformat dates).

I want the dates, if existing to be written exactly as shown, please do not modify the wording. For instance if some articles are written in relative format like 5d ago, and some in absolute like 12 Aug 2024, I want you to write EXACTLY as that in the final JSON. please just write the date. Do not for example append categories.

if there is pagination, handle it immediately in this turn, don't ask for my confirmation, because you will be running autonomously, and I can't make more chat turns. So you need to be complete.

Validation (must run inside the function before returning):

-   Result is an array and every item has non-empty `title`, `url`, and `date`.
-   If some items are missing fields while others are present, fix selectors and re-run, or throw an Error with a concise justification.

Run and verify via the root CLI (only allowed runner):

-   `node rf-scrape.js <name> --max-pages 3 --output <name>_scraper/<name>.json`
-   Then `cat <name>_scraper/<name>.json` and verify every object has title/url/date and matches site text exactly.

Take a look at the date, make sure they are just dates, not meddled with anything else like blog category. 

I/O constraints:

-   Allowed write: only `<name>_scraper/<name>.json` when `--output` is used.
-   No other files may be written (no `package.json`, no README, no analysis files).
-   Allowed commands: `rg`/`grep`, `node rf-scrape.js`, optionally `cat` to inspect JSON.
-   Do not install packages. Use Node + Cheerio + `renderFetch` from `../../render-fetch.js`.
