"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type User = {
    role: string;
    token?: string;
};
const AuthContext = createContext<User>({ role: "admin" });

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }

    return useMemo(
        () => ({
            context: context,
            isAdmin: context.role === "admin",
            isUser: context.role === "user",
            logout: () => {
                if (typeof window !== "undefined") {
                    localStorage.removeItem("user");
                    window.location.reload();
                }
            },
            login: async (
                username: string,
                password: string,
            ): Promise<boolean> => {
                const url = new URL(
                    "/api/login",
                    process.env.NEXT_PUBLIC_API_HOST,
                );
                return fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Basic ${btoa(`${username}:${password}`)}`,
                    },
                })
                    .then((response) => {
                        if (!response.ok) {
                            throw new Error("Network response was not ok");
                        }
                        return response.json();
                    })
                    .then((data) => {
                        if (typeof window !== "undefined") {
                            localStorage.setItem("user", JSON.stringify(data));
                            window.location.reload();
                            return true;
                        }
                        return false;
                    })
                    .catch((error) => {
                        console.log("Error during login:", error);
                        return false;
                    });
            },
            token: (): string | undefined => {
                if (typeof window !== "undefined") {
                    const userJson = localStorage.getItem("user");
                    if (!userJson) {
                        return;
                    }
                    const user = JSON.parse(userJson);
                    return user.token;
                }
            },
        }),
        [context],
    );
}

export default function AuthProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<User>({ role: "user" });
    useEffect(() => {
        if (typeof window !== "undefined") {
            const userJson = localStorage.getItem("user");
            if (!userJson) {
                return;
            }
            const user = JSON.parse(userJson);
            setUser(user);
        }
    }, []);
    return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}
