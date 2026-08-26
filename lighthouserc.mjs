export default {
  ci: {
    collect: {
      staticDistDir: './dist/client',
      // All 15 routes. These are static files — each extra URL is nearly free,
      // and accessibility is an error gate, so checking 3 of 15 was a blind spot.
      url: [
        'http://localhost/index.html',
        'http://localhost/pricing/index.html',
        'http://localhost/faq/index.html',
        'http://localhost/about/index.html',
        'http://localhost/what-we-verify/index.html',
        'http://localhost/status-model/index.html',
        'http://localhost/ad-slot-verification/index.html',
        'http://localhost/blog/index.html',
        'http://localhost/blog/ad-slot-qa-checklist/index.html',
        'http://localhost/blog/how-to-verify-prebid-ad-slots/index.html',
        'http://localhost/blog/ad-verification-vs-ad-fraud-detection/index.html',
        'http://localhost/privacy-policy/index.html',
        'http://localhost/terms-and-conditions/index.html',
        'http://localhost/refund-policy/index.html',
        'http://localhost/legal-notice/index.html',
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
