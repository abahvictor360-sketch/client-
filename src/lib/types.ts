// Row shapes for the tables in supabase/migrations.

export type SegmentStatus = "testing" | "working" | "scaling" | "paused" | "exhausted";
export type ProspectStatus =
  | "new" | "contacted" | "replied" | "interested" | "booked"
  | "not_interested" | "unsubscribed" | "bounced" | "done";

export interface Account {
  user_id: string;
  company_name: string | null;
  sender_name: string | null;
  sender_title: string | null;
  sender_email: string | null;
  postal_address: string | null;
  timezone: string;
  working_hours_start: number;
  working_hours_end: number;
  meeting_minutes: number;
  meeting_link: string | null;
  credits_cents: number;
  trial_ends_at: string;
  is_admin: boolean;
  suspended: boolean;
  heard_from: string | null;
}

export interface Competitor {
  name: string;
  domain: string;
  note: string;
}

/** Details the agent can quote when prospects ask (set in the setup steps). */
export interface BusinessFacts {
  pricing?: string;
  capabilities?: string;
  proof?: string;
}

export interface Business {
  id: string;
  user_id: string;
  website: string | null;
  description: string | null;
  name: string | null;
  summary: string | null;
  offer: string | null;
  value_props: string[];
  competitors: Competitor[];
  status: "analyzing" | "ready" | "running" | "paused" | "failed";
  error: string | null;
  daily_budget_cents: number;
  max_emails_per_day: number;
  analysis_started_at: string;
  confirmed_at: string | null;
  facts: BusinessFacts;
  created_at: string;
}

export interface SegmentFilters {
  person_titles: string[];
  person_seniorities: string[];
  person_locations: string[];
  organization_keywords: string[];
  employee_ranges: string[];
}

export interface Segment {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  rationale: string | null;
  fit_score: number;
  filters: SegmentFilters;
  status: SegmentStatus;
  apollo_page: number;
  sent: number;
  replies: number;
  positive_replies: number;
  meetings: number;
  spend_cents: number;
}

export interface Prospect {
  id: string;
  business_id: string;
  segment_id: string;
  apollo_id: string | null;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  company: string | null;
  company_domain: string | null;
  company_description: string | null;
  email: string;
  linkedin_url: string | null;
  city: string | null;
  country: string | null;
  status: ProspectStatus;
  sequence_step: number;
  next_action_at: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  prospect_id: string;
  business_id: string;
  direction: "outbound" | "inbound";
  subject: string | null;
  body: string;
  status: "sent" | "failed" | "received";
  intent: string | null;
  provider_id: string | null;
  rfc_message_id: string | null;
  error: string | null;
  created_at: string;
}

export interface Meeting {
  id: string;
  business_id: string;
  prospect_id: string;
  starts_at: string;
  ends_at: string;
  status: "booked" | "cancelled";
}
