# Gmail Email via Google Apps Script

This project can use a Google Apps Script web app to send ticket and OTP emails through Gmail and a scheduled Apps Script trigger to poll inbound ticket replies. This avoids Render's previous Nodemailer SMTP connection timeout and avoids needing Render to maintain a long-running IMAP poller.

## Confirmed diagnosis

Render logs showed the Gmail Nodemailer transporter initialized, but an OTP email failed with `Connection timeout`. The error occurred while connecting to SMTP, before Gmail authentication. The same logs showed IMAP polling disabled, so inbound messages were not being checked by the backend. The Render service runs on the Free plan.

The code now supports an Apps Script email provider. The Apps Script deployment and Google account authorization still have to be completed by the account owner before production email can be verified.

## How the integration works

- The backend's existing email queue keeps building the current ticket and OTP templates.
- When `EMAIL_PROVIDER=apps_script`, the backend sends the rendered HTML to the configured Apps Script web app with a shared secret. The Apps Script runs as the Gmail account owner and sends with `GmailApp`.
- An Apps Script time-based trigger checks unread messages in the Gmail inbox every minute. It forwards the sender, message ID, subject, and plain-text reply to the existing backend inbound-email processor.
- The new `/api/email/inbound/apps-script` endpoint checks the shared secret before forwarding a message to the existing authorization and ticket matching code. Existing rules still require that the email sender is the ticket requester or assigned agent.
- The Apps Script poller marks a message read only after the backend processes it or deliberately rejects/ignores it. Transient backend errors leave the message unread for retry.
- Apps Script mode disables the backend's separate IMAP poller to avoid concurrent inbox consumers.
- The backend queue retries failed provider calls before marking the queued job as failed.

The public Apps Script web app URL is not sufficient to send or process mail by itself: both sides must have the same strong secret, and Apps Script must be authorized to send and read Gmail.

## Deploy the Apps Script

1. Sign in to the Google account that owns the support inbox and open [Google Apps Script](https://script.google.com/).
2. Use the existing `code.gs` project if available, and replace its code with [`apps-script/Code.gs`](../apps-script/Code.gs) from this repository. The code remains compatible with the legacy `EMAIL_API_SECRET` Script Property as well as `APPS_SCRIPT_SECRET`.
3. In **Project Settings → Script Properties**, add:

   | Property | Value |
   | --- | --- |
   | `BACKEND_API_URL` | `https://mern-ticketing-system-qqpf.onrender.com` (origin only, no `/api`) |
   | `APPS_SCRIPT_SECRET` | A strong random secret you generate and keep private |

   Generate a secret locally, for example with Node.js:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   Do not paste the secret into chat, documentation, source code, Vercel, or a commit.
4. Select `testSendEmail` in the Apps Script editor and run it once. Review and approve the Google permissions. It sends one test message to the script owner's account.
5. Select `setupInboundPolling` and run it once. Approve Gmail read/modify and external request permissions. It installs a one-minute trigger and records a start time so old unread mail is not imported.
6. For the existing web app deployment, choose **Deploy → Manage deployments → Edit** and deploy a new version. Preserve **Execute as: Me** and **Who has access: Anyone**. Public access is required for the backend-to-script request; both outbound requests and inbound webhooks are protected by the shared secret. Updating the existing deployment keeps its `/exec` URL; never use the editor's `/dev` URL in Render.
7. Open the deployed `/exec` URL in a browser and confirm it returns a small JSON service status. Keep the deployment URL private as operational configuration, even though the shared secret is the actual authorization control.

If you change Apps Script code after deployment, create a new deployment version. Existing time-based triggers continue using the current project code.

## Configure Render

Set these variables in the Render **backend Web Service** Environment page. Do not set them in Vercel:

| Variable | Value |
| --- | --- |
| `EMAIL_PROVIDER` | `apps_script` |
| `APPS_SCRIPT_URL` | The deployed Apps Script `/exec` URL |
| `APPS_SCRIPT_SECRET` | The exact same random secret stored in Apps Script Script Properties |
| `GMAIL_USER` | The Gmail support inbox address; this remains the ticket Reply-To address |
| `GMAIL_IMAP_ENABLED` | `false`; Apps Script owns inbox polling |

The Apps Script Gmail account is the sending and polling account. Set `GMAIL_USER` to that same inbox so replies go to the inbox that Apps Script polls. `GMAIL_APP_PASSWORD` and `EMAIL_FROM` are not used for Apps Script sending. Do not remove the `GMAIL_APP_PASSWORD` until the SMTP fallback is no longer needed. Saving Render environment changes restarts/redeploys the service. If `EMAIL_PROVIDER=apps_script` is set without the URL and secret, the backend intentionally fails startup rather than silently using SMTP.

The Render service can remain on the Free plan for Apps Script operations; the scheduled inbox poll runs in Google's infrastructure. Render Free may still spin down, which can delay API requests and ticket activity, but it no longer needs to keep an IMAP socket alive.

## Verification checklist

1. Run `testSendEmail` manually and confirm the message arrives in the support inbox.
2. After setting the Render variables and redeploying, open the Vercel app and trigger an email action such as requesting an OTP.
3. In Render logs, confirm the email is reported as sent via Apps Script. Confirm the OTP message arrives at the recipient and check spam if necessary.
4. Reply to a ticket notification using the email account registered as that ticket's requester or assigned agent.
5. In Apps Script **Executions**, confirm `pollInbox` runs; in Render logs, confirm the inbound message is processed and the ticket conversation updates.
6. Confirm an unrelated or unauthorized sender cannot add a ticket reply, and check the `EmailEvent` record/log for the deliberate rejection.
7. Check that no app password, shared secret, or Gmail credential appears in source, Vercel settings, frontend bundles, or logs.

`GmailApp.sendEmail` returning successfully confirms Gmail accepted the send operation, not that the destination inbox received or displayed it. Verify receipt directly. Apps Script quotas, Gmail account restrictions, script deployment access, spam filtering, and trigger execution remain Google-side operational dependencies.

## Code verification and current status

- The previous Render SMTP error (`Connection timeout`) and disabled IMAP polling are confirmed in application logs.
- The project now contains Apps Script send and inbox-polling code, backend provider selection, a shared-secret-protected inbound route, and test coverage for provider dispatch and failed sends.
- Local automated tests verify the backend Apps Script dispatch and inbound authentication behavior.
- **Not yet verified in production:** a deployed Google Apps Script, successful recipient delivery, or a real ticket reply imported into MongoDB. These require the support inbox owner to deploy/authorize the Apps Script and add the resulting URL and shared secret to Render.
