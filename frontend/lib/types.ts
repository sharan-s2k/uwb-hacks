export type TicketStatus = "ROUTED" | "IN_PROGRESS" | "NEEDS_MORE_INFO" | "RESOLVED";
export type TicketSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TicketCategory =
  | "POTHOLE"
  | "STREETLIGHT"
  | "GRAFFITI"
  | "TREE_HAZARD"
  | "FLOODING"
  | "NOISE"
  | "SIDEWALK"
  | "WATER_LEAK"
  | "OTHER";

export interface Ticket {
  id: string;
  title: string;
  description: string;
  location: string;
  latitude?: number;
  longitude?: number;
  photo_url?: string;
  category: TicketCategory;
  severity: TicketSeverity;
  status: TicketStatus;
  emergency_flag: boolean;
  assigned_agency_id: string;
  assigned_agency_name: string;
  resident_summary: string;
  created_at: string;
  updated_at: string;
}

export interface ReportFormData {
  description: string;
  location: string;
  latitude?: number;
  longitude?: number;
  photo?: File;
}

export interface ReportResponse {
  ticket: Ticket;
  emergency_flag: boolean;
  message: string;
}
