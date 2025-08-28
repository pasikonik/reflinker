import { exec } from 'child_process';
import http from 'http';
import './set-env.js';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

// Start the Vite dev server
const vite = exec('node -r dotenv/config node_modules/vite/bin/vite.js dev', {
	env: { ...process.env, RUN_CRON: 'true' }
});

vite.stdout.pipe(process.stdout);
vite.stderr.pipe(process.stderr);

// Function to make a request to trigger the cron job
const triggerCron = () => {
	const req = http.get(`${BASE_URL}/`, (res) => {
		console.log(`Cron trigger request completed with status: ${res.statusCode}`);
	});

	req.on('error', (e) => {
		console.error('Error triggering cron:', e);
	});
};

// Wait for the server to be ready
const checkServer = () => {
	const req = http.get(BASE_URL, () => {
		console.log('Server is ready, triggering cron job...');
		triggerCron();
	});

	req.on('error', () => {
		// Server not ready yet, try again in 500ms
		setTimeout(checkServer, 500);
	});
};

// Start checking for server readiness
setTimeout(checkServer, 1000);

// Handle process termination
process.on('SIGINT', () => {
	console.log('Stopping dev server...');
	vite.kill();
	process.exit();
});
