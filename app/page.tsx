import Image from "next/image";
import a2 from "@/images/a2.jpg";
import a3 from "@/images/a3.jpg";
import a4 from "@/images/a4.jpg";
import a11 from "@/images/a11.jpg";
import a17 from "@/images/a17.jpg";
import a18 from "@/images/a18.jpg";
import { Booking } from "@/components/booking";
import { BookingProvider } from "@/components/booking-context";
import { Climb } from "@/components/climb";
import { Contact } from "@/components/contact";
import { Hero } from "@/components/hero";
import { Icon } from "@/components/icons";
import { Nav } from "@/components/nav";
import { PaletteSwitcher } from "@/components/palette-switcher";
import { Reveal } from "@/components/reveal";
import { Rooms } from "@/components/rooms";
import { CONTACTS, FAQ, waLink } from "@/lib/data";

const WALL_SIZES = "(min-width: 1100px) 420px, (min-width: 700px) 50vw, 100vw";
const WALL_IMG = "h-auto w-full rounded-media";
const CAPTION = "mt-2 text-[14px] text-fg-2";
const CHIP = "rounded-full bg-bg-2 px-3.5 py-2 text-[14px] text-fg-2";

export default function Page() {
  return (
    <BookingProvider>
      <PaletteSwitcher />
      <Nav />
      <Hero />

      <main>
        <Climb />

        <section className="py-[clamp(96px,12vw,176px)]" id="rooms">
          <div className="mx-auto max-w-[1320px] px-(--gutter)">
            <div className="mb-[clamp(40px,5vw,64px)]">
              <h2 className="text-[clamp(44px,6.4vw,88px)]">Four ways to spend the night</h2>
              <p className="mt-5 max-w-[56ch] text-fg-2">Prices are per room, per night. Choose one and the booking form fills in.</p>
            </div>
            <Rooms />
          </div>
        </section>

        <section className="py-[clamp(96px,12vw,176px)]" id="trek" style={{ paddingTop: 0 }}>
          <div className="mx-auto max-w-[1320px] px-(--gutter) grid grid-cols-2 items-center gap-[clamp(32px,5vw,80px)] max-[860px]:grid-cols-1">
            <Image
              className="aspect-[4/3] h-auto w-full rounded-media object-cover"
              src={a11}
              alt="Thirteen trekkers with walking sticks lined up in front of the wooden lodge before the base camp walk"
              sizes="(min-width: 860px) 50vw, 100vw"
              data-reveal
            />
            <div data-reveal>
              <h2 className="text-[clamp(44px,6.4vw,88px)]">Going to base camp?</h2>
              <p className="mt-5 max-w-[56ch] text-fg-2">
                Three days, two nights. We drive you up, a local guide walks you to Nanga Parbat base camp, and you sleep one night in camp under the peak.
              </p>
              <ul className="mt-[26px] mb-[30px] flex list-none flex-wrap gap-2 p-0">
                <li className={CHIP}>Jeep from Raikot</li>
                <li className={CHIP}>Base camp trek</li>
                <li className={CHIP}>Night in camp</li>
                <li className={CHIP}>Star-gazing</li>
                <li className={CHIP}>All meals</li>
              </ul>
              <div className="flex flex-wrap items-baseline gap-3">
                <b className="font-display text-[56px] leading-none font-extrabold">Rs 25,500</b>
                <span className="text-fg-2">$99 per person, 3 days</span>
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  className="btn btn-line"
                  target="_blank"
                  rel="noopener"
                  href={waLink("Assalam o Alaikum Sami, I'd like to ask about the Full Trek package (3 days, 2 nights).")}
                >
                  <Icon name="wa" /> Contact
                </a>
              </div>
              <div className="mt-10 grid grid-cols-2 gap-6 border-t border-line pt-7 max-[860px]:grid-cols-1">
                <div>
                  <b className="block font-semibold">Standard lodge package</b>
                  <span className="text-[15px] text-fg-2">Room, three meals and a guided nature walk. Rs 8,500 ($30) per person, per night.</span>
                </div>
                <div>
                  <b className="block font-semibold">Deluxe lodge package</b>
                  <span className="text-[15px] text-fg-2">Panoramic room, BBQ dinner and a guided trek to the viewpoint. Rs 12,500 ($45) per person, per night.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Booking />

        <section className="py-[clamp(96px,12vw,176px)]" aria-label="Guests and photos">
          <div className="mx-auto max-w-[1320px] px-(--gutter)">
            <h2 className="text-[clamp(44px,6.4vw,88px)]" style={{ marginBottom: "clamp(40px,5vw,64px)" }}>
              Rated 4.9 by 500+ guests
            </h2>
            <div className="columns-[3_320px] gap-x-3.5 *:mx-0 *:mt-0 *:mb-3.5 *:break-inside-avoid">
              <figure data-reveal>
                <Image className={WALL_IMG} src={a4} alt="White wooden lodge with a red roof, windows glowing at blue hour among tall pines" sizes={WALL_SIZES} />
                <figcaption className={CAPTION}>A family lodge after sunset</figcaption>
              </figure>
              <Quote text="The view of Nanga Parbat from our lodge was beyond words. Sami Rais and his team were so hospitable." name="Ahmed Khan" place="Lahore" />
              <figure data-reveal>
                <Image className={WALL_IMG} src={a3} alt="Two guests giving a thumbs up in front of the main lodge on a sunny morning" sizes={WALL_SIZES} />
                <figcaption className={CAPTION}>Arrival day, clear skies</figcaption>
              </figure>
              <figure data-reveal>
                <Image className={WALL_IMG} src={a17} alt="Two hikers in rain jackets standing with a local host beside the lodge sign" sizes={WALL_SIZES} />
                <figcaption className={CAPTION}>Rain at 10,830 ft, tea inside</figcaption>
              </figure>
              <Quote text="The lodge was cozy, the food was delicious, and the guides knew every trail. Great for families." name="Sara Fatima" place="Karachi" />
              <figure data-reveal>
                <Image className={WALL_IMG} src={a18} alt="A newly built lodge with a bright red roof below a snowy ridge" sizes={WALL_SIZES} />
                <figcaption className={CAPTION}>The newest lodge</figcaption>
              </figure>
              <Quote text="The bonfire night under the stars was an experience I will never forget." name="Mike Roberts" place="London" />
              <figure data-reveal>
                <Image className={WALL_IMG} src={a2} alt="Wood-panelled room with a made double bed, sofa and mountain paintings" sizes={WALL_SIZES} />
                <figcaption className={CAPTION}>Standard room</figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className="py-[clamp(96px,12vw,176px)]" id="questions" style={{ paddingTop: 0 }}>
          <div className="mx-auto max-w-[1320px] px-(--gutter) grid grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] items-start gap-[clamp(32px,6vw,96px)] max-[860px]:grid-cols-[minmax(0,1fr)]">
            <h2 className="text-[clamp(44px,6.4vw,88px)] sticky top-[110px] max-[860px]:static">Before you come</h2>
            <div>
              {FAQ.map((f) => (
                <details key={f.q} className="group border-b border-line">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-6 text-[19px] font-medium [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <Icon name="plus" className="text-accent transition-transform duration-350 ease-out-expo group-open:rotate-45" />
                  </summary>
                  <p className="max-w-[62ch] pb-[26px] text-fg-2">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line pt-[clamp(72px,9vw,120px)] pb-10">
        <div className="mx-auto max-w-[1320px] px-(--gutter)">
          {/* Sized from its own box: the line is 5.71-5.77x its font size wide (Big Shoulders, 800), so 17cqi fills ~98% without spilling. */}
          <div className="@container overflow-hidden">
            <div className="font-display text-[17cqi] leading-[.8] font-extrabold tracking-[-.01em] whitespace-nowrap uppercase" aria-hidden="true">
              Fairy <span className="text-accent">Meadows</span>
            </div>
          </div>
          <div className="mt-[clamp(40px,5vw,64px)] flex flex-wrap items-end justify-between gap-7">
            <div className="flex flex-wrap gap-2.5">
              {CONTACTS.map((c) => (
                <Contact key={c.value} {...c} />
              ))}
            </div>
            <a className="btn btn-lantern" href="#book">
              Check dates <Icon name="arrow" className="arrow" />
            </a>
          </div>
          <div className="mt-10 flex flex-wrap justify-between gap-3 text-[13px] text-fg-2">
            <span>Fairy Meadows Comfort Lodges, below Nanga Parbat, Gilgit-Baltistan, Pakistan</span>
            <span>Open April to October</span>
          </div>
        </div>
      </footer>

      <Reveal />
    </BookingProvider>
  );
}

function Quote({ text, name, place }: { text: string; name: string; place: string }) {
  return (
    <div className="rounded-media bg-bg-2 p-7" data-reveal>
      <blockquote className="m-0 text-[20px] leading-[1.45] before:mb-2.5 before:block before:font-display before:text-[64px] before:leading-[.6] before:font-extrabold before:text-accent before:content-['\201C']">
        {text}
      </blockquote>
      <cite className="mt-[18px] block text-[15px] font-semibold not-italic">
        {name}
        <span className="block font-normal text-fg-2">{place}</span>
      </cite>
    </div>
  );
}
