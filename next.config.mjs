/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    root: process.cwd()
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self)"
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; img-src 'self' data: blob: https:; font-src 'self' data:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.distinctcharacter.com https://*.clerk.com https://distinctcharacter.substack.com https://substack.com; style-src 'self' 'unsafe-inline' https://clerk.distinctcharacter.com https://*.clerk.com https://distinctcharacter.substack.com https://substack.com; connect-src 'self' https://clerk.distinctcharacter.com https://api.clerk.com https://*.clerk.com https://api.stripe.com; frame-src https://clerk.distinctcharacter.com https://*.clerk.com https://distinctcharacter.substack.com https://substack.com; form-action 'self' https://clerk.distinctcharacter.com https://*.stripe.com https://*.clerk.com https://distinctcharacter.substack.com https://substack.com; upgrade-insecure-requests"
          }
        ]
      }
    ];
  }
};

export default nextConfig;

