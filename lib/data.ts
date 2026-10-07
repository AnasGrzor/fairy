import type { StaticImageData } from "next/image";
import a2 from "@/images/a2.jpg";
import a3 from "@/images/a3.jpg";
import a4 from "@/images/a4.jpg";
import a6 from "@/images/a6.jpg";
import a7 from "@/images/a7.jpg";

export const WA = "923311332031";
export const waLink = (text?: string) =>
  `https://wa.me/${WA}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export type RoomId = "deluxe" | "standard" | "family" | "tent";

export type Room = {
  id: RoomId;
  cls: string;
  name: string;
  short: string;
  /** Name used inside the booking sentence. */
  phrase: string;
  img: StaticImageData;
  pos: string;
  alt: string;
  specs: string;
  max: number;
  pkr: number;
  usd: number;
};

/** Bento order: the big tile first. */
export const ROOMS: Room[] = [
  { id: "deluxe", cls: "c-a", name: "Panoramic Deluxe Suite", short: "Deluxe", phrase: "Deluxe suite", img: a6, pos: "40% 50%", alt: "Large suite with a king bed, sofa and a wide window onto the hills", specs: "King bed, up to 3 guests, the widest window", max: 3, pkr: 14999, usd: 59 },
  { id: "standard", cls: "c-b", name: "Mountain View Standard", short: "Standard", phrase: "Standard room", img: a2, pos: "50% 55%", alt: "Wood-panelled room with a double bed and a small sofa", specs: "Two beds, up to 2 guests, WiFi", max: 2, pkr: 8500, usd: 30 },
  { id: "family", cls: "c-c", name: "Family Heritage Lodge", short: "Family", phrase: "Family lodge", img: a4, pos: "50% 55%", alt: "Two-storey wooden lodge with a red roof lit at blue hour", specs: "Four beds, up to 6 guests, kitchen", max: 6, pkr: 18000, usd: 65 },
  { id: "tent", cls: "c-d", name: "Alpine Camping Tent", short: "Tent", phrase: "tent", img: a7, pos: "8% 88%", alt: "Orange dome tent pitched on the grass below Nanga Parbat", specs: "Tent for 2 to 4 guests, bonfire outside", max: 4, pkr: 7500, usd: 29 },
];

/** Booking form order, cheapest-to-largest; also the order used to find a room that fits a group. */
export const FORM_ORDER: RoomId[] = ["standard", "deluxe", "tent", "family"];

export const roomById = (id: RoomId) => ROOMS.find((r) => r.id === id)!;

/** Heights in feet. */
export type Stage = {
  alt: number;
  name: string;
  h: string;
  p: string;
  img?: StaticImageData;
  imgAlt?: string;
  imgPos?: string;
  cap?: string;
};

export const STAGES: Stage[] = [
  { alt: 3940, name: "Raikot Bridge", h: "Leave the highway", p: "Your jeep meets you where the Karakoram Highway crosses the Indus." },
  { alt: 8530, name: "Tattu village", h: "Jeep to Tattu", p: "About 90 minutes up a narrow cliffside track. Hold on and look down only if you like." },
  { alt: 10830, name: "Fairy Meadows", h: "Walk to the meadow", p: "Two to three hours on foot through pine forest, then the trees open and the peak is there.", img: a3, imgAlt: "Two guests smiling in front of the main lodge in morning sun", imgPos: "50% 60%", cap: "Arrival, around lunchtime" },
  { alt: 11480, name: "Beyal Camp", h: "Beyal Camp", p: "An easy morning walk from the lodge, with the Raikot Glacier below you." },
  { alt: 13020, name: "Nanga Parbat base camp", h: "Base camp", p: "A full day there and back with a guide, or a night in camp with the trek package.", img: a7, imgAlt: "A trekker with poles and a jeep below the ice of Nanga Parbat", imgPos: "60% 40%", cap: "The last stretch below the Rakhiot face" },
];

export const PALETTES = [
  { id: "blue", name: "Blue hour", swatch: ["oklch(0.19 0.042 228)", "oklch(0.83 0.135 76)"] },
  { id: "deodar", name: "Deodar", swatch: ["oklch(0.2 0.03 165)", "oklch(0.77 0.15 58)"] },
  { id: "roof", name: "Red roof", swatch: ["oklch(0.17 0.006 40)", "oklch(0.57 0.19 29)"] },
  { id: "glacier", name: "Glacier", swatch: ["oklch(1 0 0)", "oklch(0.5 0.14 245)"] },
  { id: "alpenglow", name: "Alpenglow", swatch: ["oklch(0.975 0.012 18)", "oklch(0.56 0.16 15)"] },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

export const CONTACTS = [
  { label: "WhatsApp, Sami Rais", value: "0331-1332031", copy: "+923311332031", aria: "Copy WhatsApp number" },
  { label: "Phone", value: "0319-0004705", copy: "+923190004705", aria: "Copy phone number" },
  { label: "Email", value: "fairymeadowscomfortlodges@gmail.com", copy: "fairymeadowscomfortlodges@gmail.com", aria: "Copy email address" },
];

export const FAQ = [
  { q: "When are you open?", a: "April to October. Snow closes the trail for the rest of the year. Sami answers messages from 7 AM to 9 PM Pakistan time." },
  { q: "How do I get there?", a: "Drive the Karakoram Highway to Raikot Bridge. A 4x4 takes you up the track to Tattu in about 90 minutes, then it is a 2-3 hour walk to the meadow. Sami books the jeep when you book the room." },
  { q: "Are meals included?", a: "The lodge packages include three meals a day: daal, roti and local dishes cooked fresh. Tell Sami about dietary needs when you book." },
  { q: "Is there WiFi?", a: "Yes, but it is limited. Enough for messages, not for video calls." },
  { q: "What should I pack?", a: "Warm layers and a rain jacket. Nights at 10,830 ft are cold even in July. Good walking shoes for the path up from Tattu." },
  { q: "Can you arrange a guide?", a: "Yes. Local guides lead walks to Beyal Camp and to Nanga Parbat base camp. The trek package includes both the guide and a night in camp." },
];
