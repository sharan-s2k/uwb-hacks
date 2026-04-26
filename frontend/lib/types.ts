export type TicketStatus = "ROUTED" | "IN_PROGRESS" | "NEEDS_MORE_INFO" | "RESOLVED";
export type TicketSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TicketCategory =
  | "POTHOLE"
  | "ROAD_DAMAGE"
  | "STREETLIGHT_OUTAGE"
  | "TRAFFIC_SIGNAL"
  | "SIDEWALK_OBSTRUCTION"
  | "ACCESSIBILITY_BARRIER"
  | "ILLEGAL_DUMPING"
  | "TRASH_OVERFLOW"
  | "PARK_DAMAGE"
  | "FLOODING"
  | "GRAFFITI"
  | "ABANDONED_VEHICLE"
  | "NOISE_COMPLAINT"
  | "WATER_LEAK"
  | "OTHER";

// Shape returned by both /api/reports/manual and /api/reports/voice/finalize
export interface TicketResponse {
  id: string;
  ticket_number: string;
  title: string;
  category: string;
  severity: string;
  status: string;
  assigned_agency_id: string | null;
  assigned_agency_name: string;
  citizen_summary: string;
  emergency_flag: boolean;
}

export interface ReportResponse {
  ticket: TicketResponse;
  emergency_flag: boolean;
  message: string;
}

export interface ReportFormData {
  description: string;
  location: string;
  latitude?: number;
  longitude?: number;
  photo?: File;
}
