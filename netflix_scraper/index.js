const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const INPUT_HTML_PATH = path.resolve(__dirname, "..", "netflix.html");
const OUTPUT_JSON_PATH = path.resolve(__dirname, "..", "netflix.json");

const RELATIVE_DATE_RE =
	/\b\d+\s*(?:m|mi|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|wk|wks|week|weeks|mo|mon|mos|month|months|y|yr|yrs|year|years)\s+ago\b/i;

const ABSOLUTE_DATE_RE =
	/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{2,4})?\b/i;

function extractDateFromText(text) {
	if (!text) return null;
	const rel = text.match(RELATIVE_DATE_RE);
	if (rel) return rel[0];
	const abs = text.match(ABSOLUTE_DATE_RE);
	if (abs) return abs[0];
	return null;
}

function loadHtml(filePath) {
	const html = fs.readFileSync(filePath, "utf8");
	return cheerio.load(html);
}

function extractPosts($) {
	const posts = [];
	const seenUrls = new Set();

	$('article[data-testid="post-preview"]').each((_, article) => {
		const $article = $(article);

		// Find the anchor that wraps the title h2 and points to netflixtechblog.com
		const $anchor = $article
			.find('a[href^="https://netflixtechblog.com/"]')
			.filter((_, a) => $(a).find("h2").length > 0)
			.first();

		if (!$anchor.length) return;

		const rawHref = $anchor.attr("href") || "";
		const url = rawHref.split("?")[0];
		const title = $anchor.find("h2").text().trim();

		// Use the article card text as the proximity window for the date
		const cardText = $article.text().replace(/\s+/g, " ").trim();
		const date = extractDateFromText(cardText);

		if (!url || !title) return;
		if (seenUrls.has(url)) return; // de-duplicate responsive duplicates
		seenUrls.add(url);

		posts.push({ title, url, date: date || null });
	});

	return posts;
}

function main() {
	const $ = loadHtml(INPUT_HTML_PATH);
	const posts = extractPosts($);
	fs.writeFileSync(
		OUTPUT_JSON_PATH,
		JSON.stringify(posts, null, 2) + "\n",
		"utf8"
	);
	// eslint-disable-next-line no-console
	console.log(`Wrote ${posts.length} posts to ${OUTPUT_JSON_PATH}`);
}

main();
