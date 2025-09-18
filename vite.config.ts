import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		https: {},
		port: 34040
	},
	build: {
		rollupOptions: {
			external: (id) => {
				// Skip type checking for bits-ui components during build
				if (id.includes('bits-ui')) return true;
				return false;
			}
		}
	}
});
