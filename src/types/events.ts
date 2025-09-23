export type EventCategory =
  | "OCR"
  | "Marathon"
  | "HalfMarathon"
  | "Triathlon"
  | "Trail"
  | "Cycling"
  | "Swim"
  | "Other";

export type EventDistanceType = "run" | "ocr" | "relay" | "swim" | "bike" | "other";

export interface EventDistance {
  id: string;
  eventId: string;
  label: string;           // e.g., "5 km"
  distanceKm?: number;     // numeric value if known
  type: EventDistanceType; // run/ocr/etc.
  priceFrom?: number;      // lowest tier price
  cutoffMinutes?: number;  // time limit
  waveInfo?: string;       // e.g., "Elite / Open waves"
}

export interface EventSummary {
  id: string;
  title: string;
  startDate: string; // ISO
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
  eventCategory: EventCategory;
  status: "scheduled" | "open" | "closed" | "cancelled";
  coverImage?: string;
  updatedAt: string; // ISO
  deletedAt?: string | null;
  minDistanceLabel?: string; // quick display in lists
}

export interface EventDetails extends EventSummary {
  descriptionMarkdown?: string;
  registrationUrl?: string;
  distances: EventDistance[]; // ✅ nested distances on the model
  rulesMarkdown?: string;
  elevationGainM?: number;
  gpxUrl?: string;
}

export type UserRaceStatus = "FUTURE" | "PAST" | "CANCELLED";

export interface UserRaceBase {
  id: string;
  eventId: string;
  status: UserRaceStatus;
  bibNumber?: string;
  waveNumber?: string;
  startTimeLocal?: string;
  targetTimeMinutes?: number;
  resultTimeSeconds?: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FutureUserRace extends Pick<UserRaceBase, 
  "id" | "eventId" | "startTimeLocal" | "bibNumber" | "waveNumber" | "targetTimeMinutes" | "note"
> {}

export interface PastUserRace extends Pick<UserRaceBase, 
  "id" | "eventId" | "resultTimeSeconds" | "note"
> {}