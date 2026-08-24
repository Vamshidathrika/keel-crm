import { sql, relations } from "drizzle-orm";
import { sqliteTable, text, integer, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";

const id = (prefix: string) =>
  text("id").primaryKey().$defaultFn(() => `${prefix}_${crypto.randomUUID()}`);

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
};

// ---------- Tenancy ----------

export const organizations = sqliteTable("organizations", {
  id: id("org"),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  businessType: text("business_type"),
  onboardingCompleted: integer("onboarding_completed", { mode: "boolean" }).notNull().default(false),
  brandingConfig: text("branding_config", { mode: "json" }).$type<{
    appName?: string;
    logoUrl?: string;
    primaryColor?: string;
    tagline?: string;
    faviconUrl?: string;
  }>(),
  ...timestamps,
});

export const users = sqliteTable(
  "users",
  {
    id: id("usr"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["admin", "manager", "rep"] }).notNull().default("rep"),
    managerId: text("manager_id"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)]
);

// ---------- Companies & Contacts ----------

export const companies = sqliteTable(
  "companies",
  {
    id: id("cmp"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    domain: text("domain"),
    industry: text("industry"),
    website: text("website"),
    ownerId: text("owner_id").references(() => users.id),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
    customFields: text("custom_fields", { mode: "json" }).$type<Record<string, string>>().notNull().default({}),
    ...timestamps,
  },
  (t) => [index("companies_org_idx").on(t.orgId)]
);

export const contacts = sqliteTable(
  "contacts",
  {
    id: id("cnt"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    companyId: text("company_id").references(() => companies.id, { onDelete: "set null" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name"),
    email: text("email"),
    phone: text("phone"),
    title: text("title"),
    city: text("city"),
    source: text("source", { enum: ["manual", "import", "api_bridge", "ai"] }).notNull().default("manual"),
    ownerId: text("owner_id").references(() => users.id),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
    customFields: text("custom_fields", { mode: "json" }).$type<Record<string, string>>().notNull().default({}),
    score: integer("score").notNull().default(0),
    scoreBreakdown: text("score_breakdown", { mode: "json" }).$type<{
      band: "hot" | "warm" | "cold";
      factors: { label: string; direction: "up" | "down"; explanation: string }[];
      recommendation: string;
    } | null>(),
    leadType: text("lead_type", { enum: ["spear", "net", "seed"] }).notNull().default("spear"),
    ...timestamps,
  },
  (t) => [
    index("contacts_org_idx").on(t.orgId),
    index("contacts_phone_idx").on(t.orgId, t.phone),
    index("contacts_email_idx").on(t.orgId, t.email),
  ]
);

// ---------- Pipelines & Deals ----------

export const pipelines = sqliteTable("pipelines", {
  id: id("pipe"),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  ...timestamps,
});

export const stages = sqliteTable(
  "stages",
  {
    id: id("stg"),
    pipelineId: text("pipeline_id").notNull().references(() => pipelines.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    order: integer("order").notNull().default(0),
    type: text("type", { enum: ["open", "won", "lost"] }).notNull().default("open"),
    probability: integer("probability").notNull().default(10),
    color: text("color").notNull().default("#2F5DFF"),
  },
  (t) => [index("stages_pipeline_idx").on(t.pipelineId)]
);

export const deals = sqliteTable(
  "deals",
  {
    id: id("deal"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    pipelineId: text("pipeline_id").notNull().references(() => pipelines.id, { onDelete: "cascade" }),
    stageId: text("stage_id").notNull().references(() => stages.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    value: real("value").notNull().default(0),
    currency: text("currency").notNull().default("INR"),
    contactId: text("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    companyId: text("company_id").references(() => companies.id, { onDelete: "set null" }),
    ownerId: text("owner_id").references(() => users.id),
    expectedCloseDate: text("expected_close_date"),
    probability: integer("probability").notNull().default(10),
    healthFlags: text("health_flags", { mode: "json" }).$type<string[]>().notNull().default([]),
    source: text("source", { enum: ["manual", "import", "api_bridge", "ai"] }).notNull().default("manual"),
    leadType: text("lead_type", { enum: ["spear", "net", "seed"] }).notNull().default("spear"),
    lostReason: text("lost_reason"),
    lostReasonNotes: text("lost_reason_notes"),
    closedAt: text("closed_at"),
    ...timestamps,
  },
  (t) => [
    index("deals_org_idx").on(t.orgId),
    index("deals_stage_idx").on(t.stageId),
    index("deals_owner_idx").on(t.ownerId),
  ]
);

// ---------- Activities (unified timeline), Notes, Tasks ----------

export const activities = sqliteTable(
  "activities",
  {
    id: id("act"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: ["call", "email", "whatsapp", "note", "meeting", "stage_change", "task", "ai", "system"],
    }).notNull(),
    relatedContactId: text("related_contact_id").references(() => contacts.id, { onDelete: "cascade" }),
    relatedCompanyId: text("related_company_id").references(() => companies.id, { onDelete: "cascade" }),
    relatedDealId: text("related_deal_id").references(() => deals.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => users.id),
    body: text("body").notNull(),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>().notNull().default({}),
    source: text("source", { enum: ["manual", "bridge", "ai", "system"] }).notNull().default("manual"),
    externalId: text("external_id"),
    occurredAt: text("occurred_at").notNull().default(sql`(current_timestamp)`),
    createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  },
  (t) => [
    index("activities_contact_idx").on(t.relatedContactId),
    index("activities_deal_idx").on(t.relatedDealId),
    index("activities_company_idx").on(t.relatedCompanyId),
    uniqueIndex("activities_idempotency_idx").on(t.orgId, t.source, t.externalId),
  ]
);

export const notes = sqliteTable(
  "notes",
  {
    id: id("note"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    relatedContactId: text("related_contact_id").references(() => contacts.id, { onDelete: "cascade" }),
    relatedCompanyId: text("related_company_id").references(() => companies.id, { onDelete: "cascade" }),
    relatedDealId: text("related_deal_id").references(() => deals.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => users.id),
    isPinned: integer("is_pinned", { mode: "boolean" }).notNull().default(false),
    ...timestamps,
  }
);

export const tasks = sqliteTable(
  "tasks",
  {
    id: id("task"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    dueDate: text("due_date"),
    isDone: integer("is_done", { mode: "boolean" }).notNull().default(false),
    completedAt: text("completed_at"),
    relatedContactId: text("related_contact_id").references(() => contacts.id, { onDelete: "cascade" }),
    relatedCompanyId: text("related_company_id").references(() => companies.id, { onDelete: "cascade" }),
    relatedDealId: text("related_deal_id").references(() => deals.id, { onDelete: "cascade" }),
    assigneeId: text("assignee_id").references(() => users.id),
    createdById: text("created_by_id").references(() => users.id),
    ...timestamps,
  },
  (t) => [index("tasks_assignee_idx").on(t.assigneeId)]
);

// ---------- Tags, Custom Fields ----------

export const tags = sqliteTable(
  "tags",
  {
    id: id("tag"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("#64748B"),
  },
  (t) => [uniqueIndex("tags_org_name_idx").on(t.orgId, t.name)]
);

export const customFieldDefinitions = sqliteTable(
  "custom_field_definitions",
  {
    id: id("cfd"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    entityType: text("entity_type", { enum: ["contact", "company", "deal"] }).notNull(),
    key: text("key").notNull(),
    label: text("label").notNull(),
    fieldType: text("field_type", { enum: ["text", "number", "date", "select", "boolean"] }).notNull(),
    options: text("options", { mode: "json" }).$type<string[]>().notNull().default([]),
    isRequired: integer("is_required", { mode: "boolean" }).notNull().default(false),
    order: integer("order").notNull().default(0),
  },
  (t) => [uniqueIndex("cfd_org_entity_key_idx").on(t.orgId, t.entityType, t.key)]
);

// ---------- SaaS Subscriptions & Billing Engine ----------

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: id("sub"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    stripePriceId: text("stripe_price_id"),
    plan: text("plan", { enum: ["starter", "growth", "enterprise"] }).notNull().default("starter"),
    status: text("status", { enum: ["active", "trialing", "past_due", "canceled", "unpaid"] }).notNull().default("active"),
    seatCount: integer("seat_count").notNull().default(5),
    currentPeriodStart: text("current_period_start"),
    currentPeriodEnd: text("current_period_end"),
    cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" }).notNull().default(false),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("subscriptions_org_idx").on(t.orgId),
    index("subscriptions_stripe_sub_idx").on(t.stripeSubscriptionId),
  ]
);

// ---------- Integration bridge: API keys & Webhooks ----------

export const apiKeys = sqliteTable(
  "api_keys",
  {
    id: id("key"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    keyHash: text("key_hash").notNull(),
    scopes: text("scopes", { mode: "json" }).$type<string[]>().notNull().default(["activities:write"]),
    createdById: text("created_by_id").references(() => users.id),
    lastUsedAt: text("last_used_at"),
    revokedAt: text("revoked_at"),
    ...timestamps,
  },
  (t) => [uniqueIndex("api_keys_hash_idx").on(t.keyHash)]
);

export const webhooks = sqliteTable("webhooks", {
  id: id("wh"),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  targetUrl: text("target_url").notNull(),
  eventTypes: text("event_types", { mode: "json" }).$type<string[]>().notNull().default([]),
  secret: text("secret").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

export const webhookDeliveries = sqliteTable(
  "webhook_deliveries",
  {
    id: id("whd"),
    webhookId: text("webhook_id").notNull().references(() => webhooks.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
    responseStatus: integer("response_status"),
    attempt: integer("attempt").notNull().default(1),
    deliveredAt: text("delivered_at"),
    createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  },
  (t) => [index("webhook_deliveries_webhook_idx").on(t.webhookId)]
);

// ---------- AI ----------

export const aiInsightsCache = sqliteTable(
  "ai_insights_cache",
  {
    id: id("ai"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    entityType: text("entity_type", { enum: ["contact", "company", "deal", "org"] }).notNull(),
    entityId: text("entity_id").notNull(),
    kind: text("kind", { enum: ["score", "summary", "digest", "health"] }).notNull(),
    payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
    model: text("model").notNull().default("gemini-2.5-flash"),
    generatedAt: text("generated_at").notNull().default(sql`(current_timestamp)`),
    expiresAt: text("expires_at"),
  },
  (t) => [uniqueIndex("ai_cache_entity_kind_idx").on(t.entityType, t.entityId, t.kind)]
);

// ---------- Automations ----------

export const automations = sqliteTable("automations", {
  id: id("auto"),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  trigger: text("trigger", {
    enum: ["deal_stage_changed", "contact_created", "task_overdue", "activity_created"],
  }).notNull(),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

export const automationConditions = sqliteTable("automation_conditions", {
  id: id("acnd"),
  automationId: text("automation_id").notNull().references(() => automations.id, { onDelete: "cascade" }),
  field: text("field").notNull(),
  operator: text("operator", { enum: ["equals", "not_equals", "contains", "gt", "lt"] }).notNull(),
  value: text("value").notNull(),
});

export const automationActions = sqliteTable("automation_actions", {
  id: id("aact"),
  automationId: text("automation_id").notNull().references(() => automations.id, { onDelete: "cascade" }),
  actionType: text("action_type", {
    enum: ["create_task", "send_notification", "call_webhook", "add_tag"],
  }).notNull(),
  config: text("config", { mode: "json" }).$type<Record<string, unknown>>().notNull().default({}),
});

export const automationRuns = sqliteTable("automation_runs", {
  id: id("arun"),
  automationId: text("automation_id").notNull().references(() => automations.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["success", "failed", "skipped"] }).notNull(),
  detail: text("detail"),
  ranAt: text("ran_at").notNull().default(sql`(current_timestamp)`),
});

// ---------- Notifications, Audit log, Saved filters ----------

export const notifications = sqliteTable(
  "notifications",
  {
    id: id("ntf"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  },
  (t) => [index("notifications_user_idx").on(t.userId)]
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: id("aud"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => users.id),
    actorApiKeyId: text("actor_api_key_id").references(() => apiKeys.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    diff: text("diff", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  },
  (t) => [index("audit_logs_org_idx").on(t.orgId)]
);

export const savedFilters = sqliteTable("saved_filters", {
  id: id("flt"),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id),
  entityType: text("entity_type", { enum: ["contact", "company", "deal"] }).notNull(),
  name: text("name").notNull(),
  filterConfig: text("filter_config", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  isShared: integer("is_shared", { mode: "boolean" }).notNull().default(false),
});

// ---------- Relations ----------

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  subscription: one(subscriptions, {
    fields: [organizations.id],
    references: [subscriptions.orgId],
  }),
  users: many(users),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  org: one(organizations, {
    fields: [subscriptions.orgId],
    references: [organizations.id],
  }),
}));

export const usersRelations = relations(users, ({ one }) => ({
  org: one(organizations, {
    fields: [users.orgId],
    references: [organizations.id],
  }),
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
  org: one(organizations, {
    fields: [companies.orgId],
    references: [organizations.id],
  }),
  owner: one(users, {
    fields: [companies.ownerId],
    references: [users.id],
  }),
  contacts: many(contacts),
  deals: many(deals),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  org: one(organizations, {
    fields: [contacts.orgId],
    references: [organizations.id],
  }),
  company: one(companies, {
    fields: [contacts.companyId],
    references: [companies.id],
  }),
  owner: one(users, {
    fields: [contacts.ownerId],
    references: [users.id],
  }),
}));

export const pipelinesRelations = relations(pipelines, ({ one, many }) => ({
  org: one(organizations, {
    fields: [pipelines.orgId],
    references: [organizations.id],
  }),
  stages: many(stages),
}));

export const stagesRelations = relations(stages, ({ one }) => ({
  pipeline: one(pipelines, {
    fields: [stages.pipelineId],
    references: [pipelines.id],
  }),
}));

export const dealsRelations = relations(deals, ({ one }) => ({
  org: one(organizations, {
    fields: [deals.orgId],
    references: [organizations.id],
  }),
  stage: one(stages, {
    fields: [deals.stageId],
    references: [stages.id],
  }),
  owner: one(users, {
    fields: [deals.ownerId],
    references: [users.id],
  }),
  contact: one(contacts, {
    fields: [deals.contactId],
    references: [contacts.id],
  }),
  company: one(companies, {
    fields: [deals.companyId],
    references: [companies.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  org: one(organizations, {
    fields: [activities.orgId],
    references: [organizations.id],
  }),
  relatedContact: one(contacts, {
    fields: [activities.relatedContactId],
    references: [contacts.id],
  }),
  relatedCompany: one(companies, {
    fields: [activities.relatedCompanyId],
    references: [companies.id],
  }),
  relatedDeal: one(deals, {
    fields: [activities.relatedDealId],
    references: [deals.id],
  }),
  actorUserId: one(users, {
    fields: [activities.actorUserId],
    references: [users.id],
  }),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  org: one(organizations, {
    fields: [notes.orgId],
    references: [organizations.id],
  }),
  relatedContact: one(contacts, {
    fields: [notes.relatedContactId],
    references: [contacts.id],
  }),
  relatedCompany: one(companies, {
    fields: [notes.relatedCompanyId],
    references: [companies.id],
  }),
  relatedDeal: one(deals, {
    fields: [notes.relatedDealId],
    references: [deals.id],
  }),
  author: one(users, {
    fields: [notes.authorId],
    references: [users.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  org: one(organizations, {
    fields: [tasks.orgId],
    references: [organizations.id],
  }),
  relatedContact: one(contacts, {
    fields: [tasks.relatedContactId],
    references: [contacts.id],
  }),
  relatedCompany: one(companies, {
    fields: [tasks.relatedCompanyId],
    references: [companies.id],
  }),
  relatedDeal: one(deals, {
    fields: [tasks.relatedDealId],
    references: [deals.id],
  }),
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [tasks.createdById],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  org: one(organizations, {
    fields: [auditLogs.orgId],
    references: [organizations.id],
  }),
  actorUserId: one(users, {
    fields: [auditLogs.actorUserId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  org: one(organizations, {
    fields: [notifications.orgId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const automationsRelations = relations(automations, ({ one, many }) => ({
  org: one(organizations, {
    fields: [automations.orgId],
    references: [organizations.id],
  }),
  automationConditions: many(automationConditions),
  automationActions: many(automationActions),
  runs: many(automationRuns),
}));

export const automationConditionsRelations = relations(automationConditions, ({ one }) => ({
  automation: one(automations, {
    fields: [automationConditions.automationId],
    references: [automations.id],
  }),
}));

export const automationActionsRelations = relations(automationActions, ({ one }) => ({
  automation: one(automations, {
    fields: [automationActions.automationId],
    references: [automations.id],
  }),
}));

export const automationRunsRelations = relations(automationRuns, ({ one }) => ({
  automation: one(automations, {
    fields: [automationRuns.automationId],
    references: [automations.id],
  }),
}));

// ---------- Org Widgets ----------
export const orgWidgets = sqliteTable(
  "org_widgets",
  {
    id: id("wgt"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    widgetKey: text("widget_key").notNull(),
    isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
    position: integer("position").notNull().default(0),
    config: text("config", { mode: "json" }).$type<Record<string, any>>().notNull().default({}),
    ...timestamps,
  },
  (t) => [index("org_widgets_org_idx").on(t.orgId)]
);

export const orgWidgetsRelations = relations(orgWidgets, ({ one }) => ({
  org: one(organizations, { fields: [orgWidgets.orgId], references: [organizations.id] }),
}));

// ---------- Client Portal & Business OS Entities ----------

export const clients = sqliteTable(
  "clients",
  {
    id: id("cli"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    companyId: text("company_id").references(() => companies.id, { onDelete: "set null" }),
    contactId: text("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    portalToken: text("portal_token").notNull().unique(),
    ...timestamps,
  },
  (t) => [index("clients_org_idx").on(t.orgId)]
);

export const quotations = sqliteTable(
  "quotations",
  {
    id: id("qte"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    dealId: text("deal_id").references(() => deals.id, { onDelete: "set null" }),
    clientId: text("client_id").references(() => clients.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    items: text("items", { mode: "json" }).$type<{ name: string; qty: number; price: number }[]>().notNull().default([]),
    total: real("total").notNull().default(0),
    status: text("status", { enum: ["draft", "sent", "accepted", "rejected"] }).notNull().default("draft"),
    pdfUrl: text("pdf_url"),
    ...timestamps,
  },
  (t) => [index("quotations_org_idx").on(t.orgId)]
);

export const invoices = sqliteTable(
  "invoices",
  {
    id: id("inv"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    dealId: text("deal_id").references(() => deals.id, { onDelete: "set null" }),
    clientId: text("client_id").references(() => clients.id, { onDelete: "cascade" }),
    invoiceNumber: text("invoice_number").notNull(),
    amount: real("amount").notNull().default(0),
    status: text("status", { enum: ["draft", "unpaid", "paid", "overdue"] }).notNull().default("draft"),
    dueDate: text("due_date").notNull(),
    pdfUrl: text("pdf_url"),
    ...timestamps,
  },
  (t) => [index("invoices_org_idx").on(t.orgId)]
);

export const payments = sqliteTable(
  "payments",
  {
    id: id("pay"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    invoiceId: text("invoice_id").references(() => invoices.id, { onDelete: "cascade" }),
    amount: real("amount").notNull().default(0),
    status: text("status", { enum: ["pending", "completed", "failed"] }).notNull().default("pending"),
    transactionId: text("transaction_id"),
    paidAt: text("paid_at"),
    ...timestamps,
  },
  (t) => [index("payments_org_idx").on(t.orgId)]
);

export const messageRecords = sqliteTable(
  "message_records",
  {
    id: id("msg"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    clientId: text("client_id").references(() => clients.id, { onDelete: "cascade" }),
    contactId: text("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    type: text("type", { enum: ["whatsapp", "email"] }).notNull().default("whatsapp"),
    direction: text("direction", { enum: ["inbound", "outbound"] }).notNull().default("outbound"),
    text: text("text").notNull(),
    status: text("status", { enum: ["sent", "delivered", "read"] }).notNull().default("sent"),
    createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  },
  (t) => [index("message_records_org_idx").on(t.orgId)]
);

export const followups = sqliteTable(
  "followups",
  {
    id: id("flw"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    dealId: text("deal_id").references(() => deals.id, { onDelete: "set null" }),
    contactId: text("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    dueDate: text("due_date").notNull(),
    status: text("status", { enum: ["pending", "completed", "overdue"] }).notNull().default("pending"),
    ...timestamps,
  },
  (t) => [index("followups_org_idx").on(t.orgId)]
);

export const projects = sqliteTable(
  "projects",
  {
    id: id("prj"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    clientId: text("client_id").references(() => clients.id, { onDelete: "cascade" }),
    dealId: text("deal_id").references(() => deals.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    status: text("status", { enum: ["planning", "active", "completed", "on_hold"] }).notNull().default("planning"),
    budget: real("budget").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("projects_org_idx").on(t.orgId)]
);

export const projectTasks = sqliteTable(
  "project_tasks",
  {
    id: id("prt"),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    assigneeId: text("assignee_id").references(() => users.id, { onDelete: "set null" }),
    status: text("status", { enum: ["todo", "in_progress", "done"] }).notNull().default("todo"),
    dueDate: text("due_date"),
    ...timestamps,
  }
);

export const deliverables = sqliteTable(
  "deliverables",
  {
    id: id("dlv"),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    fileUrl: text("file_url"),
    status: text("status", { enum: ["pending_review", "approved", "changes_requested"] }).notNull().default("pending_review"),
    clientFeedback: text("client_feedback"),
    ...timestamps,
  }
);

// ---------- Relations definitions for Business OS ----------

export const clientsRelations = relations(clients, ({ one, many }) => ({
  org: one(organizations, { fields: [clients.orgId], references: [organizations.id] }),
  company: one(companies, { fields: [clients.companyId], references: [companies.id] }),
  contact: one(contacts, { fields: [clients.contactId], references: [contacts.id] }),
  projects: many(projects),
  quotations: many(quotations),
  invoices: many(invoices),
  messageRecords: many(messageRecords),
}));

export const quotationsRelations = relations(quotations, ({ one }) => ({
  org: one(organizations, { fields: [quotations.orgId], references: [organizations.id] }),
  deal: one(deals, { fields: [quotations.dealId], references: [deals.id] }),
  client: one(clients, { fields: [quotations.clientId], references: [clients.id] }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  org: one(organizations, { fields: [invoices.orgId], references: [organizations.id] }),
  deal: one(deals, { fields: [invoices.dealId], references: [deals.id] }),
  client: one(clients, { fields: [invoices.clientId], references: [clients.id] }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  org: one(organizations, { fields: [payments.orgId], references: [organizations.id] }),
  invoice: one(invoices, { fields: [payments.invoiceId], references: [invoices.id] }),
}));

export const messageRecordsRelations = relations(messageRecords, ({ one }) => ({
  org: one(organizations, { fields: [messageRecords.orgId], references: [organizations.id] }),
  client: one(clients, { fields: [messageRecords.clientId], references: [clients.id] }),
  contact: one(contacts, { fields: [messageRecords.contactId], references: [contacts.id] }),
}));

export const followupsRelations = relations(followups, ({ one }) => ({
  org: one(organizations, { fields: [followups.orgId], references: [organizations.id] }),
  deal: one(deals, { fields: [followups.dealId], references: [deals.id] }),
  contact: one(contacts, { fields: [followups.contactId], references: [contacts.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  org: one(organizations, { fields: [projects.orgId], references: [organizations.id] }),
  client: one(clients, { fields: [projects.clientId], references: [clients.id] }),
  deal: one(deals, { fields: [projects.dealId], references: [deals.id] }),
  projectTasks: many(projectTasks),
  deliverables: many(deliverables),
}));

export const projectTasksRelations = relations(projectTasks, ({ one }) => ({
  project: one(projects, { fields: [projectTasks.projectId], references: [projects.id] }),
  assignee: one(users, { fields: [projectTasks.assigneeId], references: [users.id] }),
}));

export const deliverablesRelations = relations(deliverables, ({ one }) => ({
  project: one(projects, { fields: [deliverables.projectId], references: [projects.id] }),
}));

// ---------- Autonomous Agentic CRM Tables ----------

export const agentConfigs = sqliteTable(
  "agent_configs",
  {
    id: id("agcfg"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    agentType: text("agent_type", {
      enum: ["prospector", "deal_doctor", "guardian", "briefing"],
    }).notNull(),
    isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
    executionMode: text("execution_mode", { enum: ["full_auto", "supervised"] }).notNull().default("supervised"),
    model: text("model").notNull().default("gemini-2.5-flash"),
    sweepIntervalHours: integer("sweep_interval_hours").notNull().default(24),
    lastSweepAt: text("last_sweep_at"),
    ...timestamps,
  },
  (t) => [uniqueIndex("agent_configs_org_agent_idx").on(t.orgId, t.agentType)]
);

export const agentRuns = sqliteTable(
  "agent_runs",
  {
    id: id("agrun"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    agentType: text("agent_type").notNull(),
    targetEntityType: text("target_entity_type", { enum: ["contact", "company", "deal", "org"] }).notNull(),
    targetEntityId: text("target_entity_id").notNull(),
    status: text("status", { enum: ["running", "completed", "failed", "requires_approval"] }).notNull(),
    confidenceScore: real("confidence_score").notNull().default(0.85),
    thoughtProcess: text("thought_process", { mode: "json" }).$type<string[]>().notNull().default([]),
    summary: text("summary").notNull(),
    toolsInvoked: text("tools_invoked", { mode: "json" }).$type<Array<{ tool: string; params: any; result: any }>>().notNull().default([]),
    executionDurationMs: integer("execution_duration_ms"),
    createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  },
  (t) => [
    index("agent_runs_org_idx").on(t.orgId),
    index("agent_runs_target_idx").on(t.targetEntityType, t.targetEntityId),
  ]
);

export const agentActionQueue = sqliteTable(
  "agent_action_queue",
  {
    id: id("agact"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    runId: text("run_id").references(() => agentRuns.id, { onDelete: "set null" }),
    agentType: text("agent_type").notNull(),
    severity: text("severity", { enum: ["info", "warning", "critical"] }).notNull().default("info"),
    title: text("title").notNull(),
    description: text("description").notNull(),
    actionType: text("action_type", {
      enum: ["create_task", "update_deal_health", "adjust_probability", "draft_proposal", "tag_entity", "reassign_owner", "move_stage", "trigger_webhook", "custom"],
    }).notNull(),
    actionPayload: text("action_payload", { mode: "json" }).$type<Record<string, any>>().notNull().default({}),
    status: text("status", { enum: ["pending", "approved", "rejected", "executed"] }).notNull().default("pending"),
    reviewedById: text("reviewed_by_id").references(() => users.id),
    reviewedAt: text("reviewed_at"),
    rejectionReason: text("rejection_reason"),
    createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  },
  (t) => [
    index("agent_action_queue_org_idx").on(t.orgId),
    index("agent_action_queue_status_idx").on(t.orgId, t.status),
  ]
);

export const agentMemories = sqliteTable(
  "agent_memories",
  {
    id: id("agmem"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    entityType: text("entity_type", { enum: ["contact", "company", "deal", "org"] }).notNull(),
    entityId: text("entity_id").notNull(),
    key: text("key").notNull(),
    value: text("value", { mode: "json" }).$type<any>().notNull(),
    confidence: real("confidence").notNull().default(1.0),
    sourceAgent: text("source_agent").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("agent_memories_entity_key_idx").on(t.orgId, t.entityType, t.entityId, t.key),
  ]
);

// ---------- Vertical Specific Persistent Tables ----------

export const shipments = sqliteTable(
  "shipments",
  {
    id: id("shp"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    dealId: text("deal_id").references(() => deals.id, { onDelete: "set null" }),
    dealName: text("deal_name").notNull(),
    carrier: text("carrier").notNull(),
    origin: text("origin").notNull(),
    destination: text("destination").notNull(),
    eta: text("eta").notNull(),
    status: text("status").notNull().default("Booking Confirmed"),
    mode: text("mode").notNull().default("Ocean Freight"),
    cost: text("cost").notNull().default("0"),
    ...timestamps,
  },
  (t) => [index("shipments_org_idx").on(t.orgId)]
);

export const kycRecords = sqliteTable(
  "kyc_records",
  {
    id: id("kyc"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    contactId: text("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    customer: text("customer").notNull(),
    docType: text("doc_type").notNull(),
    complianceStatus: text("compliance_status").notNull().default("Pending Review"),
    regulatoryLogs: text("regulatory_logs"),
    ...timestamps,
  },
  (t) => [index("kyc_records_org_idx").on(t.orgId)]
);

export const appointments = sqliteTable(
  "appointments",
  {
    id: id("apt"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    contactId: text("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    clientName: text("client_name").notNull(),
    serviceType: text("service_type").notNull(),
    dateTime: text("date_time").notNull(),
    status: text("status").notNull().default("Scheduled"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("appointments_org_idx").on(t.orgId)]
);

export const orders = sqliteTable(
  "orders",
  {
    id: id("ord"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    clientId: text("client_id").references(() => clients.id, { onDelete: "set null" }),
    orderNumber: text("order_number").notNull(),
    clientName: text("client_name").notNull(),
    itemsSummary: text("items_summary").notNull(),
    totalAmount: text("total_amount").notNull(),
    fulfillmentStatus: text("fulfillment_status").notNull().default("Processing"),
    deliveryEta: text("delivery_eta"),
    ...timestamps,
  },
  (t) => [index("orders_org_idx").on(t.orgId)]
);

export const properties = sqliteTable(
  "properties",
  {
    id: id("prp"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    location: text("location").notNull(),
    price: text("price").notNull(),
    type: text("type").notNull().default("Commercial"),
    status: text("status").notNull().default("Available"),
    buyerOrTenant: text("buyer_or_tenant"),
    ...timestamps,
  },
  (t) => [index("properties_org_idx").on(t.orgId)]
);

export const products = sqliteTable(
  "products",
  {
    id: id("prod"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sku: text("sku"),
    description: text("description"),
    unitPrice: real("unit_price").notNull().default(0),
    currency: text("currency").notNull().default("INR"),
    taxRatePercent: real("tax_rate_percent").notNull().default(18),
    category: text("category").notNull().default("Services"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("products_org_idx").on(t.orgId),
    index("products_sku_idx").on(t.orgId, t.sku),
  ]
);

// ---------- Relations for Agent & Vertical Tables ----------

export const agentConfigsRelations = relations(agentConfigs, ({ one }) => ({
  org: one(organizations, { fields: [agentConfigs.orgId], references: [organizations.id] }),
}));

export const agentRunsRelations = relations(agentRuns, ({ one, many }) => ({
  org: one(organizations, { fields: [agentRuns.orgId], references: [organizations.id] }),
  actions: many(agentActionQueue),
}));

export const agentActionQueueRelations = relations(agentActionQueue, ({ one }) => ({
  org: one(organizations, { fields: [agentActionQueue.orgId], references: [organizations.id] }),
  run: one(agentRuns, { fields: [agentActionQueue.runId], references: [agentRuns.id] }),
  reviewedBy: one(users, { fields: [agentActionQueue.reviewedById], references: [users.id] }),
}));

export const agentMemoriesRelations = relations(agentMemories, ({ one }) => ({
  org: one(organizations, { fields: [agentMemories.orgId], references: [organizations.id] }),
}));

export const shipmentsRelations = relations(shipments, ({ one }) => ({
  org: one(organizations, { fields: [shipments.orgId], references: [organizations.id] }),
  deal: one(deals, { fields: [shipments.dealId], references: [deals.id] }),
}));

export const kycRecordsRelations = relations(kycRecords, ({ one }) => ({
  org: one(organizations, { fields: [kycRecords.orgId], references: [organizations.id] }),
  contact: one(contacts, { fields: [kycRecords.contactId], references: [contacts.id] }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  org: one(organizations, { fields: [appointments.orgId], references: [organizations.id] }),
  contact: one(contacts, { fields: [appointments.contactId], references: [contacts.id] }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  org: one(organizations, { fields: [orders.orgId], references: [organizations.id] }),
  client: one(clients, { fields: [orders.clientId], references: [clients.id] }),
}));

export const propertiesRelations = relations(properties, ({ one }) => ({
  org: one(organizations, { fields: [properties.orgId], references: [organizations.id] }),
}));

export const productsRelations = relations(products, ({ one }) => ({
  org: one(organizations, { fields: [products.orgId], references: [organizations.id] }),
}));

export const customFieldDefinitionsRelations = relations(customFieldDefinitions, ({ one }) => ({
  org: one(organizations, { fields: [customFieldDefinitions.orgId], references: [organizations.id] }),
}));

export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Pipeline = typeof pipelines.$inferSelect;
export type Stage = typeof stages.$inferSelect;
export type Deal = typeof deals.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type Webhook = typeof webhooks.$inferSelect;
export type OrgWidget = typeof orgWidgets.$inferSelect;

export type Client = typeof clients.$inferSelect;
export type Quotation = typeof quotations.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type MessageRecord = typeof messageRecords.$inferSelect;
export type FollowUp = typeof followups.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type ProjectTask = typeof projectTasks.$inferSelect;
export type Deliverable = typeof deliverables.$inferSelect;

export type AgentConfig = typeof agentConfigs.$inferSelect;
export type AgentRun = typeof agentRuns.$inferSelect;
export type AgentActionItem = typeof agentActionQueue.$inferSelect;
export type AgentMemory = typeof agentMemories.$inferSelect;

export type Shipment = typeof shipments.$inferSelect;
export type KycRecord = typeof kycRecords.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type Product = typeof products.$inferSelect;
export type CustomFieldDefinition = typeof customFieldDefinitions.$inferSelect;

// ==========================================
// 🚀 GROWTH & BUSINESS EVOLUTION ENGINE TABLES
// ==========================================

export const accountExpansionSignals = sqliteTable(
  "account_expansion_signals",
  {
    id: id("sig"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    companyId: text("company_id").references(() => companies.id, { onDelete: "cascade" }),
    contactId: text("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    accountName: text("account_name").notNull(),
    healthScore: integer("health_score").notNull().default(75),
    nrrStatus: text("nrr_status", { enum: ["expanding", "stable", "at_risk", "churned"] }).notNull().default("stable"),
    mrrValue: real("mrr_value").notNull().default(0),
    expansionPotential: real("expansion_potential").notNull().default(0),
    expansionReason: text("expansion_reason"),
    churnRiskFactor: text("churn_risk_factor"),
    lastTouchpointAt: text("last_touchpoint_at").notNull().default(sql`(current_timestamp)`),
    renewalDate: text("renewal_date"),
    status: text("status", { enum: ["active", "deal_created", "mitigated", "dismissed"] }).notNull().default("active"),
    ...timestamps,
  },
  (t) => [
    index("expansion_signals_org_idx").on(t.orgId),
    index("expansion_signals_status_idx").on(t.orgId, t.status),
  ]
);

export const referralLinks = sqliteTable(
  "referral_links",
  {
    id: id("ref"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    contactId: text("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    referrerName: text("referrer_name").notNull(),
    referralCode: text("referral_code").notNull().unique(),
    slug: text("slug").notNull(),
    rewardType: text("reward_type", { enum: ["credit", "discount_percent", "commission"] }).notNull().default("discount_percent"),
    rewardValue: real("reward_value").notNull().default(15), // e.g. 15%
    clicksCount: integer("clicks_count").notNull().default(0),
    conversionsCount: integer("conversions_count").notNull().default(0),
    totalRevenueGenerated: real("total_revenue_generated").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("referral_links_org_idx").on(t.orgId),
    index("referral_links_code_idx").on(t.referralCode),
  ]
);

export const referralConversions = sqliteTable(
  "referral_conversions",
  {
    id: id("rfc"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    referralLinkId: text("referral_link_id").notNull().references(() => referralLinks.id, { onDelete: "cascade" }),
    referredContactId: text("referred_contact_id").references(() => contacts.id, { onDelete: "set null" }),
    dealId: text("deal_id").references(() => deals.id, { onDelete: "set null" }),
    dealValue: real("deal_value").notNull().default(0),
    rewardAmount: real("reward_amount").notNull().default(0),
    rewardStatus: text("reward_status", { enum: ["pending", "credited", "paid"] }).notNull().default("pending"),
    ...timestamps,
  },
  (t) => [
    index("referral_conversions_org_idx").on(t.orgId),
    index("referral_conversions_link_idx").on(t.referralLinkId),
  ]
);

export const priceBooks = sqliteTable(
  "price_books",
  {
    id: id("pbk"),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    currency: text("currency").notNull().default("INR"),
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    ...timestamps,
  },
  (t) => [index("price_books_org_idx").on(t.orgId)]
);

export const priceBookEntries = sqliteTable(
  "price_book_entries",
  {
    id: id("pbe"),
    priceBookId: text("price_book_id").notNull().references(() => priceBooks.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    unitPrice: real("unit_price").notNull().default(0),
    minMarginPercent: real("min_margin_percent").notNull().default(20),
    ...timestamps,
  },
  (t) => [index("price_book_entries_pb_idx").on(t.priceBookId)]
);

// Relations for Growth Tables
export const accountExpansionSignalsRelations = relations(accountExpansionSignals, ({ one }) => ({
  org: one(organizations, { fields: [accountExpansionSignals.orgId], references: [organizations.id] }),
  company: one(companies, { fields: [accountExpansionSignals.companyId], references: [companies.id] }),
  contact: one(contacts, { fields: [accountExpansionSignals.contactId], references: [contacts.id] }),
}));

export const referralLinksRelations = relations(referralLinks, ({ one, many }) => ({
  org: one(organizations, { fields: [referralLinks.orgId], references: [organizations.id] }),
  contact: one(contacts, { fields: [referralLinks.contactId], references: [contacts.id] }),
  conversions: many(referralConversions),
}));

export const referralConversionsRelations = relations(referralConversions, ({ one }) => ({
  org: one(organizations, { fields: [referralConversions.orgId], references: [organizations.id] }),
  referralLink: one(referralLinks, { fields: [referralConversions.referralLinkId], references: [referralLinks.id] }),
  deal: one(deals, { fields: [referralConversions.dealId], references: [deals.id] }),
}));

export const priceBooksRelations = relations(priceBooks, ({ one, many }) => ({
  org: one(organizations, { fields: [priceBooks.orgId], references: [organizations.id] }),
  entries: many(priceBookEntries),
}));

export const priceBookEntriesRelations = relations(priceBookEntries, ({ one }) => ({
  priceBook: one(priceBooks, { fields: [priceBookEntries.priceBookId], references: [priceBooks.id] }),
  product: one(products, { fields: [priceBookEntries.productId], references: [products.id] }),
}));

export type AccountExpansionSignal = typeof accountExpansionSignals.$inferSelect;
export type ReferralLink = typeof referralLinks.$inferSelect;
export type ReferralConversion = typeof referralConversions.$inferSelect;
export type PriceBook = typeof priceBooks.$inferSelect;
export type PriceBookEntry = typeof priceBookEntries.$inferSelect;



