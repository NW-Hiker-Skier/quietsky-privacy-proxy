> Canonical policy: https://getquietsky.app/Privacy. This copy mirrors the published policy.

Privacy

# Privacy Policy

No accounts. No analytics SDKs in the mobile applications. No behavioral trackers. No server that stores anything about you. This policy is long because the alternative is vague — and vague privacy policies are how apps lie.

**Last updated** October 27, 2026  
**App** Quiet Sky (Android: `app.getquietsky.android`; iPhone: `app.getquietsky.ios`)  
**Publisher** Quiet Sky LLC, Spokane, WA, USA  
**Contact** [support@getquietsky.app](mailto:support@getquietsky.app)

---

## The one-paragraph version

Quiet Sky's mobile applications have no user accounts, no analytics SDKs, no crash-reporting SDKs, no advertising IDs, no third-party trackers, and no server-side database of records tied to you. The app talks to weather, air-quality, sunset-quality, build-status, severe-alert, and geocoding APIs through a proxy we operate on Cloudflare Workers. The proxy forwards the minimum route data needed for each request and does not log requests to durable storage. Quiet Sky uses precise location when you allow it, because accurate forecasts and nowcasts need it. The weather providers receive the coordinates needed to compute your forecast, but never anything that identifies you. The proxy strips your IP, device, and identity before the request reaches any provider (see Section 2). Upstream APIs receive the Worker's IP, not yours. Your saved locations and recent request receipts live only on your device. You can lower forecast location precision in Settings. We have no account system and no way to identify you, and **we do not sell or share your personal information**. The base map is served first-party from our own Cloudflare storage, and radar imagery is routed through the proxy as well, so map and radar traffic does not expose your IP or identity to a third-party map provider (see Section 3).

## 1. What data the app collects on your device

| Data | Source | Stored where | Sent anywhere? |
| --- | --- | --- | --- |
| Current location | Android or iPhone location permission, if you allow it | On your device as "Current location" | Coordinates sent through the proxy at your selected precision to weather APIs and, when a location label is needed, Geoapify (§3). |
| Locations you add | You type them or pick from search | On your device, app-private storage | Coordinates sent to weather APIs (§3). Saved display names are not sent with forecast requests; location-search text is sent only when you search. |
| Provider preference | Your selection in Settings | On your device | No |
| Theme preference | Your selection in Settings | On your device | No |
| Forecast cache | Returned by the API for a location you asked about | On your device | No |
| Recent request receipts | Created as the app makes service requests | On your device, app-private storage; deleted after about 7 days | No additional transmission |

**No personal information is collected.** Quiet Sky does not ask for personal information such as your name, email, phone number, or date of birth. There are no accounts, no sign-in, and no way to "log in."

Quiet Sky requests Android or iPhone location permission *only* when you ask for local weather. On Android 12+ you can choose Precise or Approximate in the system prompt. On iPhone, you can turn Precise Location on or off in the location permission settings. Quiet Sky defaults forecast requests to full precision for nowcast accuracy, and lets you lower precision to Neighborhood or Coarse in Settings. It does not run background location tracking.

## 2. What data we collect on our server

We operate a Cloudflare Worker at `api.getquietsky.app` that the app uses as a proxy between your device and upstream weather APIs. The proxy exists for three concrete reasons: (a) so we can swap providers without shipping a new APK or iPhone app update, (b) so upstream API keys are not embedded in the client, and (c) so upstream APIs see Cloudflare's IP and not yours.

**The proxy does not log requests to durable storage.** Cloudflare's edge nodes write short-lived operational logs (retained about 7 days for platform operations and abuse prevention). We do not enable Logpush, write request logs to a database, or keep an analytics view of your requests. We do not keep a user-linked history of what your device asked for.

**The proxy does not associate requests with users**, because there is no user identity to associate them with. There is no per-user or per-device API key, no cookie, and no fingerprint. Release builds may send a shared app access token so the app can talk to the Quiet Sky proxy; that token is not unique to you or your device and is not sent to weather providers.

What the proxy briefly handles while processing a request:

- The latitude/longitude you asked about for weather, AQI, and sunset-quality routes.

- The search text you typed for the location-search route.

- The type of data requested (forecast, hourly, AQI anchor, sunset quality, build status, severe alerts, place lookup).

- The HTTP headers your device sends. The proxy does not forward your device's User-Agent to providers; upstream requests carry only a generic proxy header and the provider API key.

- Your IP address, because Cloudflare's edge needs it to route the response. Quiet Sky does not log or forward your IP address to weather providers. If abuse rate limiting is enabled, the Worker may use the IP address as a short-lived rate-limit key inside Cloudflare; it is not written to request logs, stored in a user profile, or sent to upstream providers.

For location labels, the proxy stores place names and the selected-precision coordinates associated with them. These location-name mappings contain no user, device, IP, or advertising identifier and may be stored indefinitely.

What the proxy does *not* see, ever:

- The names of locations you've saved on your device.

- Your other locations (each request is for one lat/lon at a time).

- Any identifier that could be tied to your device or account across requests.

## 3. Third-party services and what they see

Quiet Sky uses these upstream APIs. Weather, air-quality, sunset-quality, build-status, severe-alert, and location-search requests go through our Cloudflare Worker proxy, so those upstream APIs receive our Worker's Cloudflare IP, not yours. The base map is served first-party from our own Cloudflare R2 storage, so no third-party map provider receives your requests, and radar tile imagery is routed through the proxy. The map and radar providers and the proxied radar-tile path are listed below.

| Upstream | What they receive per request | Privacy policy |
| --- | --- | --- |
| Open-Meteo | Coordinates, location search text, and weather, air-quality, and geocoding request parameters, via the Quiet Sky proxy. | [terms & privacy](https://open-meteo.com/en/terms) |
| Geoapify | Receives coordinates through the Quiet Sky proxy at your selected precision to help look up the location label name. Geoapify receives the proxy IP, not your device IP or any user, device, or advertising identifier. | [privacy](https://www.geoapify.com/privacy-policy/) |
| Foreca | Coordinates and forecast or severe-alert request parameters, via the Quiet Sky proxy. | [privacy](https://www.foreca.com/privacy-policy.html) |
| Pirate Weather | Coordinates and forecast or severe-alert request parameters, via the Quiet Sky proxy. | [terms](https://pirate-weather.apiable.io/terms) / [docs](https://pirateweather.net/en/latest/) |
| Rainbow.ai | Coordinates and forecast request parameters, via the Quiet Sky proxy. | [privacy](https://rainbow.ai/privacy-policy) |
| SunsetHue | Broad location bucket and local date, via the Quiet Sky proxy. | [privacy](https://sunsethue.com/privacy) |
| RainViewer | Coordinates and radar tile request parameters, via the Quiet Sky proxy. | [privacy](https://www.rainviewer.com/privacy.html) |
| Protomaps / first-party basemap | First-party basemap styles and tiles served by Quiet Sky from Cloudflare R2/CDN. | First-party — covered by [this policy](https://getquietsky.app/Privacy) |
| Cloudflare | Quiet Sky proxy, cache, and first-party map infrastructure used to route and serve app requests. | [privacy](https://www.cloudflare.com/privacypolicy/) |

**Quiet Sky's mobile applications do not embed Firebase, Google Analytics, Crashlytics, Mixpanel, Amplitude, Sentry, Bugsnag, Adjust, AppsFlyer, the Facebook SDK, ironSource, Mintegral, Pangle, Unity Ads, AdMob, or any other analytics, attribution, or advertising SDK.** Inspect the APK if you like — `classes.dex` will not contain any of those packages. The iPhone app bundle likewise contains none of those SDKs.

## Website analytics

The public Quiet Sky website uses Cloudflare Web Analytics for basic page-view, traffic, and performance measurement. This website measurement is not built into Quiet Sky's mobile applications. The website does not use Google Analytics, advertising analytics, cross-site behavioral tracking, or third-party marketing trackers. Cloudflare states that Web Analytics does not use client-side state, such as cookies or local storage, to collect usage metrics and does not fingerprint individuals via IP address, user-agent string, or other data for analytics reporting. Cloudflare also processes ordinary network and operational information as the website's hosting, security, and delivery provider under its own privacy policy.

## 4. Permissions the app requests

| Permission | Used for | Required? |
| --- | --- | --- |
| `ACCESS_FINE_LOCATION` | Precise current-location forecasts, nowcast accuracy, and location labels. Coordinates go only to weather providers and Geoapify through our proxy, which strips your IP, device, and identity first. | Optional — choose Approximate at the Android prompt, turn off Precise Location on iPhone, or search for a place instead. |
| `ACCESS_COARSE_LOCATION` | Filling the first forecast and location label from your approximate current location. | Optional — deny it and search for a place instead. |
| `POST_NOTIFICATIONS` | Severe-weather alerts and daily summaries. Both off by default. | Optional — deny it and the app still works. |
| `ACCESS_NETWORK_STATE` | Checking whether you're online before making a request. | Yes, on Android only — used to avoid failed requests when offline. |
| `INTERNET` | Talking to the Quiet Sky proxy and first-party map infrastructure. | Yes, on Android only — denying it means no weather or map data. |
| `RECEIVE_BOOT_COMPLETED` | Rescheduling background refresh after reboot. | Yes, on Android only. No network activity at boot itself. |

Quiet Sky does **not** request contacts, calendar, microphone, camera, SMS, phone, storage outside its own private directory, Bluetooth, NFC, USB, or any "special" permissions like `SYSTEM_ALERT_WINDOW` or accessibility services. It requests precise location (`ACCESS_FINE_LOCATION` on Android or Precise Location with When In Use access on iPhone) only for forecast accuracy, and the proxy strips your IP, device, and identity before any request reaches a provider.

## 5. Billing

If you subscribe to Quiet Sky, the transaction is handled entirely by the Google Play Billing Library on Android or Apple's StoreKit on iPhone. We do not see your payment method. Google tells us "this purchase token belongs to an active subscription"; we cache that locally on your device. On iPhone, StoreKit provides a verified subscription entitlement, which we also cache locally on your device. We do not get your name, email, billing address, or last four digits.

We do not currently operate a backend that records subscription state, so validation is done client-side against Google Play on Android or Apple's StoreKit on iPhone. If you uninstall and reinstall, the Play Billing Library restores your entitlement from Google's record on Android; on iPhone, StoreKit restores it from Apple's record.

## 6. Children

Quiet Sky is not directed at children under 13. We do not knowingly collect data from anyone — including children — because we don't have a backend that collects data.

## 7. Data retention

- **Server side:** Quiet Sky does not log requests to durable storage and does not store user-linked request histories or profiles. Cloudflare's edge logs follow Cloudflare's own policy, currently about 7 days for platform operations and abuse prevention.

- **Device side:** Your saved locations, preferences, and last-known forecast cache stay on your device until you clear app data or uninstall. Recent request receipts remain in device app-private storage for about 7 days before automatic deletion.

## 8. Your rights under GDPR / CCPA

**Data controller.** Quiet Sky is operated by Quiet Sky LLC (Spokane, WA, USA), reachable at [support@getquietsky.app](mailto:support@getquietsky.app). Because the app keeps no server-side records tied to you, there is no centralized profile to administer.

The "right to know what we have on you" and "right to delete" both resolve trivially: we don't have anything on you to know about or to delete. There is no server-side record tied to you.

**No sale or sharing of personal information.** We do not sell your personal information, and we do not "share" it for cross-context behavioral advertising, as those terms are defined under the California Consumer Privacy Act (CCPA/CPRA). We have never done so and have no mechanism to. Because we do not sell or share personal information, no "Do Not Sell or Share My Personal Information" action is needed.

To clear what's on your device: on Android, Settings → Apps → Quiet Sky → Storage → Clear data. On iPhone, delete Quiet Sky to remove its app data. To be sure the proxy never sees you again: stop using the app. There is no account to close.

## 9. Security

Network traffic is HTTPS only. The app trusts the standard system certificate store. Local storage uses Android's standard app-sandbox protection; we don't currently encrypt the local DataStore with a user-derived key (it's protected by Android's userdata-partition encryption, the platform default). On iPhone, local storage uses iOS's standard app-sandbox protection.

## 10. Changes to this policy

If we change this policy, the new version replaces this one at the same URL and the effective date updates. If a change materially expands what data flows where, we'll note it in the app's "What's new" release notes for that version.

## 11. Things we'd rather be honest about

- **No Tor mode.** Your ISP can see that you're talking to `api.getquietsky.app`, just not what's inside the HTTPS request.

- **We don't claim to be GDPR/CCPA "compliant" as a marketing checkmark.** We designed around not collecting data.

- **Cloudflare is a US company** subject to US legal process. Quiet Sky does not keep user-linked request logs to hand over. Cloudflare's short-lived edge logs are subject to Cloudflare's own legal-process handling, not ours.

- **The privacy core of the Quiet Sky proxy is open source.** You do not have to take our word for the identity-stripping claim — the public repo shows the proxy boundary and includes runnable privacy-invariant tests: [github.com/NW-Hiker-Skier/quietsky-privacy-proxy](https://github.com/NW-Hiker-Skier/quietsky-privacy-proxy). Provider-specific integration recipes and API credentials are withheld, but the privacy-relevant proxy core is public.

- **The proxy proxies.** It is not a VPN, Tor, or a mixnet — it's an HTTPS forwarder that terminates your IP at Cloudflare rather than at the upstream API.

## 12. Contact

Quiet Sky LLC — [support@getquietsky.app](mailto:support@getquietsky.app). If you find a bug, a security issue, or something this policy says that turns out not to be accurate, please email and I'll respond.
