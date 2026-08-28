"use client";

import React, { useState } from "react";
import { Customer360Hub } from "@/components/customer-360/customer-360-hub";
import { getCustomer360Data, Customer360Data } from "@/app/actions/customer-360";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Contact360ClientProps {
  initialData: Customer360Data;
}

export default function Contact360Client({ initialData }: Contact360ClientProps) {
  const [data, setData] = useState<Customer360Data>(initialData);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const refreshed = await getCustomer360Data(data.contact.id);
      if (refreshed) {
        setData(refreshed);
        toast.success("360° Profile refreshed!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to refresh 360 profile");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard/contacts">
          <Button variant="ghost" size="xs" className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to Contacts
          </Button>
        </Link>

        <Button
          variant="outline"
          size="xs"
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-1.5 text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh 360 Data
        </Button>
      </div>

      {/* 360 Cockpit */}
      <Customer360Hub data={data} onRefresh={handleRefresh} />
    </div>
  );
}
