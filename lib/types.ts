export type UserRole = "admin" | "staff" | "supervisor";
export type ElectionState = "setup" | "counting" | "finalised";
export type RoundStatus = "pending_verification" | "verified" | "rejected";

export type Profile = {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
};

export type Election = {
  id: string;
  name: string;
  date: string;
  total_votes_polled: number;
  count_limit: number;
  state: ElectionState;
  created_at: string;
};

export type Post = {
  id: string;
  election_id: string;
  name: string;
  seats: number;
  display_order: number;
};

export type Candidate = {
  id: string;
  post_id: string;
  name: string;
  photo_url: string | null;
  panel_name: string | null;
  display_order: number;
};

export type StaffAssignment = {
  id: string;
  staff_id: string;
  post_id: string;
};

export type CountRound = {
  id: string;
  post_id: string;
  staff_id: string;
  round_number: number;
  status: RoundStatus;
  submitted_at: string;
  verified_by: string | null;
  verified_at: string | null;
  remarks: string | null;
  is_finalised: boolean;
};

export type CountEntry = {
  id: string;
  round_id: string;
  candidate_id: string;
  votes: number;
};

export type LiveCandidate = {
  id: string;
  name: string;
  photo_url: string | null;
  panel_name: string | null;
  votes: number;
};

export type LivePost = {
  id: string;
  name: string;
  seats: number;
  display_order: number;
  verified_rounds: number;
  pending_rounds: number;
  is_finalised: boolean;
  total_verified_votes: number;
  candidates: LiveCandidate[];
};

export type LiveResults = {
  election: {
    id: string;
    name: string;
    date: string;
    total_votes_polled: number;
    count_limit: number;
    state: ElectionState;
  } | null;
  posts: LivePost[];
};

export type PendingRound = CountRound & {
  post: Pick<Post, "id" | "name" | "seats">;
  staff: Pick<Profile, "id" | "full_name">;
  entries: Array<CountEntry & { candidate: Pick<Candidate, "id" | "name" | "panel_name"> }>;
};
