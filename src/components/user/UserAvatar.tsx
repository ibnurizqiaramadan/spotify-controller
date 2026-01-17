"use client";

import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Avatar, Switch } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentConvexUser } from "@/hooks/use-current-convex-user";
import { useGoogleAuth } from "@/providers/google-auth-provider";

export default function UserAvatar() {
  const { user: googleUser, isLoading, isAuthenticated, signOut } = useGoogleAuth();
  const router = useRouter();
  const { user, isAuthenticated: isConvexAuthenticated } = useCurrentConvexUser();
  const queueSettings = useQuery(api.queue.getQueueSettings);
  const updateQueueSettings = useMutation(api.queue.updateQueueSettings);

  const handleToggleAcceptRequests = async (isSelected: boolean) => {
    try {
      await updateQueueSettings({
        isPaused: !isSelected,
        updatedBy: user?.email || "unknown",
      });
    } catch (error) {
      console.error("Failed to update queue settings:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse"></div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleSignOut = () => {
    signOut();
    router.push("/");
  };

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <Avatar
          as="button"
          className="transition-transform"
          src={googleUser?.image || undefined}
          name={googleUser?.name || "User"}
          size="sm"
          showFallback
          fallback={
            <svg
              className="w-6 h-6 text-zinc-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          }
        />
      </DropdownTrigger>
      <DropdownMenu aria-label="Profile Actions" variant="flat">
        <DropdownItem key="profile" className="h-14 gap-2">
          <p className="font-semibold">Signed in as</p>
          <p className="font-normal">{googleUser?.email}</p>
        </DropdownItem>
        <DropdownItem 
          key="acceptRequests" 
          className="py-3" 
          textValue="Accept Requests"
          isDisabled={user?.role !== "admin"}
        >
          <div className="flex items-center justify-between w-full">
            <span>Accept Requests</span>
            {user?.role === "admin" ? (
              <Switch
                size="sm"
                isSelected={!queueSettings?.isPaused}
                onValueChange={handleToggleAcceptRequests}
                color="success"
              />
            ) : (
              <span className="text-zinc-500 text-sm">Admin only</span>
            )}
          </div>
        </DropdownItem>
        <DropdownItem key="settings">Settings</DropdownItem>
        <DropdownItem key="analytics">Analytics</DropdownItem>
        <DropdownItem key="help_and_feedback">Help & Feedback</DropdownItem>
        <DropdownItem key="logout" color="danger" onClick={handleSignOut}>
          Log Out
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
