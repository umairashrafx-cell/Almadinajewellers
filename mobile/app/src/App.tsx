import { Gem, Heart, Home, Menu, PencilRuler } from "lucide-react";
import { useEffect, useState, type ComponentType, type SVGProps } from "react";

import { fetchRateSnapshot } from "@/lib/rates";
import { cn } from "@/lib/utils";

import { MoneyProvider } from "./components/Money";
import { NecklaceBustIcon } from "./components/NecklaceBustIcon";
import { PushHousekeeping } from "./components/PushHousekeeping";
import { SideDrawer } from "./components/SideDrawer";
import { RATES_KEY, useCached } from "./lib/cache";
import { viewFromHistory, type View } from "./lib/views";
import { AppointmentScreen } from "./screens/AppointmentScreen";
import { CalculatorScreen } from "./screens/CalculatorScreen";
import { ContactScreen } from "./screens/ContactScreen";
import { CustomOrderScreen } from "./screens/CustomOrderScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { PiecesScreen } from "./screens/PiecesScreen";
import { RateScreen } from "./screens/RateScreen";
import { SavedScreen } from "./screens/SavedScreen";
import { SellGoldScreen } from "./screens/SellGoldScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { StoreScreen } from "./screens/StoreScreen";
import { StoryScreen } from "./screens/StoryScreen";

/**
 * The app's own screens, and a door to the rest of the shop.
 *
 * Everything here is bundled in the APK and works with no connection: the
 * board as it was last seen, the calculator that works from it, the pieces
 * already saved, the catalogue as the phone last fetched it, and the shop's
 * own address and hours, which never change and are what somebody needs when
 * nothing will load at all. The forms, the cart and the rest stay on the
 * website, which opens in this same WebView — the back button brings you home.
 *
 * No router: a handful of screens, a tab bar and a drawer do not need one, and
 * a router would put a second idea of what a page is next to the website's.
 * What the screens do borrow is history, because that is what Android's back
 * button actually is — see lib/views.ts.
 */

/** Lucide's icons and the shop's own, standing in the same row. */
type TabIcon = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * The bar is five things, and the drawer is everything else.
 *
 * Not a shortlist of the screens: a shortlist of the reasons somebody opens
 * this app. The front door, today's figure, what is in the cases, what they
 * have already picked out, and the piece they want made — the calculator and
 * the shop's address are needed too, and needed once, so they are in the
 * drawer, which is what a drawer is for.
 *
 * Five across a 360px phone leaves seventy-two pixels a tab. "Custom" is the
 * longest word in the bar and needs about forty-five of them at the house
 * size, which is why it is not "Custom Order".
 */
const TABS: ReadonlyArray<{ id: View; label: string; icon: TabIcon }> = [
  { id: "home", label: "Home", icon: Home },
  { id: "rate", label: "Rates", icon: Gem },
  { id: "pieces", label: "Shop", icon: NecklaceBustIcon },
  { id: "saved", label: "Saved", icon: Heart },
  { id: "custom", label: "Custom", icon: PencilRuler },
];

/** Whether a history entry is one with the drawer open over it. */
function drawerFromHistory(state: unknown): boolean {
  return Boolean((state as { drawer?: unknown } | null | undefined)?.drawer);
}

export function App() {
  /*
   * The screen, read out of the history entry the app is sitting on.
   *
   * Not simply "home": the drawer's website entries are real navigations away,
   * and coming back from one rebuilds this page from scratch. Reading the entry
   * is what returns somebody to the tab they left instead of to the front door.
   */
  const [view, setView] = useState<View>(() => viewFromHistory(window.history.state));

  /*
   * The drawer is a history entry rather than a piece of state, so Android's
   * back button closes it — which is the only thing a back press can mean with
   * a drawer open over the screen. Read from history on mount for the same
   * reason the view is: a tap on "Our story" leaves the app with the drawer
   * open, and coming back should find it where it was left.
   */
  const [drawer, setDrawer] = useState(() => drawerFromHistory(window.history.state));

  /*
   * A collection chosen on the front door, handed to the Shop tab.
   *
   * Held here rather than in PiecesScreen because the screen is unmounted
   * whenever it is not the one on show, and a filter that survives the
   * journey has to be kept above it. Cleared by a tap on the Shop tab, so the
   * tab always means the whole catalogue.
   */
  const [collection, setCollection] = useState<string | null>(null);

  useEffect(() => {
    const onPop = (event: PopStateEvent) => {
      setView(viewFromHistory(event.state));
      setDrawer(drawerFromHistory(event.state));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /**
   * Going to a screen, and leaving a way back to this one.
   *
   * Pushed rather than replaced, which is the whole point: four tabs deep,
   * four back presses walk out the way somebody came in, and only the screen
   * they started on leaves the app.
   */
  const go = (next: View) => {
    if (next === view) return;
    window.history.pushState({ view: next }, "");
    setView(next);
  };

  /**
   * The whole catalogue, with nothing filtered.
   *
   * Every route that offers the catalogue rather than one collection comes
   * through here, and there are four of them: the Shop tab, the front door's
   * own invitation to look, the "see all" above the collections, and "See the
   * pieces" on an empty Saved screen — which is offered there beside the
   * website as the app's own whole catalogue, not as a corner of it.
   *
   * It is a function rather than four copies of two statements because the
   * three that were `go("pieces")` on its own were a silent bug: a collection
   * picked on the front door survives in this state until something clears
   * it, so those buttons offered the whole shop and delivered whatever was
   * last filtered. Nobody reports that. They just stop believing the button.
   *
   * Clearing the value is enough on its own only because PiecesScreen is
   * keyed on it: that screen owns the filter once it is built, so the key is
   * what builds it again.
   */
  const showAllPieces = () => {
    setCollection(null);
    go("pieces");
  };

  /**
   * The drawer, opened and closed through history.
   *
   * The entry names the screen it was opened over, so `viewFromHistory` reads
   * it as that screen and nothing underneath moves. Closing is a back press
   * whichever way it was asked for — the cross, the scrim, or Android's own
   * button — so the three cannot disagree about what is open.
   *
   * Pushed in the handler and not in an effect: an effect runs twice under
   * StrictMode and the unwinding half would pop the entry as it was pushed.
   * The same reasoning as a piece opened over the grid in PiecesScreen.
   */
  const openDrawer = () => {
    window.history.pushState({ view, drawer: true }, "");
    setDrawer(true);
  };

  const closeDrawer = () => {
    if (drawer) window.history.back();
  };

  /**
   * A screen reached from the drawer.
   *
   * Replaced, not pushed, so the drawer's own entry becomes the destination
   * rather than sitting behind it. Pushing would mean a back press from the
   * calculator reopened the drawer over the screen somebody had already left,
   * which is a step backwards into a menu rather than out of one.
   */
  const goFromDrawer = (next: View) => {
    window.history.replaceState({ view: next }, "");
    setDrawer(false);
    setView(next);
  };

  /*
   * A new screen starts at its top.
   *
   * The screens are one document under one scroller, so arriving at a tab
   * inherited wherever the last one had been scrolled to. Reading the rate
   * board to the foot and tapping Shop landed somebody halfway down the
   * grid, under a blank page-end, with no sign that anything was above them —
   * it read as a broken screen rather than as a scroll position.
   *
   * On the view, not inside the handler, so a back press is answered the same
   * way a tab tap is. The screens are short enough that restoring a position
   * on the way back would buy less than the confusion it costs.
   *
   * "instant" spelled out, because the site sets `scroll-behavior: smooth` on
   * html and that is what a bare scrollTo would inherit: a tab tap would scrub
   * the whole height of the screen you just left and then the whole height of
   * the one you arrived at, in front of somebody who asked to be somewhere
   * else. Arriving is not a journey.
   */
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, behavior: "instant" });
    } catch {
      /*
       * WebView below 97 does not know the "instant" enum, and WebIDL rejects
       * an unknown enum rather than ignoring it: this throws there. It would
       * take the app with it — this effect runs on mount, and there is no
       * error boundary above it to catch anything, so the first screen would
       * be a blank one on every launch. minSdkVersion is 24, so those devices
       * are a supported target even though a WebView updated any time since
       * 2022 is fine.
       *
       * The fallback clears the inherited smooth scroll for the length of one
       * jump rather than animating it, so the old WebView arrives the same
       * way the new one does. Restoring the previous value hands the property
       * back to the stylesheet.
       */
      const root = document.documentElement;
      const previous = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      window.scrollTo(0, 0);
      root.style.scrollBehavior = previous;
    }
  }, [view]);

  /**
   * The tab you are already on, tapped again: back to the top.
   *
   * What every phone does, and the only way out of a long screen that does not
   * involve a dozen thumb strokes — the rate board and the catalogue are both
   * taller than a few screens.
   *
   * Smooth here, unlike the arrival above, and for the opposite reason: the
   * content is not changing, so the scroll is the whole of what happened and
   * seeing it is what says the tap was understood. The site turns this off
   * for anyone who has asked for reduced motion, through the html rule.
   */
  const onTab = (next: View) => {
    /*
     * The Shop tab is the whole catalogue, the same as every other route in
     * `showAllPieces`. Cleared here rather than through that function because
     * this is also the one route that can already be on the screen: tapping
     * Shop while standing in a filtered catalogue has to drop the filter, and
     * `go` would refuse the navigation that otherwise does it.
     */
    if (next === "pieces") setCollection(null);

    if (next === view) {
      window.scrollTo({ top: 0 });
      return;
    }
    go(next);
  };

  /*
   * One snapshot, three screens. The front door, the board and the calculator
   * must never show different figures, and fetching twice is how that starts.
   */
  const rates = useCached(RATES_KEY, fetchRateSnapshot);

  return (
    <div className="flex min-h-screen flex-col bg-ivory">
      {/*
        Nothing on screen: the token housekeeping rate alerts need on launch,
        and somewhere for a tapped notification to land. It belongs in the
        shell because the app opens here, on its own screens, and never on the
        website where the same work was already being done.
      */}
      <PushHousekeeping showRates={() => go("rate")} showPieces={showAllPieces} />

      <header className="flex items-center gap-3 border-b border-gold/20 bg-ivory px-4 py-3">
        {/*
          The one control up here. Saved used to be a heart in this corner and
          the website a button beside it; the first is a tab now and the second
          is in the drawer, which leaves the header to say the shop's name and
          offer the way to everything else.
        */}
        <button
          type="button"
          onClick={openDrawer}
          aria-label="Open the menu"
          aria-expanded={drawer}
          className={cn(
            /*
             * 44px square. Android asks for 48dp and WCAG for 44, and this one
             * sits in the corner a thumb reaches across the screen for.
             */
            "-ml-1.5 inline-grid h-11 w-11 shrink-0 place-items-center rounded-full",
            "text-primary transition-colors active:bg-champagne/50",
          )}
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>

        {/*
          The full name, set the way it is on the shopfront and on a bill:
          AL-MADINA over JEWELLERS, the second line smaller and wider. On one
          line at 375px it would take two thirds of the header; the stacked
          lockup says the whole name in the width of half of it.
        */}
        <p className="font-display text-primary uppercase">
          <span className="block text-lg leading-none tracking-[0.2em]">Al-Madina</span>
          <span className="mt-1 block text-[9px] leading-none tracking-[0.42em] text-gold-deep">
            Jewellers
          </span>
        </p>
      </header>

      {/*
        Around the screens and nothing else. Every rupee figure the app prints
        is inside this, and the header, the bar and the drawer print none.
      */}
      <MoneyProvider>
        <main className="flex-1">
          {view === "home" && (
            <HomeScreen
              rates={rates}
              showRates={() => go("rate")}
              showPieces={showAllPieces}
              showCollection={(category) => {
                setCollection(category);
                go("pieces");
              }}
            />
          )}
          {view === "rate" && <RateScreen rates={rates} />}
          {/*
          Keyed on the collection, which is what makes a tap on the Shop tab
          mean the whole catalogue. The chosen collection is PiecesScreen's
          opening state and that screen owns the filter from then on, so
          clearing the value here changes nothing a customer can see until the
          screen is built again — the key is what rebuilds it. Tapping Shop
          while nothing is filtered leaves the key alone, so that tap stays
          what it was: a scroll back to the top.
        */}
          {view === "pieces" && <PiecesScreen key={collection ?? "all"} collection={collection} />}
          {view === "calculator" && <CalculatorScreen rates={rates} />}
          {view === "saved" && <SavedScreen showPieces={showAllPieces} />}
          {view === "store" && <StoreScreen />}
          {view === "custom" && <CustomOrderScreen />}
          {view === "sell" && <SellGoldScreen rates={rates} />}
          {view === "appointment" && <AppointmentScreen />}
          {/*
          Both of these offer a way to the shop's address rather than
          reprinting it. Going by `go` and not `goFromDrawer`: the drawer has
          closed by now, so this is an ordinary move between screens and back
          should return to the one the customer came from.
        */}
          {view === "story" && <StoryScreen showStore={() => go("store")} />}
          {view === "contact" && <ContactScreen showStore={() => go("store")} />}
          {view === "settings" && <SettingsScreen />}
        </main>
      </MoneyProvider>

      <nav
        aria-label="Sections"
        className="sticky bottom-0 grid grid-cols-5 border-t border-gold/25 bg-ivory"
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTab(id)}
            aria-current={view === id ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-1 px-1 py-3 text-[10px] leading-none font-semibold tracking-widest uppercase transition-colors",
              view === id ? "text-gold-deep" : "text-warmgrey",
            )}
          >
            {/* The Saved heart fills while you are looking at what it holds,
                the way it does on every tile in the catalogue. */}
            <Icon
              className={cn("h-5 w-5", id === "saved" && view === "saved" && "fill-current")}
              aria-hidden
            />
            {label}
          </button>
        ))}
      </nav>

      {drawer && <SideDrawer onClose={closeDrawer} onView={goFromDrawer} />}
    </div>
  );
}
