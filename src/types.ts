export type MembershipPlan = 'monthly' | 'annual';
export type EventTier = 'included' | 'premium';
export type TabKey = 'home' | 'events' | 'pass' | 'tickets' | 'admin' | 'profile';
export type UserRole = 'admin' | 'staff' | 'customer';

export interface StaffPermissions {
  canViewEvents: boolean;
  canCreateEvents: boolean;
  canEditEvents: boolean;
  canDeleteEvents: boolean;
  canPublishEvents: boolean;
  canManageInventory: boolean;
  canViewGuestList: boolean;
  canScanTickets: boolean;
  canIssueRefunds: boolean;
  scopeAllEvents: boolean;
}

export interface MemberProfile {
  fullName: string;
  email: string;
  role?: UserRole;
}

export interface TicketType {
  id: string;
  name: string;
  price: number;
  serviceFee: number;
  quantityRemaining: number;
  salesOpen: boolean;
  description: string;
}

export interface EventItem {
  id: string;
  title: string;
  subtitle: string;
  venue: string;
  city: string;
  date: string;
  displayDate: string;
  time: string;
  tier: EventTier;
  memberSpotsRemaining: number;
  accent: string;
  tags: string[];
  dressCode: string;
  age: string;
  ticketTypes: TicketType[];
}

export type TicketStatus = 'valid' | 'used' | 'refunded' | 'void';

export interface Ticket {
  id: string;
  orderId: string;
  eventId: string;
  ticketTypeId: string;
  ticketTypeName: string;
  holderName: string;
  purchasedAt: string;
  status: TicketStatus;
  qrPayload: string;
  checkedInAt: string | null;
}

export interface TicketOrder {
  id: string;
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  subtotal: number;
  fees: number;
  total: number;
  status: 'paid' | 'refunded' | 'failed';
  purchasedAt: string;
  paymentMode: 'demo' | 'stripe';
}

export interface CheckInResult {
  ok: boolean;
  title: string;
  message: string;
  ticket?: Ticket;
}

export interface Membership {
  active: boolean;
  plan: MembershipPlan | null;
  homeCity: string;
  creditsRemaining: number;
  creditsTotal: number;
  renewalDate: string | null;
}

export interface Reservation {
  eventId: string;
  reservedAt: string;
  status: 'confirmed' | 'cancelled' | 'attended';
  confirmationCode: string;
  admissionToken: string;
}
