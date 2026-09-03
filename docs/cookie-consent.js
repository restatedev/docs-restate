const COMMON_ROOM_URL =
  "https://cdn.cr-relay.com/v1/site/c63d3c5e-80ca-48f9-ba3a-a476008f8932/signals.js";

const loadCommonRoom = () => {
  if (typeof window.signals !== "undefined") return;
  window.signals = Object.assign(
    [],
    ["page", "identify", "form"].reduce(function (acc, method) {
      acc[method] = function () {
        window.signals.push([method, arguments]);
        return window.signals;
      };
      return acc;
    }, {}),
  );

  if (document.querySelector(`script[src="${COMMON_ROOM_URL}"]`)) return;
  const script = document.createElement("script");
  script.src = COMMON_ROOM_URL;
  script.async = true;
  document.head.appendChild(script);
};

(() => {
  const COOKIE_NAME = "cc_cookie";
  const SHARED_DOMAIN = window.location.hostname.endsWith("restate.dev")
    ? ".restate.dev"
    : window.location.hostname;
  const REVISION = 3; // must match main site revision
  const CDN = "https://cdn.jsdelivr.net/npm/vanilla-cookieconsent@3.1.0/dist/";

  const MINTLIFY_TELEMETRY = true;
  const LS_KEY = "restate_cookie_consent";
  const LS_VALUE = "granted";

  const getCookie = (name) => {
    const match = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${name}=([^;]*)`),
    );
    return match ? decodeURIComponent(match[1]) : null;
  };

  // { analytics, marketing } or null when the visitor hasn't answered yet
  const storedDecision = () => {
    const raw = getCookie(COOKIE_NAME);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.revision !== REVISION) return null; // stale consent, re-ask
      const categories = Array.isArray(parsed.categories)
        ? parsed.categories
        : [];
      return {
        analytics: categories.includes("analytics"),
        marketing: categories.includes("marketing"),
      };
    } catch {
      return null;
    }
  };

  const pushConsent = ({ analytics, marketing }) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "consent_update",
      consent_analytics: analytics ? "granted" : "denied",
      consent_marketing: marketing ? "granted" : "denied",
      consent_functional: "denied", // no functional category on this site
    });
  };

  // Mintlify reads this localStorage key to decide whether to run its own telemetry. mirrored since localStorage can't cross subdomains
  const mirror = (accepted) => {
    if (!MINTLIFY_TELEMETRY) return;
    try {
      if (accepted) localStorage.setItem(LS_KEY, LS_VALUE);
      else localStorage.removeItem(LS_KEY);
    } catch {
      // private mode / storage blocked, Mintlify treats as no consent
    }
  };

  const decision = storedDecision();

  // Already answered on restate.dev
  if (decision) {
    pushConsent(decision);
    mirror(decision.analytics);
  }

  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = `${CDN}cookieconsent.css`;
  document.head.appendChild(css);

  const script = document.createElement("script");
  script.src = `${CDN}cookieconsent.umd.js`;
  script.async = true;

  script.onload = () => {
    const CC = window.CookieConsent;

    const sync = () => {
      const analytics = CC.acceptedCategory("analytics");
      const marketing = CC.acceptedCategory("marketing");

      let alreadyMirrored = false;
      try {
        alreadyMirrored = localStorage.getItem(LS_KEY) === LS_VALUE;
      } catch {
        // storage blocked
      }

      pushConsent({ analytics, marketing });
      mirror(analytics);
    };

    CC.run({
      root: "body",
      autoShow: true,
      mode: "opt-in",
      revision: REVISION,

      cookie: {
        name: COOKIE_NAME,
        domain: SHARED_DOMAIN,
        path: "/",
        sameSite: "Lax",
        expiresAfterDays: 365,
      },

      guiOptions: {
        consentModal: {
          layout: "box",
          position: "bottom right",
          equalWeightButtons: true,
          flipButtons: false,
        },
      },

      onConsent: () => {
        sync();

        // Erase cookies if consent declined on restate.dev after accepting here
        if (!CC.acceptedCategory("analytics")) {
          window._paq = window._paq || [];
          window._paq.push(["forgetCookieConsentGiven"]);
          CC.eraseCookies([/^signals-/, /^_li_/, /^_lc2_/, /^_pk_/]);
        }
        if (!CC.acceptedCategory("marketing")) {
          CC.eraseCookies([/^_ga/, /^_gcl/]);
        }
      },
      onChange: sync,

      // Category and service names must match the main site
      categories: {
        necessary: { enabled: true, readOnly: true },
        analytics: {
          autoClear: {
            cookies: [
              { name: /^signals-/ }, // Common Room
              { name: /^_pk_/ }, // Matomo
              { name: /^_li_/ }, // LiveConnect (Vector)
              { name: /^_lc2_/ }, // LiveConnect first-party ID
            ],
          },
          services: {
            matomo: {
              label: "Matomo Analytics",
              onAccept: () => {
                window._paq = window._paq || [];
                window._paq.push(["rememberCookieConsentGiven", 8760]);
              },
              onReject: () => {
                window._paq = window._paq || [];
                window._paq.push(["forgetCookieConsentGiven"]);
              },
            },
            commonRoom: {
              label: "Common Room",
              onAccept: () => {
                try {
                  loadCommonRoom();
                } catch (error) {
                  console.error(error);
                }
              },
              onReject: () => {
                // console.log("Common Room script rejected");
              },
            },
          },
        },
        marketing: {
          autoClear: {
            cookies: [{ name: /^_ga/ }, { name: /^_gcl/ }],
          },
        },
      },

      language: {
        default: "en",
        translations: {
          en: {
            consentModal: {
              title: "We use cookies",
              description:
                "We use analytics to understand how our site is used. Until you accept, we store nothing on your device and use no identifiers; we may collect anonymous, aggregated signals that can't identify you. Accept to enable full analytics. You can change your choice at any time.",
              acceptAllBtn: "Accept",
              acceptNecessaryBtn: "Reject",
              showPreferencesBtn: "Manage preferences",
              footer:
                '<a href="https://restate.dev/privacy" target="_blank">Privacy Policy</a>',
            },
            preferencesModal: {
              title: "Manage cookie preferences",
              acceptAllBtn: "Accept all",
              acceptNecessaryBtn: "Reject all",
              savePreferencesBtn: "Accept current selection",
              closeIconLabel: "Close modal",
              sections: [
                {
                  title: "Strictly necessary",
                  description:
                    "Required for the site to function. These cannot be disabled.",
                  linkedCategory: "necessary",
                },
                {
                  title: "Performance and Analytics",
                  description:
                    "Matomo Analytics and Common Room collect information about how you use our website. Common Room also loads the Vector pixel for visitor identification.",
                  linkedCategory: "analytics",
                },
                {
                  title: "Marketing",
                  description:
                    "Google Tag Manager runs Google Ads measurement. It loads on every page but stores nothing on your device and sends no identifiers until you accept.",
                  linkedCategory: "marketing",
                },
              ],
            },
          },
        },
      },
    });
  };

  document.head.appendChild(script);
})();
