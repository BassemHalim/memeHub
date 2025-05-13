import { useAuth } from "@/auth/authProvider";
import { Button } from "./button";
import { Input } from "./input";
import { useState } from "react";

export default function AdminLogin() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const auth = useAuth();
    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const data = Object.fromEntries(formData.entries());
        const username = data.username as string;
        const password = data.password as string;
        if (!username || !password) {
            console.log("Username and password are required");
            return;
        }
        setIsLoading(true);
        setError("");
        auth.login(username, password).then((res) => {
            if (res) {
                console.log("Login successful");
            } else {
                console.log("Login failed");
                setError("Invalid username or password");
            }
        });
        setIsLoading(false);
    }
    return (
        <div dir="ltr">
            <h1 className="text-3xl font-bold">Admin Login</h1>
            <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-4"
                dir="ltr"
            >
                <Input type="text" name="username" placeholder="Username" />
                <Input type="password" name="password" placeholder="Password" />
                <Button type="submit" disabled={isLoading}>
                    Login
                </Button>
            </form>
            {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
        </div>
    );
}
