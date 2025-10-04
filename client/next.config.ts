import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const isDevelopment = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
    output: "standalone",
    poweredByHeader: false,
    // temporally disable streaming metadata until it is fully studied, google currently can't see the canonical link in body
    htmlLimitedBots: /.*/,
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
                          protocol: "https" as const,
                          hostname: "imgs.qasrelmemez.com",
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
                destination: `${process.env.NEXT_PUBLIC_API_HOST}/api/:path*`,
            },
            {
                source: "/imgs/:path*",
                destination: `${process.env.NEXT_PUBLIC_API_HOST}/:path*`,
            },
        ];
    },
    async redirects() {
        return [
            {
                source: "/en",
                destination: "/",
                permanent: false,
            },
            {
                source: "/en/:path*",
                destination: "/:path*",
                permanent: false,
            },
        ];
    },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
