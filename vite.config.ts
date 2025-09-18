import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		https: {},
		port: 34040
	},
	preview: {
		port: 4173,
		host: '0.0.0.0',
		https: false
	}
});
