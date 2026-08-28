import React from "react";
import { getCustomer360Data } from "@/app/actions/customer-360";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Contact360Client from "./contact-360-client";

export const dynamic = "force-dynamic";

export default async function Contact360Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const resolvedParams = await params;
  const contactId = resolvedParams.id;

  if (!contactId) notFound();

  const data = await getCustomer360Data(contactId);
  if (!data) notFound();

  return <Contact360Client initialData={data} />;
}
