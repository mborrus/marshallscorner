const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  // The training pages read plan.json at request time
  outputFileTracingIncludes: {
    '/training': ['./content/training/**'],
    '/training/plan.ics': ['./content/training/**'],
    '/api/strava/*': ['./content/training/**'],
    '/api/training/*': ['./content/training/**'],
  },
};

module.exports = nextConfig;
