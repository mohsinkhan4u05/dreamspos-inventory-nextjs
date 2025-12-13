/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Ensure pdfkit is loaded as a Node.js dependency on the server
    // so its internal font data files (e.g. Helvetica.afm) resolve correctly.
    serverComponentsExternalPackages: ["pdfkit"],
  },
  webpack(config: { ignoreWarnings: ({ module: RegExp; message?: undefined; } | { message: RegExp; module?: undefined; })[]; }) {
    config.ignoreWarnings = [
      // Ignore warnings from your customStyle.scss
      {
        module: /customStyle\.scss/,
      },
      // Ignore Webpack cache serialization warnings
      {
        message: /No serializer registered for Warning/,
      },
    ];
    return config;
  },
};

export default nextConfig;
