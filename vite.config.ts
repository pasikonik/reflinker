import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import './scripts/set-env';

console.log('===============================================');
console.log(process.env.NODE_ENV === 'development' ? 'development' : 'production', 'environent');
console.log('===============================================');

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		port: 3000
	},
	preview: {
		host: true,
		allowedHosts: [process.env.PRODUCTION_URL || 'localhost']
	}
});
