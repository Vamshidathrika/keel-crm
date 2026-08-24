import { searchContactsTool, createContactTool, updateContactLeadScoreTool } from "./contacts-hands";
import { searchDealsTool, createDealTool, moveDealStageTool } from "./deals-hands";
import { searchCompaniesTool, createCompanyTool, enrichCompanyTool } from "./companies-hands";
import { createTaskTool, completeTaskTool, logActivityTool } from "./tasks-hands";
import { createQuotationTool, createInvoiceTool } from "./billing-hands";
import { getPipelineMetricsTool } from "./analytics-hands";
import { triggerConnectedAppTool, sendClientMessageTool } from "./integrations-hands";

/**
 * Complete suite of LangChain Tools ("Hands") enabling the AI agent
 * to operate all modules across the CRM platform.
 */
export const allAgentHands = [
  // Contacts & Leads
  searchContactsTool,
  createContactTool,
  updateContactLeadScoreTool,

  // Deals & Pipeline
  searchDealsTool,
  createDealTool,
  moveDealStageTool,

  // Companies & Accounts
  searchCompaniesTool,
  createCompanyTool,
  enrichCompanyTool,

  // Tasks & Timeline
  createTaskTool,
  completeTaskTool,
  logActivityTool,

  // Quotes & Invoices
  createQuotationTool,
  createInvoiceTool,

  // Analytics & Forecasts
  getPipelineMetricsTool,

  // Connected Apps & Client Messaging
  triggerConnectedAppTool,
  sendClientMessageTool,
];

/**
 * Map of tool name to executable tool instance
 */
export const agentHandsMap = new Map(allAgentHands.map((t) => [t.name, t]));

export {
  searchContactsTool,
  createContactTool,
  updateContactLeadScoreTool,
  searchDealsTool,
  createDealTool,
  moveDealStageTool,
  searchCompaniesTool,
  createCompanyTool,
  enrichCompanyTool,
  createTaskTool,
  completeTaskTool,
  logActivityTool,
  createQuotationTool,
  createInvoiceTool,
  getPipelineMetricsTool,
  triggerConnectedAppTool,
  sendClientMessageTool,
};
