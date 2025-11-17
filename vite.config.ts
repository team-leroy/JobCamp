import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import fs from 'fs';

// Create self-signed certificates for development
const httpsOptions = (() => {
	try {
		return {
			key: fs.readFileSync('localhost+2-key.pem'),
			cert: fs.readFileSync('localhost+2.pem'),
		};
	} catch {
		// Fall back to Vite's automatic certificate generation
		return true;
	}
})();

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		https: httpsOptions,
		port: 34040
	},
	preview: {
		port: 4173,
		host: '0.0.0.0',
		https: false
	}
});
