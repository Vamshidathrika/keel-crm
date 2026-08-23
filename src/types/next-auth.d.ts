import type { DefaultSession } from "next-auth";

export type Role = "admin" | "manager" | "rep";

// next-auth's own .d.ts files re-export these from @auth/core, so the
// interfaces must be augmented at their actual declaration site to merge.
declare module "@auth/core/types" {
  interface Session {
    user: {
      id: string;
      role: Role;
      orgId: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    orgId?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId?: string;
    role?: Role;
    orgId?: string;
  }
}
