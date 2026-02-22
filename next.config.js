/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          {
            key: "Content-Security-Policy",
            value: (() => {
              // Next.js dev (HMR) and some tooling use eval; allow it so the app runs under CSP.
              const scriptSrc = "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
              const workerSrc = "worker-src 'self' 'unsafe-inline' 'unsafe-eval'";
              return [
                "default-src 'self'",
                scriptSrc,
                workerSrc,
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                "font-src 'self' https://fonts.gstatic.com",
                "img-src 'self' data: https: blob:",
                "connect-src 'self' https://accounts.google.com https://*.pusher.com wss://*.pusher.com",
                "frame-src https://accounts.google.com",
                "base-uri 'self'",
                "form-action 'self'",
              ].join("; ");
            })(),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
