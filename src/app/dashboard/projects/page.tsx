import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProjectsClient from "./projects-client";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <ProjectsClient user={session.user} />;
}
