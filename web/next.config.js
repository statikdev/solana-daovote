const path = require('path');

/** @type {import('next').NextConfig} */
module.exports = {
  images: {
    domains: ['www.arweave.net', 'arweave.net', 'dweb.link'],
  },
  reactStrictMode: true,
  sassOptions: {
    includePaths: [path.join(__dirname, 'styles')],
  },
};
