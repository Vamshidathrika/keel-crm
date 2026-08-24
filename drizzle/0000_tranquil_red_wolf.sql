CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`type` text NOT NULL,
	`related_contact_id` text,
	`related_company_id` text,
	`related_deal_id` text,
	`actor_user_id` text,
	`body` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`external_id` text,
	`occurred_at` text DEFAULT (current_timestamp) NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`related_contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`related_company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`related_deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `activities_contact_idx` ON `activities` (`related_contact_id`);--> statement-breakpoint
CREATE INDEX `activities_deal_idx` ON `activities` (`related_deal_id`);--> statement-breakpoint
CREATE INDEX `activities_company_idx` ON `activities` (`related_company_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `activities_idempotency_idx` ON `activities` (`org_id`,`source`,`external_id`);--> statement-breakpoint
CREATE TABLE `agent_action_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`run_id` text,
	`agent_type` text NOT NULL,
	`severity` text DEFAULT 'info' NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`action_type` text NOT NULL,
	`action_payload` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewed_by_id` text,
	`reviewed_at` text,
	`rejection_reason` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`run_id`) REFERENCES `agent_runs`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`reviewed_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `agent_action_queue_org_idx` ON `agent_action_queue` (`org_id`);--> statement-breakpoint
CREATE INDEX `agent_action_queue_status_idx` ON `agent_action_queue` (`org_id`,`status`);--> statement-breakpoint
CREATE TABLE `agent_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`agent_type` text NOT NULL,
	`is_enabled` integer DEFAULT true NOT NULL,
	`execution_mode` text DEFAULT 'supervised' NOT NULL,
	`model` text DEFAULT 'gemini-2.5-flash' NOT NULL,
	`sweep_interval_hours` integer DEFAULT 24 NOT NULL,
	`last_sweep_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_configs_org_agent_idx` ON `agent_configs` (`org_id`,`agent_type`);--> statement-breakpoint
CREATE TABLE `agent_memories` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`confidence` real DEFAULT 1 NOT NULL,
	`source_agent` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_memories_entity_key_idx` ON `agent_memories` (`org_id`,`entity_type`,`entity_id`,`key`);--> statement-breakpoint
CREATE TABLE `agent_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`agent_type` text NOT NULL,
	`target_entity_type` text NOT NULL,
	`target_entity_id` text NOT NULL,
	`status` text NOT NULL,
	`confidence_score` real DEFAULT 0.85 NOT NULL,
	`thought_process` text DEFAULT '[]' NOT NULL,
	`summary` text NOT NULL,
	`tools_invoked` text DEFAULT '[]' NOT NULL,
	`execution_duration_ms` integer,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `agent_runs_org_idx` ON `agent_runs` (`org_id`);--> statement-breakpoint
CREATE INDEX `agent_runs_target_idx` ON `agent_runs` (`target_entity_type`,`target_entity_id`);--> statement-breakpoint
CREATE TABLE `ai_insights_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`model` text DEFAULT 'gemini-2.5-flash' NOT NULL,
	`generated_at` text DEFAULT (current_timestamp) NOT NULL,
	`expires_at` text,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_cache_entity_kind_idx` ON `ai_insights_cache` (`entity_type`,`entity_id`,`kind`);--> statement-breakpoint
CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`name` text NOT NULL,
	`key_prefix` text NOT NULL,
	`key_hash` text NOT NULL,
	`scopes` text DEFAULT '["activities:write"]' NOT NULL,
	`created_by_id` text,
	`last_used_at` text,
	`revoked_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_hash_idx` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`contact_id` text,
	`client_name` text NOT NULL,
	`service_type` text NOT NULL,
	`date_time` text NOT NULL,
	`status` text DEFAULT 'Scheduled' NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `appointments_org_idx` ON `appointments` (`org_id`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`actor_user_id` text,
	`actor_api_key_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`diff` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_api_key_id`) REFERENCES `api_keys`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_logs_org_idx` ON `audit_logs` (`org_id`);--> statement-breakpoint
CREATE TABLE `automation_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`automation_id` text NOT NULL,
	`action_type` text NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`automation_id`) REFERENCES `automations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `automation_conditions` (
	`id` text PRIMARY KEY NOT NULL,
	`automation_id` text NOT NULL,
	`field` text NOT NULL,
	`operator` text NOT NULL,
	`value` text NOT NULL,
	FOREIGN KEY (`automation_id`) REFERENCES `automations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `automation_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`automation_id` text NOT NULL,
	`status` text NOT NULL,
	`detail` text,
	`ran_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`automation_id`) REFERENCES `automations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `automations` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`name` text NOT NULL,
	`trigger` text NOT NULL,
	`is_enabled` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`company_id` text,
	`contact_id` text,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`portal_token` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clients_portal_token_unique` ON `clients` (`portal_token`);--> statement-breakpoint
CREATE INDEX `clients_org_idx` ON `clients` (`org_id`);--> statement-breakpoint
CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`name` text NOT NULL,
	`domain` text,
	`industry` text,
	`website` text,
	`owner_id` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`custom_fields` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `companies_org_idx` ON `companies` (`org_id`);--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`company_id` text,
	`first_name` text NOT NULL,
	`last_name` text,
	`email` text,
	`phone` text,
	`title` text,
	`city` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`owner_id` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`custom_fields` text DEFAULT '{}' NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`score_breakdown` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `contacts_org_idx` ON `contacts` (`org_id`);--> statement-breakpoint
CREATE INDEX `contacts_phone_idx` ON `contacts` (`org_id`,`phone`);--> statement-breakpoint
CREATE INDEX `contacts_email_idx` ON `contacts` (`org_id`,`email`);--> statement-breakpoint
CREATE TABLE `custom_field_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`field_type` text NOT NULL,
	`options` text DEFAULT '[]' NOT NULL,
	`is_required` integer DEFAULT false NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cfd_org_entity_key_idx` ON `custom_field_definitions` (`org_id`,`entity_type`,`key`);--> statement-breakpoint
CREATE TABLE `deals` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`pipeline_id` text NOT NULL,
	`stage_id` text NOT NULL,
	`title` text NOT NULL,
	`value` real DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`contact_id` text,
	`company_id` text,
	`owner_id` text,
	`expected_close_date` text,
	`probability` integer DEFAULT 10 NOT NULL,
	`health_flags` text DEFAULT '[]' NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`lost_reason` text,
	`lost_reason_notes` text,
	`closed_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pipeline_id`) REFERENCES `pipelines`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stage_id`) REFERENCES `stages`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `deals_org_idx` ON `deals` (`org_id`);--> statement-breakpoint
CREATE INDEX `deals_stage_idx` ON `deals` (`stage_id`);--> statement-breakpoint
CREATE INDEX `deals_owner_idx` ON `deals` (`owner_id`);--> statement-breakpoint
CREATE TABLE `deliverables` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`file_url` text,
	`status` text DEFAULT 'pending_review' NOT NULL,
	`client_feedback` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `followups` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`deal_id` text,
	`contact_id` text,
	`title` text NOT NULL,
	`description` text,
	`due_date` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `followups_org_idx` ON `followups` (`org_id`);--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`deal_id` text,
	`client_id` text,
	`invoice_number` text NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`due_date` text NOT NULL,
	`pdf_url` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `invoices_org_idx` ON `invoices` (`org_id`);--> statement-breakpoint
CREATE TABLE `kyc_records` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`contact_id` text,
	`customer` text NOT NULL,
	`doc_type` text NOT NULL,
	`compliance_status` text DEFAULT 'Pending Review' NOT NULL,
	`regulatory_logs` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `kyc_records_org_idx` ON `kyc_records` (`org_id`);--> statement-breakpoint
CREATE TABLE `message_records` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`client_id` text,
	`contact_id` text,
	`type` text DEFAULT 'whatsapp' NOT NULL,
	`direction` text DEFAULT 'outbound' NOT NULL,
	`text` text NOT NULL,
	`status` text DEFAULT 'sent' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `message_records_org_idx` ON `message_records` (`org_id`);--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`body` text NOT NULL,
	`related_contact_id` text,
	`related_company_id` text,
	`related_deal_id` text,
	`author_id` text,
	`is_pinned` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`related_contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`related_company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`related_deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`link` text,
	`is_read` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`user_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`client_id` text,
	`order_number` text NOT NULL,
	`client_name` text NOT NULL,
	`items_summary` text NOT NULL,
	`total_amount` text NOT NULL,
	`fulfillment_status` text DEFAULT 'Processing' NOT NULL,
	`delivery_eta` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `orders_org_idx` ON `orders` (`org_id`);--> statement-breakpoint
CREATE TABLE `org_widgets` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`widget_key` text NOT NULL,
	`is_enabled` integer DEFAULT true NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `org_widgets_org_idx` ON `org_widgets` (`org_id`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`business_type` text,
	`onboarding_completed` integer DEFAULT false NOT NULL,
	`branding_config` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_slug_unique` ON `organizations` (`slug`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`invoice_id` text,
	`amount` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`transaction_id` text,
	`paid_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `payments_org_idx` ON `payments` (`org_id`);--> statement-breakpoint
CREATE TABLE `pipelines` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`name` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`name` text NOT NULL,
	`sku` text,
	`description` text,
	`unit_price` real DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`tax_rate_percent` real DEFAULT 18 NOT NULL,
	`category` text DEFAULT 'Services' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `products_org_idx` ON `products` (`org_id`);--> statement-breakpoint
CREATE INDEX `products_sku_idx` ON `products` (`org_id`,`sku`);--> statement-breakpoint
CREATE TABLE `project_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`assignee_id` text,
	`status` text DEFAULT 'todo' NOT NULL,
	`due_date` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`client_id` text,
	`deal_id` text,
	`name` text NOT NULL,
	`status` text DEFAULT 'planning' NOT NULL,
	`budget` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `projects_org_idx` ON `projects` (`org_id`);--> statement-breakpoint
CREATE TABLE `properties` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`title` text NOT NULL,
	`location` text NOT NULL,
	`price` text NOT NULL,
	`type` text DEFAULT 'Commercial' NOT NULL,
	`status` text DEFAULT 'Available' NOT NULL,
	`buyer_or_tenant` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `properties_org_idx` ON `properties` (`org_id`);--> statement-breakpoint
CREATE TABLE `quotations` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`deal_id` text,
	`client_id` text,
	`title` text NOT NULL,
	`items` text DEFAULT '[]' NOT NULL,
	`total` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`pdf_url` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `quotations_org_idx` ON `quotations` (`org_id`);--> statement-breakpoint
CREATE TABLE `saved_filters` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`user_id` text,
	`entity_type` text NOT NULL,
	`name` text NOT NULL,
	`filter_config` text NOT NULL,
	`is_shared` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `shipments` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`deal_id` text,
	`deal_name` text NOT NULL,
	`carrier` text NOT NULL,
	`origin` text NOT NULL,
	`destination` text NOT NULL,
	`eta` text NOT NULL,
	`status` text DEFAULT 'Booking Confirmed' NOT NULL,
	`mode` text DEFAULT 'Ocean Freight' NOT NULL,
	`cost` text DEFAULT '0' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `shipments_org_idx` ON `shipments` (`org_id`);--> statement-breakpoint
CREATE TABLE `stages` (
	`id` text PRIMARY KEY NOT NULL,
	`pipeline_id` text NOT NULL,
	`name` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`type` text DEFAULT 'open' NOT NULL,
	`probability` integer DEFAULT 10 NOT NULL,
	`color` text DEFAULT '#2F5DFF' NOT NULL,
	FOREIGN KEY (`pipeline_id`) REFERENCES `pipelines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `stages_pipeline_idx` ON `stages` (`pipeline_id`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`stripe_customer_id` text,
	`stripe_subscription_id` text,
	`stripe_price_id` text,
	`plan` text DEFAULT 'starter' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`seat_count` integer DEFAULT 5 NOT NULL,
	`current_period_start` text,
	`current_period_end` text,
	`cancel_at_period_end` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_org_idx` ON `subscriptions` (`org_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_stripe_sub_idx` ON `subscriptions` (`stripe_subscription_id`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#64748B' NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_org_name_idx` ON `tags` (`org_id`,`name`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`due_date` text,
	`is_done` integer DEFAULT false NOT NULL,
	`completed_at` text,
	`related_contact_id` text,
	`related_company_id` text,
	`related_deal_id` text,
	`assignee_id` text,
	`created_by_id` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`related_contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`related_company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`related_deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tasks_assignee_idx` ON `tasks` (`assignee_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'rep' NOT NULL,
	`manager_id` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `webhook_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`webhook_id` text NOT NULL,
	`event_type` text NOT NULL,
	`payload` text NOT NULL,
	`response_status` integer,
	`attempt` integer DEFAULT 1 NOT NULL,
	`delivered_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`webhook_id`) REFERENCES `webhooks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `webhook_deliveries_webhook_idx` ON `webhook_deliveries` (`webhook_id`);--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`target_url` text NOT NULL,
	`event_types` text DEFAULT '[]' NOT NULL,
	`secret` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
