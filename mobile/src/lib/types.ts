export type Role = 'client' | 'reader' | 'admin';

export type User = {
  id: number;
  role: Role;
  name: string;
  email: string;
  avatarUrl: string | null;
};

export type Reader = {
  id: number;
  name: string;
  avatarUrl: string | null;
  headline: string;
  bio: string | null;
  specialties: string[];
  languages: string[];
  yearsExperience: number;
  status: 'pending' | 'approved' | 'rejected';
  online: boolean;
  ratingAvg: number;
  ratingCount: number;
  consultationsCount: number;
  fromPriceCents: number | null;
  memberSince: string;
  isFavorite?: boolean;
  email?: string;
};

export type OfferType = 'chat' | 'video';

export type Offer = {
  id: number;
  type: OfferType;
  units: number;
  priceCents: number;
  active: boolean;
};

export type Review = {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  clientName: string;
  consultationType: OfferType;
  consultationUnits: number;
};

export type DrawnCard = { id: number; reversed: boolean };

export type ConsultationStatus = 'pending_payment' | 'paid' | 'active' | 'completed' | 'cancelled' | 'refunded';

export type Consultation = {
  id: number;
  type: OfferType;
  units: number;
  priceCents: number;
  currency: string;
  status: ConsultationStatus;
  topic: string | null;
  intakeQuestion: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  questionsUsed: number;
  paymentProvider: 'stripe' | null;
  readingCards: DrawnCard[] | null;
  readerNotes: string | null;
  reviewRating: number | null;
  createdAt: string;
  client: { id: number; name: string; avatarUrl: string | null };
  reader: { id: number; name: string; avatarUrl: string | null };
};

export type Message = {
  id: number;
  consultationId: number;
  senderId: number;
  body: string;
  isQuestion: boolean;
  createdAt: string;
};

export type AiReading = {
  id: number;
  consultationId: number | null;
  kind: 'daily' | 'deepen';
  cards: DrawnCard[];
  question: string | null;
  text: string;
  createdAt: string;
};

export type Availability = Partial<Record<'0' | '1' | '2' | '3' | '4' | '5' | '6', { start: string; end: string }>>;

export type ReaderDashboard = {
  reader: Reader;
  availability: Availability;
  offers: Offer[];
  stats: {
    earningsMonthCents: number;
    earningsTotalCents: number;
    openConsultations: number;
    commission: number;
  };
};
