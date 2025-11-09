import path from "path";
import fs from "fs/promises";
import * as cheerio from "cheerio";
import { renderFetchToFile } from "../render-fetch.js";

const WORKDIR = "/Users/stanleykurniawan/render-fetch/google_scraper";
const PAGE1_LOCAL = "/Users/stanleykurniawan/render-fetch/google.html";
const BASE_URL = "https://research.google";
const BLOG_ROOT = "https://research.google/blog/";
const OUTPUT_JSON = path.join(WORKDIR, "google.json");

function toAbsoluteUrl(href) {
	if (!href) return "";
	try {
		return new URL(href, BASE_URL).href;
	} catch {
		return "";
	}
}

function extractPosts(html) {
	const $ = cheerio.load(html);
	const posts = [];
	// Cards are full-link anchors
	$("a.glue-card[href]").each((_, el) => {
		const $card = $(el);
		const href = $card.attr("href");
		const url = toAbsoluteUrl(href);
		// Title within span.headline-5.js-gt-item-id
		const title = $card
			.find("span.headline-5.js-gt-item-id")
			.first()
			.text()
			.trim();
		// Date within p.glue-label.glue-spacer-1-bottom
		const date = $card
			.find("p.glue-label.glue-spacer-1-bottom")
			.first()
			.text()
			.trim();
		if (title || url || date) {
			posts.push({ title, url, date });
		}
	});
	return posts;
}

async function parseFile(filePath) {
	const html = await fs.readFile(filePath, "utf8");
	return extractPosts(html);
}

async function writeJsonIncremental(allItems) {
	await fs.writeFile(OUTPUT_JSON, JSON.stringify(allItems, null, 2), "utf8");
}

function validateCompleteness(items) {
	const incomplete = items.filter(
		(p) => !p.title || !p.url || !p.date
	);
	return { ok: incomplete.length === 0, incomplete };
}

async function ensureDir() {
	await fs.mkdir(WORKDIR, { recursive: true });
}

async function main() {
	await ensureDir();
	let allItems = [];

	// Page 1 from local file
	const page1Items = await parseFile(PAGE1_LOCAL);
	allItems.push(...page1Items);
	await writeJsonIncremental(allItems);

	// Validate page 1
	let { ok, incomplete } = validateCompleteness(allItems);
	if (!ok) {
		console.error("Found incomplete items after page 1:", incomplete);
		// No alternate selectors needed so far; keep going but fail hard at end if any remain
	}

	// Fetch and parse pages 2 and 3 (limit to 3 total as requested)
	for (let page = 2; page <= 3; page++) {
		const url = `${BLOG_ROOT}?page=${page}`;
		const outPath = path.join(WORKDIR, `google-${page}.html`);
		console.error(`[fetch] ${url} -> ${outPath}`);
		await renderFetchToFile(url, outPath);
		const items = await parseFile(outPath);
		allItems.push(...items);
		await writeJsonIncremental(allItems);
		({ ok, incomplete } = validateCompleteness(items));
		if (!ok) {
			console.error(`Found incomplete items on page ${page}:`, incomplete);
		}
	}

	// Final validation
	const final = validateCompleteness(allItems);
	if (!final.ok) {
		console.error("Final JSON contains incomplete items:", final.incomplete);
		process.exitCode = 2;
	} else {
		console.error(`OK: ${allItems.length} items with complete title/url/date`);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});



