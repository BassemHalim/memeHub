"use client";
import { createContext, useContext, useEffect, useState } from "react";

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
    return {
        context: context,
        isAdmin: context.role === "admin",
        isUser: context.role === "user",
        logout: () => {
            localStorage.removeItem("user");
            window.location.reload();
        },
        login: async (username: string, password: string): Promise<boolean> => {
            return fetch("http://localhost:8080/api/login", {
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
                    localStorage.setItem("user", JSON.stringify(data));
                    window.location.reload();
                    return true;
                })
                .catch((error) => {
                    console.log("Error during login:", error);
                    return false;
                });
        },
        token: () => {
            const userJson = localStorage.getItem("user");
            if (!userJson) {
                return null;
            }
            const user = JSON.parse(userJson);
            return user.token;
        }
    };
}

export default function AuthProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<User>({ role: "user" });
    useEffect(() => {
        console.log("AuthProvider");
        const userJson = localStorage.getItem("user");
        if (!userJson) {
            return;
        }
        const user = JSON.parse(userJson);
        setUser(user);
    }, []);
    return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}
