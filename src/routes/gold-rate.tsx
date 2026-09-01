import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * The rate page used to live here, and was indexed here.
 *
 * A rate page earns its traffic from people searching for a rate in a town, so
 * the page moved to a path that says which town. The old address stays as a
 * permanent redirect rather than being deleted: it is in search results, in
 * WhatsApp messages the shop has already sent, and in whatever anyone
 * bookmarked. A 301 hands the ranking to the new address; a 404 would throw it
 * away and greet a customer with an error.
 *
 * There is no component. The redirect is thrown before the route loads, so the
 * server answers with the 301 itself and nothing is ever rendered here.
 */
export const Route = createFileRoute("/gold-rate")({
  beforeLoad: () => {
    throw redirect({
      to: "/gold-rate-in-mandi-bahauddin-today",
      statusCode: 301,
    });
  },
});
