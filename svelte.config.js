import adapter from '@sveltejs/adapter-static';
import preprocess from 'svelte-preprocess';

const dev = process.argv.includes('dev');
const base_path = process.env.BASE_PATH || '';

const config = {
  preprocess: preprocess(),
  kit: {
    adapter: adapter({
      fallback: '404.html'  // Optional: You can specify a fallback for SPA routing
    }),
    paths: {
      base: dev ? '' : base_path
    }
  }
};

export default config;
