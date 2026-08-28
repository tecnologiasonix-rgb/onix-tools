import { Lead } from "@/lib/csv";
import { LeadStatus, SaleInfo } from "@/lib/assignments";

export type EnrichedLead = Lead & {
  assignment: {
    status: LeadStatus;
    assignedToMe: boolean;
    assignedToName: string;
    expiresAt: string;
    sale: SaleInfo | null;
  } | null;
};
