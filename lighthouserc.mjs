export default {
  ci: {
    collect: {
      staticDistDir: './dist/client',
      url: [
        'http://localhost/index.html',
        'http://localhost/pricing/index.html',
        'http://localhost/faq/index.html',
      ],
      numberOfRuns: 1,
    },
    assert: {
      preset: 'lighthouse:no-pwa',
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],

        // Core Web Vitals
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'total-blocking-time': ['warn', { maxNumericValue: 200 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],

        // Specific checks
        'uses-responsive-images': 'off',
        'uses-optimized-images': 'off',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
