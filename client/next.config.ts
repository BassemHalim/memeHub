import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const isDevelopment = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
    output: "standalone",
    poweredByHeader: false,
    images: {
        minimumCacheTTL: 60 * 60 * 24,
        remotePatterns: [
            // Development-only patterns
            ...(isDevelopment
                ? [
                      {
                          protocol: "https" as const,
                          hostname: "**",
                      },
                      {
                          protocol: "http" as const,
                          hostname: "localhost",
                          port: "8080",
                          pathname: "/imgs/**",
                      },
                      {
                          protocol: "http" as const,
                          hostname: "localhost",
                          port: "3000",
                          pathname: "/imgs/**",
                      },
                  ]
                : [
                      {
                          protocol: "https" as const,
                          hostname: "qasrelmemez.com",
                          pathname: "/imgs/**",
                      },
                      {
                          protocol: "http" as const,
                          hostname: "gateway",
                          port: "8080",
                          pathname: "/imgs/**",
                      },
                  ]),
        ],
    },

    async rewrites() {
        return [
            {
            source: "/api/:path*",
            destination: "https://qasrelmemez.com/api/:path*",
            },
            {
            source: "/imgs/:path*",
            destination: "https://qasrelmemez.com/imgs/:path*",
            },
        ];
    },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
