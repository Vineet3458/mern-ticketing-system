# Gmail Nodemailer and IMAP: Production Setup and Troubleshooting

This guide documents the production email diagnosis for the ticketing backend and the configuration needed for outgoing Gmail delivery and inbound ticket replies.

## Diagnosis

Render application logs showed:

- The Gmail Nodemailer transporter initialized, then the first OTP email failed with `Connection timeout`.
- The backend logged `[InboundIMAP] Polling disabled`.
- The Render service is on the Free plan.
- Render's current service environment did not contain `GMAIL_IMAP_ENABLED`.

The timeout happened while opening the SMTP connection, before Gmail could authenticate the account. This points to SMTP connectivity rather than an incorrect-password response. It does not, by itself, prove whether the timeout is caused by the Render network policy, Gmail reachability, or another network issue; the deployed app must be tested after the transport change below.

IMAP was not attempting to connect at all: the feature is gated by `GMAIL_IMAP_ENABLED=true`, and it was disabled in the Blueprint and absent from the live service environment.

## Code and configuration changes

1. Nodemailer now connects explicitly to `smtp.gmail.com:587` with STARTTLS required. This avoids relying on Nodemailer's implicit Gmail service defaults (which use the SMTPS endpoint) and makes the intended SMTP transport explicit.
2. The Render Blueprint now sets `GMAIL_IMAP_ENABLED=true`.
3. The README now links to this guide and explains that IMAP polling requires an always-on backend instance.

No API routes, ticket behavior, message parsing, or email templates were changed. Gmail credentials remain backend-only.

## Gmail account prerequisites

1. Enable 2-Step Verification on the Gmail account used by the backend.
2. Create a Gmail App Password for the backend. Do not use the normal Gmail account password.
3. Confirm IMAP is enabled for the account in Gmail settings.
4. If an App Password or other credential was exposed outside the secret manager, revoke it and create a replacement before continuing.

## Render environment

Set these variables on the **Render backend Web Service**, not in Vercel:

| Variable | Value |
| --- | --- |
| `GMAIL_USER` | Gmail support inbox address |
| `GMAIL_APP_PASSWORD` | The account's Gmail App Password; store as a Render secret |
| `EMAIL_FROM` | A sender label/address authorized for that Gmail account |
| `GMAIL_IMAP_ENABLED` | `true` |
| `GMAIL_IMAP_HOST` | `imap.gmail.com` (optional; this is the code default) |
| `GMAIL_IMAP_PORT` | `993` (optional; this is the code default) |
| `GMAIL_IMAP_POLL_INTERVAL_MS` | `60000` (optional; this is the code default) |

An existing Render service may not automatically receive Blueprint changes until the Blueprint is synced. Check the live Environment page and add or update `GMAIL_IMAP_ENABLED=true` there if necessary. Save the changes and redeploy/restart the backend. Keep the SMTP and IMAP credentials exclusively in Render's environment settings.

The backend connects to Gmail SMTP on TCP port 587 and Gmail IMAP on TCP port 993. Confirm the Render service can make outbound connections to those endpoints. The current logs prove that SMTP previously timed out, but production delivery is not verified until a new email is accepted by Gmail. If port 587 still times out, check Render's current SMTP egress policy or ask Render Support whether this service/plan permits SMTP; changing credentials will not resolve a TCP connection timeout. Do not weaken authentication or switch to an unauthenticated mail transport.

Free Render services can spin down after inactivity. An IMAP poller running in a free web service cannot provide reliable continuous inbox monitoring while the service is spun down. Use an always-on backend plan for dependable inbound polling and continuous Socket.IO availability.

The IMAP poller reads unread mail in the configured Gmail `INBOX`. The existing processing flow marks messages seen after processing, including unrelated messages it ignores because they have no ticket identifier. Use a dedicated support inbox rather than a personal inbox if unrelated unread mail should not be consumed.

## Deploy and verify

1. Deploy the backend changes to Render.
2. Confirm the live service has `GMAIL_IMAP_ENABLED=true`, `GMAIL_USER`, and a valid `GMAIL_APP_PASSWORD`. Never copy secret values into logs, tickets, or frontend settings.
3. In Render logs after startup, confirm the service reports polling `imap.gmail.com:993/INBOX`. If it reports polling disabled or missing credentials, correct the Render environment and restart.
4. Trigger an application email action, such as requesting a login OTP. Confirm the Render log reports a successful Nodemailer send and confirm receipt at the destination. A `Connection timeout` means SMTP is still unreachable; `EAUTH` indicates credentials/account authorization need attention.
5. Reply to an email generated for a ticket. Confirm the reply arrives in the Gmail inbox and is processed into the matching ticket conversation. Inspect Render logs for IMAP connection and message-processing errors if it is not.
6. Test the normal frontend login and ticket flows; email failures must not be treated as successful delivery.

## Current verification status

- **Confirmed from Render logs:** the previous SMTP attempt failed with `Connection timeout`.
- **Confirmed from Render logs:** IMAP polling was disabled.
- **Confirmed after the change:** `GMAIL_IMAP_ENABLED=true` was added to the live Render service, the `a8c6e92` backend deployment completed, and the IMAP poller processed unread messages. The processed messages shown in logs were ignored because they did not contain ticket identifiers.
- **Local automated tests:** the existing focused email and IMAP parsing tests pass.
- **Not yet verified:** a successful SMTP delivery or a real ticket reply imported into its matching conversation. Trigger a fresh email action and reply to a ticket email to verify those end-to-end paths.
- **Manual action required:** verify the Gmail account prerequisites above and confirm the SMTP port 587 connection works from Render by triggering an application email.
