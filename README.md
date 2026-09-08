# Vendor-Onboarding-Web-App

## Production inbound email worker

The Vercel API remains request-based and does not run the persistent IMAP poller. Deploy the backend a second time as an always-on background worker with the same NetSuite, SMTP, and IMAP environment variables used by the API.

Build command:

```text
npm ci && npm run build:worker
```

Start command:

```text
npm run start:email-worker
```

Required worker settings include `DATA_SOURCE=netsuite`, `INBOUND_EMAIL_ENABLED=true`, `INBOUND_EMAIL_POLL_MS`, `IMAP_HOST`, `IMAP_PORT`, `IMAP_USER`, `IMAP_PASS`, all `NS_*` integration values, all `SMTP_*` values, `MAIL_FROM`, `APPROVER_EMAIL`, and the published internal portal URL in `APP_BASE_URL`.

The worker searches the last 30 days on startup, so an unprocessed tracked reply such as Request 601 is backfilled automatically after the worker is first started.

## Native NetSuite file attachments

The portal stores uploaded documents in the configured NetSuite File Cabinet folder. To also show them on the Vendor Onboarding Request's native **Communication > Files** subtab, deploy the SuiteScript RESTlet in [`netsuite/F3_Vendor_Attachment_Restlet.js`](netsuite/F3_Vendor_Attachment_Restlet.js) and follow [`netsuite/ATTACHMENT_RESTLET_SETUP.md`](netsuite/ATTACHMENT_RESTLET_SETUP.md).

Until both `NS_ATTACHMENT_RESTLET_SCRIPT_ID` and `NS_ATTACHMENT_RESTLET_DEPLOY_ID` are configured, submissions continue to store files in the File Cabinet and expose them through the reviewer portal without creating the native NetSuite attachment relationship.
