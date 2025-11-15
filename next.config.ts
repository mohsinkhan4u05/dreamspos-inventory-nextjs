/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  eslint: {
    ignoreDuringBuilds: true,
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
