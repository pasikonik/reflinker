import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { analyticsSchema, type CountryCode, linksSchema } from '$lib/server/db/schema';
import { logger } from '$lib/utils/logger';
import '@scripts/set-env';
import { eq } from 'drizzle-orm';
import { puppeteerService } from '$lib/server/puppeteer';

const LINKS_TARGET = Number(process.env.LINKS_TARGET || 100);
const LOGIN_URL = 'https://newshop.gw-int.pl/login';
const TIMEOUT = 60_000;

// Track active scraping operations per country
const activeOperations = new Map<CountryCode, Promise<{ success: boolean; message: string }>>();

async function scrapeLinks(country: CountryCode): Promise<{ success: boolean; message: string }> {
	const dbNumberOfTasks = await db
		.select()
		.from(linksSchema)
		.where(eq(linksSchema.country, country));
	const numberOfTasks = dbNumberOfTasks.length;

	await db.insert(analyticsSchema).values({
		timestamp: new Date().toISOString(),
		numberOfAvailableLinks: numberOfTasks.toString(),
		country
	});

	if (numberOfTasks >= LINKS_TARGET) {
		return { success: true, message: 'Too many links' };
	}

	try {
		await puppeteerService.initialize();
		const page = await puppeteerService.getPageForCountry(country);
		page.setDefaultTimeout(TIMEOUT);

		logger.info(`[${country}] Not authenticated. Attempting to login`);
		const loginStart = Date.now();

		try {
			await page.goto(LOGIN_URL, {
				waitUntil: ['load', 'domcontentloaded'],
				timeout: TIMEOUT
			});
		} catch (error) {
			throw new Error(
				`Failed to load login page: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}

		try {
			await page.waitForSelector('#frm-loginForm-login', { visible: true, timeout: 1_000 });
			await page.type('#frm-loginForm-login', process.env.GW_USERNAME || '');

			await page.waitForSelector('#frm-loginForm-password', { visible: true, timeout: 1_000 });
			await page.type('#frm-loginForm-password', process.env.GW_PASSWORD || '');

			await page.waitForSelector('button[type="submit"]', { visible: true, timeout: 1_000 });

			const navigationPromise = page.waitForNavigation({
				waitUntil: ['load', 'domcontentloaded'],
				timeout: TIMEOUT
			});

			await page.click('button[type="submit"]');
			await navigationPromise;
		} catch (error) {
			throw new Error(
				`Login process failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}

		const loginTime = ((Date.now() - loginStart) / 1000).toFixed(2);
		logger.info(`[${country}] Successfully logged in in ${loginTime}s`);

		try {
			// Navigate to the target URL using the persistent session
			await page.goto('https://newshop.gw-int.pl/new-partner/email?type=1&contractType=1', {
				waitUntil: 'networkidle2',
				timeout: TIMEOUT
			});
		} catch (error) {
			throw new Error(
				`Failed to navigate to target page: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}

		// Calculate how many links to extract
		const linksToExtract = Math.max(0, LINKS_TARGET - numberOfTasks);

		const successfullyExtracted = [];

		// Use a proper sequential async operation
		for (let i = 0; i < linksToExtract; i++) {
			try {
				try {
					const countrySelectEl = await page.waitForSelector('select[name="country"]');

					if (countrySelectEl) {
						const currentValue = await countrySelectEl.evaluate((el) => el.value);
						if (currentValue !== country) {
							await countrySelectEl.select(country);
						}
					}
				} catch (error) {
					throw new Error(
						`Failed to set country: ${error instanceof Error ? error.message : 'Unknown error'}`
					);
				}

				// Wait for the button and click it
				const button = await page.waitForSelector('[data-toggle-button="copy"]');
				if (!button) {
					throw new Error('Copy button not found');
				}

				await button.click();
				await new Promise(r => setTimeout(r, 3000)); // Potrzebne przez GW issue

				// Wait for the input field and get the link
				const input = await page.waitForSelector('input[name="mylink"]');
				if (!input) {
					throw new Error('Link input field not found');
				}

				const link = await input.evaluate((el) => (el as HTMLInputElement).value);

				if (link) {
					try {
						await db.insert(linksSchema).values({ link, country }).onConflictDoNothing();
						logger.log(`[${country}] Link ${i + 1}/${linksToExtract} extracted`);
						successfullyExtracted.push(link);
					} catch (dbError) {
						logger.error(`[${country}] Error saving link to database:`, dbError);
						// Continue with next iteration even if DB save fails
					}
				}

				// Add a small delay to avoid rate limiting
				await page.reload();
			} catch (err) {
				logger.error(`[${country}] Error extracting link #${i + 1}:`, err);
				// Continue with next iteration even if one link extraction fails
			}
		}
		logger.log(`[${country}] Successfully extracted ${successfullyExtracted.length} links`);

		return { success: true, message: `Found ${successfullyExtracted.length} links` };
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		logger.error(`[${country}] Error scraping the page:`, error);
		return { success: false, message: `Failed to scrape the page: ${errorMessage}` };
	} finally {
		await puppeteerService.closeContext(country);
	}
}

export async function GET(event: RequestEvent) {
	const password = decodeURIComponent(event.url.searchParams.get('password') || '');
	if (password !== process.env.SECRET_PASSWORD) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const country = (event.url.searchParams.get('country') || 'PL') as CountryCode;

	// Check if there's already an active operation for this country
	const activeOperation = activeOperations.get(country);
	if (activeOperation) {
		return json(
			{ success: false, error: 'Operation already in progress for this country' },
			{ status: 409 }
		);
	}

	// Start new scraping operation
	const scrapingPromise = scrapeLinks(country);
	activeOperations.set(country, scrapingPromise);

	try {
		const result = await scrapingPromise;
		return json(result);
	} catch (error) {
		return json(
			{
				success: false,
				error: 'Failed to scrape the page',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	} finally {
		activeOperations.delete(country);
	}
}
