# Vendor Attachment RESTlet Setup

This RESTlet bridges a NetSuite API limitation: REST Record and SOAP attachment operations do not attach files to ordinary custom records. The portal uploads each document to the File Cabinet first, then this RESTlet runs `N/record.attach()` inside NetSuite so the file appears on the Vendor Onboarding Request's native **Communication > Files** subtab.

## 1. Upload the SuiteScript file

1. In NetSuite, go to **Documents > Files > SuiteScripts**.
2. Create or select a folder for the vendor-onboarding integration.
3. Upload `F3_Vendor_Attachment_Restlet.js`.

## 2. Create the script record and deployment

1. Go to **Customization > Scripting > Scripts > New**.
2. Select `F3_Vendor_Attachment_Restlet.js`.
3. Use these values:
   - Name: `F3 Vendor Attachment RESTlet`
   - ID: `customscript_f3_vendor_attachment_rl`
4. On **Deployments**, create a deployment with:
   - Title: `F3 Vendor Attachment RESTlet`
   - ID: `customdeploy_f3_vendor_attachment_rl`
   - Status: `Released`
   - Execute As Role: the same integration role used by the portal token
   - Audience: the same integration role only

Do not enable **Available Without Login**. The portal authenticates with the existing NetSuite token-based credentials.

## 3. Confirm integration-role permissions

The role linked to `NS_TOKEN_ID` must be able to:

- View and edit `customrecord_f3_vendor_onboarding` records.
- Access the configured `NS_VENDOR_ATTACHMENT_FOLDER` File Cabinet folder.
- Execute this RESTlet deployment.
- Use RESTlets and SuiteScript.

## 4. Configure Vercel

Add these server-only environment variables to the `vendor-onboarding-web-app` project for **Production**:

```text
NS_ATTACHMENT_RESTLET_SCRIPT_ID=customscript_f3_vendor_attachment_rl
NS_ATTACHMENT_RESTLET_DEPLOY_ID=customdeploy_f3_vendor_attachment_rl
```

The values must match the script and deployment IDs created in NetSuite. Do not restore the obsolete `NS_ATTACH_FILES_TO_CUSTOM_RECORD` setting.

Redeploy production after adding the variables. A successful document submission logs:

```text
Attached 1 file(s) to Vendor Request #<id> through SuiteScript
```

## 5. Repair request 1601

Find the File Cabinet internal ID of the file named `vendor-request-1601-<original filename>`, then call the RESTlet once with the same token-based authentication used by the portal:

```json
{
  "requestId": "1601",
  "fileIds": ["<FILE_INTERNAL_ID>"]
}
```

The RESTlet is safe to call again when NetSuite reports that the relationship already exists.
