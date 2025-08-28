import cron from 'node-cron';
import { dev } from '$app/environment';
import { cronLogger } from '$lib/utils/logger';
import axios from 'axios';
import { CountryCodes, type CountryCode } from './db/schema';
import '../../../scripts/set-env';

// Always use localhost in development with proper protocol
const getBaseUrl = () => {
    if (dev) return 'http://localhost:3000';
    const prodUrl = process.env.PRODUCTION_URL || 'http://localhost:3000';
    return prodUrl.startsWith('http') ? prodUrl : `http://${prodUrl}`;
};

const RUN_CRON = process.env.RUN_CRON === 'true';

const BASE_URL = getBaseUrl();

// Define allowed countries
const ALLOWED_COUNTRIES: CountryCode[] = ['PL', 'DE', 'AT', 'NL'];

// Filter CountryCodes to only include allowed countries
const FilteredCountryCodes = CountryCodes.filter((country) =>
    ALLOWED_COUNTRIES.includes(country)
);

interface CronJob {
    schedule: string;
    taskFn: () => Promise<void>;
    enabled: boolean;
}

const runCronForCountry = (country: CountryCode, schedule: string): CronJob => {
    return {
        enabled: true,
        schedule,
        taskFn: async () => {
            try {
                const url = new URL('/scrapper', BASE_URL);
                url.searchParams.append('country', country);
                url.searchParams.append('password', encodeURIComponent(process.env.SECRET_PASSWORD || ''));
                const urlString = url.toString();

                const loggerUrl = url;
                if (loggerUrl.searchParams.has('password')) {
                    loggerUrl.searchParams.set('password', '********');
                }

                cronLogger.log(`[${country}] Fetching URL: ${loggerUrl.toString()}`);
                const response = await axios.get(urlString);

                cronLogger.log(`[${country}] Cron response:`, response.data?.message);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                cronLogger.error(`[${country}] Error in cron job: ${errorMessage}`);
                if (error instanceof Error && error.stack) {
                    cronLogger.error(`[${country}] Error stack:`, error.stack);
                }
            }
        }
    };
};

export const cronJobs: CronJob[] = !RUN_CRON
    ? []
    : FilteredCountryCodes.map((country) => {
            const schedule =
                country === 'PL'
                    ? '0 * * * *' // Every hour for PL
                    : '0 0 1 * *'; // First day of every month at midnight for other countries

            return runCronForCountry(country, schedule);
        });

export function initCronJobs(): void {
    if (!RUN_CRON) return cronLogger.warn('CRON will not run');

    if (!process.env.SECRET_PASSWORD) {
        cronLogger.warn('SECRET_PASSWORD not set, cron jobs will not run');
        return;
    }

    for (const job of cronJobs) {
        if (job.enabled) {
            // Run the task immediately
            job.taskFn().catch(console.error);

            // Then schedule it for subsequent runs
            cron.schedule(job.schedule, job.taskFn);
            cronLogger.log(`Scheduled cron job with pattern: ${job.schedule}`);
        }
    }
}
