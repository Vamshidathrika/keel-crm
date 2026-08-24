import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProjects } from "@/app/actions/projects";
import ProjectsClient from "./projects-client";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const initialProjects = await getProjects();
  return <ProjectsClient user={session.user} initialProjects={initialProjects} />;
}
