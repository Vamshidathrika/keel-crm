import React from "react";
import { getTasks } from "@/app/actions/tasks";
import { getContacts } from "@/app/actions/contacts";
import { getCompanies } from "@/app/actions/companies";
import { getDeals } from "@/app/actions/deals";
import TasksClient from "./tasks-client";
import { auth } from "@/lib/auth";

export default async function TasksPage() {
  const session = await auth();
  const tasksData = await getTasks();
  const contactsData = await getContacts();
  const companiesData = await getCompanies();
  const dealsData = await getDeals();

  return (
    <TasksClient
      initialTasks={tasksData}
      contacts={contactsData}
      companies={companiesData}
      deals={dealsData}
      currentUser={session?.user}
    />
  );
}
