import { EventDetails } from "@/types/events";

export const mockEvents: EventDetails[] = [
  {
    id: "evt_1",
    title: "Forest Challenge OCR",
    startDate: "2025-10-10T08:00:00Z",
    city: "Brno",
    country: "Czech Republic",
    lat: 49.1951,
    lng: 16.6068,
    eventCategory: "OCR",
    status: "open",
    coverImage: "https://picsum.photos/seed/ocr1/1200/600",
    updatedAt: "2025-09-01T10:00:00Z",
    minDistanceLabel: "5 km",
    distances: [
      { id: "dist_1a", eventId: "evt_1", label: "5 km Open", distanceKm: 5, type: "ocr", priceFrom: 25 },
      { id: "dist_1b", eventId: "evt_1", label: "10 km Elite", distanceKm: 10, type: "ocr", priceFrom: 40 }
    ],
    descriptionMarkdown: "Obstacle course through forest trails.",
    registrationUrl: "https://example.com/register/evt_1"
  },
  {
    id: "evt_2",
    title: "Prague Marathon",
    startDate: "2025-09-22T08:00:00Z",
    city: "Prague",
    country: "Czech Republic",
    lat: 50.0755,
    lng: 14.4378,
    eventCategory: "Marathon",
    status: "open",
    coverImage: "https://picsum.photos/seed/mar1/1200/600",
    updatedAt: "2025-09-02T09:00:00Z",
    minDistanceLabel: "42.2 km",
    distances: [
      { id: "dist_2a", eventId: "evt_2", label: "Marathon", distanceKm: 42.195, type: "run", priceFrom: 85 },
      { id: "dist_2b", eventId: "evt_2", label: "Half Marathon", distanceKm: 21.0975, type: "run", priceFrom: 55 }
    ],
    descriptionMarkdown: "Fast urban course through the historic center.",
    registrationUrl: "https://example.com/register/evt_2"
  },
  {
    id: "evt_3",
    title: "Ironman 70.3 Baltic",
    startDate: "2025-11-05T07:00:00Z",
    city: "Gdańsk",
    country: "Poland",
    lat: 54.3721,
    lng: 18.6386,
    eventCategory: "Triathlon",
    status: "scheduled",
    coverImage: "https://picsum.photos/seed/tri1/1200/600",
    updatedAt: "2025-09-03T12:00:00Z",
    minDistanceLabel: "70.3",
    distances: [
      { id: "dist_3a", eventId: "evt_3", label: "70.3 Individual", type: "other" },
      { id: "dist_3b", eventId: "evt_3", label: "Relay", type: "relay" }
    ],
    descriptionMarkdown: "Sea swim, coastal bike, flat run.",
    registrationUrl: "https://example.com/register/evt_3"
  }
];