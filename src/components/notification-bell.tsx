"use client";

import React, { useState, useEffect } from "react";
import { Bell, Check, Circle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "@/app/actions/notifications";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export default function NotificationBell() {
  const [list, setList] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchList = async () => {
    try {
      const data = await getNotifications();
      if (Array.isArray(data)) {
        setList(data as Notification[]);
      }
    } catch {
      // Ignore background network error
    }
  };

  useEffect(() => {
    fetchList();
    // Poll notifications every 45 seconds for live updates
    const interval = setInterval(fetchList, 45000);
    return () => clearInterval(interval);
  }, []);

  const unread = Array.isArray(list) ? list.filter((n) => !n.isRead) : [];

  const handleRead = async (id: string) => {
    await markNotificationRead(id);
    fetchList();
  };

  const handleReadAll = async () => {
    await markAllNotificationsRead();
    fetchList();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="relative h-9 w-9 rounded-md border border-border bg-transparent hover:bg-muted text-foreground flex items-center justify-center transition-colors cursor-pointer outline-none">
        <Bell className="h-4 w-4 text-foreground" />
        {unread.length > 0 && (
          <span className="absolute top-1 right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-2 space-y-1">
        <div className="flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-foreground">
          <span>Notifications</span>
          {unread.length > 0 && (
            <button
              onClick={handleReadAll}
              className="text-primary hover:underline text-[10px]"
            >
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-64 overflow-y-auto">
          {list.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            list.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onClick={() => handleRead(n.id)}
                className="flex flex-col items-start gap-1 p-2.5 rounded-md cursor-pointer hover:bg-muted text-xs leading-normal"
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <span className={`font-medium text-foreground ${!n.isRead ? "font-bold" : ""}`}>
                    {n.title}
                  </span>
                  {!n.isRead && <Circle className="w-2.5 h-2.5 fill-primary text-primary shrink-0 mt-1" />}
                </div>
                {n.body && <p className="text-[11px] text-muted-foreground">{n.body}</p>}
                <span className="text-[9px] text-muted-foreground/75 font-mono">
                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
