export type Role = "owner" | "front_desk";
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
  duration_days: number;
  price: number;
  is_active: boolean;
  created_at: string;
}

export interface Member {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  plan_id: string | null;
  start_date: string;
  end_date: string;
  status: MemberStatus;
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

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string }; Update: Partial<Profile> };
      plans: { Row: Plan; Insert: Partial<Plan>; Update: Partial<Plan> };
      members: { Row: Member; Insert: Partial<Member>; Update: Partial<Member> };
      payments: { Row: Payment; Insert: Partial<Payment>; Update: Partial<Payment> };
    };
  };
}
