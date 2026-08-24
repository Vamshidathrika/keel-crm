import { Contact, Deal, Company, Pipeline, Stage, Activity, Task, Tag } from "@/db/schema";

export type { Contact, Deal, Company, Pipeline, Stage, Activity, Task, Tag };

export interface ContactWithRelations extends Contact {
  company?: Company | null;
  deals?: Deal[];
  activities?: Activity[];
  tasks?: Task[];
}

export interface DealWithRelations extends Deal {
  contact?: Contact | null;
  company?: Company | null;
  stage?: Stage | null;
  pipeline?: Pipeline | null;
}
