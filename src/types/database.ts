export type Role = "owner" | "front_desk" | "super_admin";
export type MemberStatus = "active" | "expired" | "frozen";
export type PaymentMethod = "cash" | "card" | "bank_transfer";

export interface Profile {
  id: string;
  full_name: string | null;
  role: Role;
  created_at: string;
}

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  duration_days: number;
  price: number;
  is_active: boolean;
  created_at: string;
}

export interface Member {
  id: string;
  member_no: number | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  photo_url: string | null;
  plan_id: string | null;
  start_date: string;
  end_date: string;
  status: MemberStatus;
  expected_amount: number;
  created_by: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  member_id: string;
  amount: number;
  payment_date: string;
  method: PaymentMethod;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface MemberWithPlan extends Member {
  plans: Pick<Plan, "id" | "name" | "duration_days" | "price"> | null;
}

export interface CheckIn {
  id: string;
  member_id: string;
  check_in_date: string;
  checked_in_at: string;
  checked_in_by: string | null;
}

export interface MemberBalance {
  member_id: string;
  expected_amount: number;
  paid_this_period: number;
  outstanding: number;
}

