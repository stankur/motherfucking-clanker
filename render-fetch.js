// render-fetch.js
import puppeteer from "puppeteer";

async function fetchRenderedHtml(url) {
	const browser = await puppeteer.launch({
		headless: "new", // or true
		// executablePath: '/path/to/chrome', // optional, if you want your own Chrome
	});

	const page = await browser.newPage();
	await page.setUserAgent(
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"
	);

	await page.goto(url, {
		waitUntil: "networkidle0", // or 'domcontentloaded' if site never truly goes idle
		timeout: 30000,
	});

	// Optional: wait for a specific element to ensure content loaded
	// await page.waitForSelector('#main-content');

	// Fast "End" scroll loop to load dynamically appended content
	let lastHeight = await page.evaluate(
		() => document.documentElement.scrollHeight
	);
	let discoveries = 0;
	const maxIterations = 60;
	const growthWaitMs = 1500;

	for (let i = 0; i < maxIterations; i++) {
		await page.keyboard.press("End");
		try {
			await page.waitForFunction(
				`document.documentElement.scrollHeight > ${lastHeight}`,
				{ timeout: growthWaitMs }
			);
			lastHeight = await page.evaluate(
				() => document.documentElement.scrollHeight
			);
			discoveries++;
			console.error(
				`[end-scroll] growth #${discoveries}: height -> ${lastHeight}px (iter ${
					i + 1
				})`
			);
		} catch {
			const { y, ih, h } = await page.evaluate(() => ({
				y: window.scrollY,
				ih: window.innerHeight,
				h: document.documentElement.scrollHeight,
			}));
			console.error(
				`[end-scroll] no growth after ${i + 1} iters (pos ${
					y + ih
				}/${h})`
			);
			break;
		}
	}

	// brief settle for last-minute lazy loads
	await page.waitForTimeout(600);
	const finalHeight = await page.evaluate(
		() => document.documentElement.scrollHeight
	);
	console.error(
		`[end-scroll] done: final height=${finalHeight}px, discoveries=${discoveries}`
	);

	const html = await page.content();

	await browser.close();
	return html;
}

// Example usage
const url = process.argv[2];
if (!url) {
	console.error("Usage: node render-fetch.js <url>");
	process.exit(1);
}

fetchRenderedHtml(url)
	.then((html) => {
		console.log(html);
	})
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});
