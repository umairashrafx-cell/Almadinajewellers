/**
 * Firebase Cloud Messaging, the little of it this shop needs.
 *
 * One notification a day to a few hundred phones. That does not justify a
 * dependency: the HTTP v1 API is two requests — swap a signed assertion for an
 * access token, then post a message per device — and Deno already has the
 * crypto to sign the first one.
 *
 * FCM_SERVICE_ACCOUNT_JSON is the whole service account file from the Firebase
 * console, as a single secret. It is a private key: it belongs in
 * `supabase secrets set`, never in this repository.
 */

// deno-lint-ignore-file no-explicit-any
declare const Deno: { env: { get(key: string): string | undefined } };

export type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
};

/** What became of one message. Dead means the app is gone from that phone. */
export type Delivery = "sent" | "dead" | "failed";

export function readServiceAccount(): ServiceAccount | null {
  const raw = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ServiceAccount;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      throw new Error("missing project_id, client_email or private_key");
    }
    return parsed;
  } catch (error) {
    console.error("fcm: FCM_SERVICE_ACCOUNT_JSON is not a usable service account:", error);
    return null;
  }
}

function base64url(bytes: Uint8Array | string): string {
  const binary = typeof bytes === "string" ? bytes : String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** The PEM body, decoded. importKey wants the DER bytes, not the armour. */
function pkcs8(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/*
 * Google's token is good for an hour. The function instance usually outlives a
 * single morning's send, so it is kept rather than bought again per message,
 * with a minute's grace so a token never expires mid-run.
 */
let cached: { token: string; expiresAt: number } | null = null;

/*
 * The one being bought right now, if one is. The morning's send goes out in
 * batches of eight at a time, and on the first batch the cache is empty for
 * all eight of them — so without this they would each sign their own assertion
 * and ask Google for their own token, seven of which are thrown away a moment
 * later. Waiting on the promise, not the token, makes that one request.
 */
let buying: Promise<string> | null = null;

export async function accessToken(account: ServiceAccount): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
  if (buying) return buying;

  buying = mint(account).finally(() => {
    buying = null;
  });

  return buying;
}

async function mint(account: ServiceAccount): Promise<string> {
  const tokenUri = account.token_uri ?? "https://oauth2.googleapis.com/token";
  const issued = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: tokenUri,
      iat: issued,
      exp: issued + 3600,
    }),
  );

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8(account.private_key).buffer as ArrayBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${claims}`),
  );

  const assertion = `${header}.${claims}.${base64url(new Uint8Array(signature))}`;

  const response = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`google token endpoint responded ${response.status}: ${await response.text()}`);
  }

  const body = (await response.json()) as { access_token: string; expires_in: number };
  cached = { token: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return body.access_token;
}

export type Notification = {
  title: string;
  body: string;
  /** The page to open when the notification is tapped, e.g. "/gold-rate". */
  path: string;
  /** The Android channel the app created. Decides the sound and the heading. */
  channelId: string;
};

/**
 * One message to one phone.
 *
 * Returns "dead" when Google says the app is no longer on that device —
 * uninstalled, or the token reissued — which is the caller's cue to forget it.
 * Everything else that goes wrong is logged and reported as "failed": a
 * morning's notification is not worth retrying into a rate limit.
 */
export async function send(
  account: ServiceAccount,
  token: string,
  notification: Notification,
): Promise<Delivery> {
  const bearer = await accessToken(account);

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: notification.title, body: notification.body },
          // Read by the app when the notification is tapped.
          data: { path: notification.path },
          android: {
            // The rate is only news for as long as it is the day's rate.
            priority: "high",
            ttl: "43200s",
            notification: {
              channel_id: notification.channelId,
              // A notification about the morning's rate replaces yesterday's
              // rather than stacking beneath it.
              tag: "gold-rate",
            },
          },
        },
      }),
    },
  );

  if (response.ok) return "sent";

  const text = await response.text();
  const code = errorCode(text);

  /*
   * Only the two answers that are about this token: UNREGISTERED, the app is
   * gone from that phone; SENDER_ID_MISMATCH, the token belongs to another
   * Firebase project and this one will never reach it.
   *
   * Read from the error body rather than the status code, because the status
   * codes are shared with answers about us. A 403 is also what Google says
   * when the service account is wrong or Cloud Messaging is not enabled — and
   * that answer comes back for every phone at once, so trusting the code alone
   * would turn one setup mistake into an emptied subscriber list. The same
   * goes for INVALID_ARGUMENT, which means either a bad token or a message we
   * built wrongly, and is not worth deleting anyone over.
   */
  if (code === "UNREGISTERED" || code === "SENDER_ID_MISMATCH") return "dead";
  if (response.status === 404 && !code) return "dead";

  console.error(`fcm: send failed with ${response.status}: ${text}`);
  return "failed";
}

/**
 * The FcmError code from an error body, which is what says whose fault it is.
 *
 * Google answers with { error: { status, details: [{ errorCode }] } }. The
 * detail is the specific one; error.status is the general one, and stands in
 * when there is no detail.
 */
function errorCode(text: string): string | undefined {
  try {
    const body = JSON.parse(text) as {
      error?: { status?: string; details?: Array<{ errorCode?: string }> };
    };
    const detailed = body.error?.details?.find((detail) => detail.errorCode);
    return detailed?.errorCode ?? body.error?.status;
  } catch {
    return undefined;
  }
}
