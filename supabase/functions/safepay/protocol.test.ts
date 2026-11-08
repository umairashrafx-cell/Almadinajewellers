import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  apiHost,
  checkoutUrl,
  envFromSecret,
  outcomeOf,
  toPaisa,
  verifyWebhook,
} from "./protocol.ts";

/**
 * These tests exist for the three mistakes that would not announce themselves.
 *
 * A wrong production host works all through testing and fails only on live
 * customers. A hundredfold amount error produces a payment that looks
 * plausible. A signature check that is merely present rather than correct
 * leaves the "mark this order paid" endpoint open to anyone who finds it.
 */

describe("checkout hosts", () => {
  it("sends live customers to getsafepay.com, not api.getsafepay.com", () => {
    // The asymmetry worth a test of its own: the live checkout page is not
    // under api., although the live REST API and the sandbox checkout both are.
    // Safepay's guide shows only the sandbox URL, so the obvious guess is wrong.
    expect(checkoutUrl({ env: "production", tracker: "track_1", tbt: "t" })).toContain(
      "https://getsafepay.com/embedded/?",
    );
    expect(checkoutUrl({ env: "sandbox", tracker: "track_1", tbt: "t" })).toContain(
      "https://sandbox.api.getsafepay.com/embedded/?",
    );

    expect(apiHost("production")).toBe("https://api.getsafepay.com");
    expect(apiHost("sandbox")).toBe("https://sandbox.api.getsafepay.com");
  });

  it("treats anything but an explicit live setting as the sandbox", () => {
    expect(envFromSecret("live")).toBe("production");
    expect(envFromSecret("production")).toBe("production");
    // A typo, a blank, or someone writing "Live" must not charge a real card.
    expect(envFromSecret(undefined)).toBe("sandbox");
    expect(envFromSecret("")).toBe("sandbox");
    expect(envFromSecret("Live")).toBe("sandbox");
    expect(envFromSecret("staging")).toBe("sandbox");
  });
});

describe("checkoutUrl", () => {
  const url = checkoutUrl({
    env: "sandbox",
    tracker: "track_4f7d7e2d",
    tbt: "xnTyRgITVcHlyeKT2cf59",
    source: "hosted",
    order_id: "AMJ-2611-0001-A1B2C3",
    redirect_url: "https://www.almadinajeweller.com/pay/tok?state=returned",
    cancel_url: "https://www.almadinajeweller.com/pay/tok?state=failed",
  });
  const params = new URL(url).searchParams;

  it("carries everything the hosted page needs", () => {
    expect(params.get("environment")).toBe("sandbox");
    expect(params.get("tracker")).toBe("track_4f7d7e2d");
    expect(params.get("tbt")).toBe("xnTyRgITVcHlyeKT2cf59");
    expect(params.get("source")).toBe("hosted");
    expect(params.get("order_id")).toBe("AMJ-2611-0001-A1B2C3");
  });

  it("encodes the return URLs so their own query survives the round trip", () => {
    // These URLs contain ?state=…, which would otherwise be read as a
    // parameter of the checkout URL rather than part of where to return to.
    expect(params.get("redirect_url")).toBe(
      "https://www.almadinajeweller.com/pay/tok?state=returned",
    );
    expect(params.get("cancel_url")).toBe("https://www.almadinajeweller.com/pay/tok?state=failed");
    expect(url).toContain("state%3Dreturned");
  });

  it("drops what was not given rather than sending it empty", () => {
    const bare = checkoutUrl({ env: "sandbox", tracker: "track_1", tbt: "t" });
    expect(bare).not.toContain("user_id");
    expect(bare).not.toContain("redirect_url");
    expect(bare).not.toContain("undefined");
  });
});

describe("toPaisa", () => {
  it("multiplies by a hundred", () => {
    expect(toPaisa(6000)).toBe(600000);
    expect(toPaisa(1)).toBe(100);
    expect(toPaisa(744175)).toBe(74417500);
  });

  it("refuses anything that is not a whole number of rupees above zero", () => {
    // amount_due_pkr is an integer column, so a fraction here means something
    // upstream is wrong, and sending it would quietly round at Safepay's end.
    expect(() => toPaisa(0)).toThrow();
    expect(() => toPaisa(-5000)).toThrow();
    expect(() => toPaisa(99.5)).toThrow();
    expect(() => toPaisa(Number.NaN)).toThrow();
  });
});

describe("verifyWebhook", () => {
  const secret = "whsec_abc123";
  const body = JSON.stringify({ type: "payment.succeeded", data: { tracker: "track_1" } });
  const good = createHmac("sha512", secret).update(body).digest("hex");

  it("accepts a correct signature", async () => {
    await expect(verifyWebhook(body, good, secret)).resolves.toBe(true);
  });

  it("accepts the same signature in upper case", async () => {
    await expect(verifyWebhook(body, good.toUpperCase(), secret)).resolves.toBe(true);
  });

  it("refuses a body that was altered after signing", async () => {
    const tampered = JSON.stringify({ type: "payment.succeeded", data: { tracker: "track_2" } });
    await expect(verifyWebhook(tampered, good, secret)).resolves.toBe(false);
  });

  it("refuses the wrong secret, which is what going live with sandbox keys looks like", async () => {
    const other = createHmac("sha512", "whsec_sandbox").update(body).digest("hex");
    await expect(verifyWebhook(body, other, secret)).resolves.toBe(false);
  });

  it("refuses a missing signature or a missing secret", async () => {
    await expect(verifyWebhook(body, null, secret)).resolves.toBe(false);
    await expect(verifyWebhook(body, "", secret)).resolves.toBe(false);
    await expect(verifyWebhook(body, good, "")).resolves.toBe(false);
  });

  it("is not fooled by a signature of the wrong length", async () => {
    await expect(verifyWebhook(body, good.slice(0, 32), secret)).resolves.toBe(false);
    await expect(verifyWebhook(body, `${good}00`, secret)).resolves.toBe(false);
  });

  it("uses SHA-512, not SHA-256", async () => {
    const sha256 = createHmac("sha256", secret).update(body).digest("hex");
    await expect(verifyWebhook(body, sha256, secret)).resolves.toBe(false);
    expect(good).toHaveLength(128);
  });
});

describe("outcomeOf", () => {
  // Shaped on the published example payloads in Safepay's webhook guide.
  const succeeded = {
    type: "payment.succeeded",
    data: {
      tracker: "track_06ee38cb",
      amount: 45000,
      currency: "PKR",
      net: 43525,
      fee: 1475,
      state: "TRACKER_ENDED",
      metadata: { order_id: "AMJ-2611-0001-A1B2C3", source: "almadinajeweller.com" },
    },
  };

  it("reads a capture, with the amount and our own reference", () => {
    expect(outcomeOf(succeeded)).toEqual({
      kind: "paid",
      attemptRef: "AMJ-2611-0001-A1B2C3",
      amountPaisa: 45000,
      tracker: "track_06ee38cb",
    });
  });

  it("reads a failure, keeping the reason the shop will be asked about", () => {
    const outcome = outcomeOf({
      type: "payment.failed",
      data: {
        tracker: "track_138cf593",
        category: "PAYMENT_METHOD_ERROR",
        code: 403,
        message: "The card you have used has been flagged as either stolen or lost. ",
        metadata: { order_id: "AMJ-2611-0001-A1B2C3" },
      },
    });

    expect(outcome.kind).toBe("failed");
    expect(outcome).toMatchObject({ attemptRef: "AMJ-2611-0001-A1B2C3", code: "403" });
    expect(outcome.kind === "failed" && outcome.reason).toContain("stolen or lost");
  });

  it("ignores the events this shop settles at the counter", () => {
    // A refund that silently un-paid an order would be worse than one a person
    // notices, so these are acknowledged and logged, never acted on.
    for (const type of [
      "payment.refunded",
      "authorization.succeeded",
      "authorization.reversed",
      "void.succeeded",
      "subscription.created",
      "something.safepay.added.later",
    ]) {
      expect(outcomeOf({ type, data: { metadata: { order_id: "AMJ-1" } } }).kind).toBe("ignored");
    }
  });

  it("ignores an event it could not tie to an order", () => {
    expect(outcomeOf({ type: "payment.succeeded", data: { amount: 45000 } }).kind).toBe("ignored");
    expect(outcomeOf({ type: "payment.succeeded", data: { metadata: {} } }).kind).toBe("ignored");
    expect(outcomeOf({}).kind).toBe("ignored");
  });
});
