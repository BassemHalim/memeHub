"use client";
import AuthProvider from "@/auth/authProvider";
import React from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
}
