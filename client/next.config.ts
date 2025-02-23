import type { NextConfig } from "next";

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
                  ]
                : [
                      {
                          protocol: "https" as const,
                          hostname: "18.118.4.126.sslip.io",
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
    reactStrictMode: false,
}

export default nextConfig;
