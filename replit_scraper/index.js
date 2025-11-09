import fs from "fs/promises";
import path from "path";
import { load as cheerioLoad } from "cheerio";

const WORKDIR = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const ROOT = path.resolve(WORKDIR, "..");
const INPUT_HTML = path.resolve(ROOT, "replit.html");
const OUTPUT_JSON = path.resolve(WORKDIR, "replit.json");
const HTML_OUT_DIR = path.resolve(WORKDIR, "html");

// Lazy import render-fetch only when needed (pagination)
async function getRenderFetch() {
	try {
		const mod = await import(path.resolve(ROOT, "render-fetch.js"));
		return mod;
	} catch (err) {
		return null;
	}
}

const MONTH_RX = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sept|oct|nov|dec)[a-z]*\b/i;
const AGO_RX = /\b\d+\s+(?:mins?|minutes?|hours?|days?|weeks?|months?|years?)\s+ago\b/i;

function normalizeWhitespace(text) {
	return text.replace(/\s+/g, " ").trim();
}

function extractTitleFromAnchor($, $a) {
	// Preferred: header-ish tags
	const header = normalizeWhitespace($a.find("h1,h2,h3,h4").first().text() || "");
	if (header) return header;

	// Common: elements that might carry title semantics
	const candidate = normalizeWhitespace(
		$a
			.find("hgroup, strong, b, .title, [class*=title], [data-title], [data-testid*=title]")
			.first()
			.text() || ""
	);
	if (candidate) return candidate;

	// Heuristic: remove typically non-title children and get remaining text
	const pruned = $a
		.clone()
		.find("small,img,svg,source,picture,figure,figcaption,div[class*=image],time").remove()
		.end() // back to anchor
		.text();
	const txt = normalizeWhitespace(pruned);
	if (txt && txt.length <= 180) return txt;

	// Fallback: first short text node
	let fallback = "";
	$a.contents().each((_, node) => {
		if (node.type === "text") {
			const t = normalizeWhitespace($(node).text() || "");
			if (t && t.length <= 180) {
				fallback = t;
				return false;
			}
		}
	});
	return fallback;
}

function extractDateFromAnchor($, $a) {
	// Primary: observed class on this page
	const small = normalizeWhitespace(
		$a.find("small.text-foregroundDimmest.text-base").first().text() || ""
	);
	if (small) return small;

	// Secondary markers
	const timeish = normalizeWhitespace(
		($a.find("time").first().text() || "") ||
		($a.find("small, .date, [class*=date]").first().text() || "")
	);
	if (timeish) return timeish;

	// Fallback: scan anchor text
	const text = $a.text();
	const ago = text.match(AGO_RX)?.[0];
	if (ago) return ago;
	if (MONTH_RX.test(text)) {
		const m = text.match(/.{0,30}(?:\d{1,2}\s+)?[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{2,4}.{0,30}/);
		if (m) return normalizeWhitespace(m[0]);
	}
	return "";
}

function parseItemsFromHtml(rawHtml) {
	const $ = cheerioLoad(rawHtml);
	const items = [];
	$(".PostCard a[href]").each((_, el) => {
		const $a = $(el);
		const url = $a.attr("href") || "";
		const title = extractTitleFromAnchor($, $a) || "";
		const date = extractDateFromAnchor($, $a) || "";
		if (url && (title || date)) {
			items.push({ title: title || null, date: date || null, url });
		}
	});
	return items;
}

async function writeIncrementalJson(items, outPath) {
	await fs.mkdir(path.dirname(outPath), { recursive: true });
	let existing = [];
	try {
		existing = JSON.parse(await fs.readFile(outPath, "utf8"));
		if (!Array.isArray(existing)) existing = [];
	} catch {}
	const seen = new Set(existing.map((x) => x.url));
	for (const it of items) {
		if (!seen.has(it.url)) {
			existing.push(it);
			seen.add(it.url);
		}
	}
	await fs.writeFile(outPath, JSON.stringify(existing, null, 2) + "\n", "utf8");
	return existing;
}

function hasNullField(items) {
	return items.some((it) => !(it.title && it.date && it.url));
}

async function tryImproveItems(html) {
	// A second pass with slightly different pruning to recover missing titles/dates
	const $ = cheerioLoad(html);
	const recovered = [];
	$(".PostCard a[href]").each((_, el) => {
		const $a = $(el);
		const url = $a.attr("href") || "";
		let title = normalizeWhitespace(
			$a.find("h1,h2,h3,h4,[class*=title],strong,b").first().text() || ""
		);
		if (!title) {
			// broader prune
			const txt = $a
				.clone()
				.find("small,img,svg,source,picture,figure,figcaption,div:has(img),time").remove()
				.end()
				.text();
			title = normalizeWhitespace(txt).slice(0, 180);
		}
		let date = normalizeWhitespace(
			$a.find("time, small, .date, [class*=date]").first().text() || ""
		);
		if (!date) {
			const text = $a.text();
			const ago = text.match(AGO_RX)?.[0];
			if (ago) date = ago;
		}
		if (url && (title || date)) recovered.push({ title: title || null, date: date || null, url });
	});
	return recovered;
}

async function parseLocalFileFirst() {
	const raw = await fs.readFile(INPUT_HTML, "utf8");
	let items = parseItemsFromHtml(raw);
	if (hasNullField(items)) {
		const improved = await tryImproveItems(raw);
		// Merge by URL preferring improved non-null fields
		const byUrl = new Map();
		for (const it of items) byUrl.set(it.url, { ...it });
		for (const it of improved) {
			const prev = byUrl.get(it.url) || {};
			byUrl.set(it.url, {
				url: it.url || prev.url || null,
				title: it.title || prev.title || null,
				date: it.date || prev.date || null,
			});
		}
		items = Array.from(byUrl.values());
	}
	// Enforce full consistency: drop items missing any field as a last resort
	items = items.filter((it) => it.title && it.date && it.url);
	return items;
}

async function fetchPaginatedPages(maxPages = 3) {
	const rf = await getRenderFetch();
	if (!rf || !rf.renderFetchToFile) return [];
	await fs.mkdir(HTML_OUT_DIR, { recursive: true });
	const bases = [
		"https://blog.replit.com/category/eng",
		"https://blog.replit.com/",
	];
	const patterns = [
		(n, base) => (n === 1 ? base : `${base}?page=${n}`),
		(n, base) => (n === 1 ? base : `${base}page/${n}`),
	];
	const all = [];
	const seen = new Set();
	for (const base of bases) {
		for (const pat of patterns) {
			for (let n = 1; n <= maxPages; n++) {
				const url = pat(n, base);
				const out = path.resolve(HTML_OUT_DIR, `page_${Buffer.from(url).toString("base64").slice(0, 24)}.html`);
				try {
					await rf.renderFetchToFile(url, out);
					const raw = await fs.readFile(out, "utf8");
					let items = parseItemsFromHtml(raw);
					if (hasNullField(items)) {
						const improved = await tryImproveItems(raw);
						// Merge recovered details
						const byUrl = new Map();
						for (const it of items) byUrl.set(it.url, { ...it });
						for (const it of improved) {
							const prev = byUrl.get(it.url) || {};
							byUrl.set(it.url, {
								url: it.url || prev.url || null,
								title: it.title || prev.title || null,
								date: it.date || prev.date || null,
							});
						}
						items = Array.from(byUrl.values()).filter((it) => it.title && it.date && it.url);
					}
					const before = all.length;
					for (const it of items) {
						if (it.url && !seen.has(it.url)) {
							seen.add(it.url);
							all.push(it);
						}
					}
					if (all.length === before || items.length === 0) break; // likely end
				} catch {
					break;
				}
			}
		}
	}
	return all;
}

async function main() {
	const localItems = await parseLocalFileFirst();
	await writeIncrementalJson(localItems, OUTPUT_JSON);
	// Attempt pagination (best-effort)
	const paginated = await fetchPaginatedPages(3);
	if (paginated.length) {
		await writeIncrementalJson(paginated, OUTPUT_JSON);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
