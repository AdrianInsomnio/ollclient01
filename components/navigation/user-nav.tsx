"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings2, User } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { logoutRemote } from "@/lib/api/auth";
import { SidebarTrigger } from "../ui/sidebar";

export function UserNav() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const settingsPathByRole: Record<string, string> = {
    USER: "/workstation/user/settings",
    VET: "/workstation/vet/settings",
    ADMIN: "/workstation/admin/settings",
    SUPER_ADMIN: "/workstation/superadmin/settings",
  };

  return (
    <header className="border-b bg-white px-6 py-3 flex justify-between items-center">
      <SidebarTrigger />      
    </header>
  );
}
