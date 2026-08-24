import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  let session = null;
  try {
    session = await auth();
  } catch (err) {
    console.error("RootPage session check error:", err);
  }
  redirect(session?.user ? "/dashboard" : "/login");
}
