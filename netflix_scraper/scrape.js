"use strict";

const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const [, , inputArg, outputArg] = process.argv;
const inputPath = inputArg || path.resolve(__dirname, "..", "netflix.html");
const outputPath = outputArg || path.resolve(__dirname, "netflix.json");

function readFileUtf8(filePath) {
	return fs.readFileSync(filePath, "utf8");
}

function writeJson(filePath, data) {
	const json = JSON.stringify(data, null, 2);
	fs.writeFileSync(filePath, json, "utf8");
}

function cleanUrl(rawUrl) {
	if (!rawUrl) return rawUrl;
	try {
		const u = new URL(rawUrl);
		u.search = "";
		return u.toString();
	} catch {
		return rawUrl;
	}
}

// Month names and relative "ago" formats
const dateRegex =
	/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b\.?\s+\d{1,2},?\s+20\d{2}\b|\b\d+\s+(?:minutes?|minute|hours?|hour|days?|day)\s+ago\b/i;

function extractNearestDate($, $anchorBlock) {
	// Search progressively wider scopes near the card
	const scopes = [
		$anchorBlock, // the card itself
		$anchorBlock.parent(), // immediate parent container
		$anchorBlock.parent().parent(), // grandparent (still fairly localized)
	];

	for (const $scope of scopes) {
		// Prefer explicit time elements first
		const timeText = $scope
			.find("time")
			.toArray()
			.map((n) => $(n).text().trim())
			.find((t) => t && dateRegex.test(t));
		if (timeText) return timeText;

		// Then any span/p text that matches our date/recency regex
		const candidate = $scope
			.find("span, p")
			.toArray()
			.map((n) => $(n).text().trim())
			.find((t) => t && dateRegex.test(t));
		if (candidate) return candidate;
	}
	return null;
}

function scrape(html) {
	const $ = cheerio.load(html);
	const results = [];
	const seenUrls = new Set();

	// Medium/TechBlog cards: a focusable "link" container with data-href to canonical URL
	$('div[role="link"][data-href*="netflixtechblog.com/"]').each((_, el) => {
		const $card = $(el);

		// URL: canonical via data-href (preferred), fallback to nested <a> href
		const dataHref = $card.attr("data-href");
		const nestedHref = $card
			.find('a[href*="netflixtechblog.com/"]')
			.attr("href");
		const url = cleanUrl(dataHref || nestedHref);
		if (!url) return;
		if (seenUrls.has(url)) return; // dedupe repeated cards
		seenUrls.add(url);

		// Title: h2 under the anchor is typical; fallback to any h2 inside the card
		let title = $card
			.find('a[href*="netflixtechblog.com/"] h2')
			.text()
			.trim();
		if (!title) {
			title = $card.find("h2").first().text().trim();
		}
		if (!title) return;

		// Date: search nearby scopes for a recognizable date/recency string
		const date = extractNearestDate($, $card);

		results.push({ url, title, date: date || null });
	});

	return results;
}

function main() {
	const html = readFileUtf8(inputPath);
	const items = scrape(html);
	writeJson(outputPath, items);
	console.log(
		`Wrote ${items.length} items to ${path.relative(
			process.cwd(),
			outputPath
		)}`
	);
}

if (require.main === module) {
	main();
}

