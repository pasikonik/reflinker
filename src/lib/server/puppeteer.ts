import type { Browser, BrowserContext, Page } from 'puppeteer';
import type { CountryCode } from '$lib/server/db/schema';
import puppeteer from 'puppeteer';

class PuppeteerService {
	private contexts: Map<CountryCode, BrowserContext> = new Map();
	private browser: Browser | null = null;

	constructor() {}

	async initialize(): Promise<void> {
		if (!this.browser) {
			this.browser = await puppeteer.launch({
				headless: true,
				args: ['--no-sandbox', '--disable-setuid-sandbox']
			});
		}
	}

	async getPageForCountry(countryCode: CountryCode): Promise<Page> {
		if (!this.browser) {
			throw new Error('PuppeteerService not initialized. Call initialize() first.');
		}

		let context = this.contexts.get(countryCode);

		if (!context) {
			context = await this.browser.createBrowserContext();
			this.contexts.set(countryCode, context);
		}

		const page = await context.newPage();
		return page;
	}

	async closeContext(countryCode: CountryCode): Promise<void> {
		const context = this.contexts.get(countryCode);
		if (context) {
			await context.close();
			this.contexts.delete(countryCode);
		}
	}

	async closeAllContexts(): Promise<void> {
		for (const [countryCode, context] of this.contexts.entries()) {
			await this.closeContext(countryCode);
		}
	}

	async close(): Promise<void> {
		await this.closeAllContexts();
		if (this.browser) {
			await this.browser.close();
			this.browser = null;
		}
	}
}

export const puppeteerService = new PuppeteerService();
