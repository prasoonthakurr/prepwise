"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const LogoutButton = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);

    const response = await fetch("/api/auth/signout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    setIsLoading(false);

    if (response.ok) {
      router.push("/sign-in");
    } else {
      console.error("Logout failed", await response.text());
      router.refresh();
    }
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleLogout}
      disabled={isLoading}
    >
      <span>Logout</span>
    </Button>
  );
};

export default LogoutButton;
