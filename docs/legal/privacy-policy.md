# Anacast Privacy Policy — PLACEHOLDER DRAFT

> **Status: placeholder, not legal advice.** This text was written on 2026-09-07 from the product design
> (`docs/PLAN.md`, `docs/DESIGN.md`) so that the `/privacy` page, the app-store listings and the Google Play
> Data Safety form have something accurate to point at during development. The founder's lawyers will replace
> it before go-live (TODO step 6.6). Values in angle brackets are placeholders to be filled in. Notes marked
> *For counsel* are questions for the lawyers and must be removed from the published text.

**Effective date:** <EFFECTIVE_DATE>

**Who we are:** <LEGAL_ENTITY_NAME> ("Anacast", "we", "us"), <POSTAL_ADDRESS>. Privacy contact: <FOUNDER_EMAIL>.

## 1. What Anacast is

Anacast is a platform that congregations ("churches") use to share sermons, announcements, bulletins, documents,
calendars and surveys with the people who attend, and to keep a member directory. Each church decides who may join,
what it shares, and how private its directory is. This policy explains what information we handle when you use the
Anacast app or the Anacast website at https://<DOMAIN>, and the choices you have.

*For counsel:* each church administers its own congregation's information and we host and process it on the
church's behalf. Please settle the controller/processor (or equivalent) wording and any church-facing terms.

## 2. Information we collect

- **Account information.** Your email address and display name. Sign-in uses a one-time code or link sent to your
  email; we do not store a password.
- **Directory information**, entered by your church or by an adult in your household: household name, address,
  home phone, household photo and anniversary; and for each person: names and preferred name, sex, date of birth,
  marital status, role in the household, membership status, phone numbers, email, photo, and notes that only church
  leaders can see.
- **Content you submit.** Survey answers, calendar event submissions and, for church leaders, announcements,
  bulletins, documents and sermon recordings or links you upload or post.
- **Device and notification data.** A push-notification token for each device on which you enable notifications,
  the device platform, and your notification preferences.
- **Usage and security records.** A log of administrative changes made in your church's account (who changed what
  and when), sign-in events kept by our authentication provider, and standard server logs such as IP address and
  browser type.
- **Billing information.** Churches, not individual members, pay for Anacast. Billing is handled by Stripe; we store
  the church's Stripe customer and subscription identifiers, never card numbers.
- **What we do not collect.** Anacast shows no advertising, uses no advertising identifiers and includes no
  analytics SDK. If error monitoring is enabled, crash reports may include the device model, operating-system
  version and the screen where the error happened; they are configured to leave out personal data.

## 3. How we use information

We use information to provide the service (showing your church's content, delivering the notifications you opt in
to, maintaining the directory), to keep accounts and churches secure, to respond to your requests, to bill churches,
and to comply with the law. We do not sell personal information and we do not use it for advertising.

## 4. Who can see your information

- **Your congregation.** Directory information is visible to approved members of your church, subject to the privacy
  settings described in section 5.
- **Other churches in your fellowship.** If your church turns on fellowship sharing and your household has not opted
  out, members of other churches in the same fellowship can see a reduced listing without birth years, anniversary
  years or leader notes. Children appear to other churches only if your family opts in.
- **Church leaders.** People your church has given permissions can manage the directory and content, and can see the
  leader-only notes. Our staff can access data as needed to operate and support the service.
- **Share links.** A sermon share link created by a church can be opened by anyone who has the link, unless the
  church protects it with a password.
- **Service providers** that process data for us: Supabase (database, authentication and file storage, hosted in the
  eastern United States), Vercel (web hosting), Stripe (church billing), Expo together with Google Firebase Cloud
  Messaging and Apple Push Notification service (push delivery), our email delivery provider (sign-in codes and
  invitations) and, if enabled, an error-monitoring service. *For counsel:* confirm the final provider list and
  whether provider agreements need to be referenced.
- **Legal reasons.** When required by law, or to protect the rights, property or safety of Anacast, churches or
  their members.

## 5. Your choices

- **Privacy settings.** An adult in your household can hide the household from other churches and from your own
  congregation, and choose whether children are listed. Your church can make your listing more private but never less
  private than you chose.
- **Notifications.** You can turn push notifications off for a device, or for particular kinds of messages, at any
  time in the app.
- **Deactivate your account.** Deactivating archives your account: you are signed out and hidden from your church,
  and your information is kept so that an administrator can restore your account later at your request.
- **Delete your account.** You can request deletion in the app (More → Delete account) or on the web at
  https://<DOMAIN>/account/delete. Your account is deactivated immediately and permanently deleted 30 days later
  unless you cancel by signing in again or contacting us. Deletion removes your sign-in account, device tokens,
  notification preferences, church memberships and permissions. Directory entries your church created about you are
  the church's records; ask your church's directory administrators to remove or correct them.
- **Access and correction.** You can see and correct much of your information in the app or through your church's
  directory administrators, or contact us at <FOUNDER_EMAIL>.

## 6. Children

Anacast accounts are intended for adults and, where a church allows it, for youth above an age the church sets.
Children's directory information is entered by their family or their church, is shown only inside the congregation,
and is shown to other churches only with the family's opt-in. We do not knowingly collect personal information
directly from children under 13. *For counsel:* confirm the age thresholds and any parental-consent wording.

## 7. How long we keep information

We keep information while your church's account and your membership are active. Archived (deactivated) accounts are
kept until they are restored or deleted. Deletion requests are completed 30 days after they are made. Administrative
logs and backups are kept for <RETENTION_PERIOD>. Billing records are kept as long as the law requires.

## 8. Security

Data is encrypted in transit, each church's data is isolated by access rules enforced in the database, files are
served through time-limited signed links, and administrative changes are logged. No method of storage or transmission
is completely secure.

## 9. Where information is stored

Our servers are in the United States. If you use Anacast from elsewhere, your information is transferred to and
processed in the United States.

## 10. Changes to this policy

We will post any changes on this page with a new effective date and tell churches about material changes.

## 11. Contact

<LEGAL_ENTITY_NAME>, <POSTAL_ADDRESS> — <FOUNDER_EMAIL>.
