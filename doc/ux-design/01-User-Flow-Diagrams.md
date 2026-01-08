# User Flow Diagrams
## ProspectFlow - Complete User Journey Maps

**Version:** 1.0  
**Date:** January 2025

---

## Overview

This document maps all critical user journeys through the ProspectFlow application, from onboarding through campaign execution and analysis.

---

## Flow 1: First-Time User Onboarding

### Entry Point
User has signed up and reached the application for the first time.

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FIRST-TIME USER ONBOARDING                      │
└─────────────────────────────────────────────────────────────────────┘

START: User lands on app
    │
    ├─> [Welcome Screen]
    │   - Hero message: "Let's get your first campaign running"
    │   - 3-step preview: Connect → Upload → Review
    │   - CTA: "Get Started" (primary)
    │   - Skip option (not recommended)
    │
    ├─> Step 1: [Gmail Connection]
    │   - Heading: "Connect Your Gmail"
    │   - Description: Why we need access (to send on your behalf)
    │   - OAuth button: "Connect Gmail Account"
    │   - Security note: "We never send without your approval"
    │   │
    │   ├─> [Gmail OAuth Flow] (external)
    │   │   - Permission consent screen
    │   │   - Scopes: send, modify
    │   │   │
    │   │   ├─> Success → Continue to Step 2
    │   │   └─> Cancelled → Return with error message
    │   │
    │   └─> Success indicator: ✓ Gmail Connected
    │
    ├─> Step 2: [Profile Setup]
    │   - Heading: "Tell us about your services"
    │   - Form fields:
    │       • Your name: [text input]
    │       • Your business: [text input]
    │       • Your services: [textarea - 150 char max]
    │       • Your niche: [dropdown - Video Production, Social Content, etc.]
    │   - Helper text: "This helps us personalize your emails"
    │   - CTA: "Continue" (primary)
    │   - Validation: Real-time for required fields
    │   │
    │   └─> Success → Continue to Step 3
    │
    ├─> Step 3: [Template Selection]
    │   - Heading: "Choose your first campaign template"
    │   - Card grid (3 templates):
    │       [Social Media Upgrade] (recommended)
    │       [Product Demo Video]
    │       [Custom Campaign]
    │   - Each card shows:
    │       • Template name
    │       • Description (when to use)
    │       • Example email preview
    │       • "Select" button
    │   │
    │   └─> Selection → Continue to Step 4
    │
    ├─> Step 4: [Quick Tutorial]
    │   - Interactive walkthrough (optional)
    │   - 90-second video: "How ProspectFlow Works"
    │   - Key points:
    │       • Upload prospects
    │       • AI researches & drafts
    │       • You review & approve
    │       • Track results
    │   - CTA: "Skip Tutorial" | "Watch Tutorial"
    │   │
    │   └─> Complete → Redirect to Dashboard
    │
    └─> END: User lands on Dashboard
        - Welcome banner: "Ready to create your first campaign?"
        - CTA: "Create Campaign" (highlighted)
        - Empty state illustration
```

### Key Interactions
1. **Gmail OAuth**: Handled by Google's secure flow, returns to app with auth token
2. **Form Validation**: Real-time, non-blocking (errors shown inline)
3. **Template Preview**: Hovering/clicking card shows expanded preview
4. **Progress Indicator**: Step counter (1 of 4) at top of screen

### Success Criteria
- ✅ User completes all 4 steps in <10 minutes
- ✅ Gmail successfully connected
- ✅ Profile saved to Firestore
- ✅ User understands core workflow

### Error Handling
- **Gmail Connection Failed**: Show retry button + support link
- **Network Error**: Auto-save draft, allow offline editing
- **Validation Errors**: Inline, specific, actionable messages

---

## Flow 2: Campaign Creation & Setup

### Entry Point
User clicks "Create Campaign" from dashboard or navigation.

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CAMPAIGN CREATION FLOW                          │
└─────────────────────────────────────────────────────────────────────┘

START: User clicks "Create Campaign"
    │
    ├─> [Campaign Setup Screen]
    │   │
    │   ├─> Section 1: Basic Info
    │   │   - Campaign Name: [text input] (required)
    │   │   - Template: [dropdown or card selector]
    │   │   - Helper: "Choose a name you'll recognize, like 'Denver Restaurants Q1'"
    │   │
    │   ├─> Section 2: Value Proposition
    │   │   - Your pitch: [textarea - 150 char max] (required)
    │   │   - Example shown: "I help businesses create engaging product videos..."
    │   │   - Character counter: 120/150
    │   │
    │   ├─> Section 3: Prospect Upload
    │   │   - [Upload CSV] button (large, primary)
    │   │   - Or: [Use template CSV] link
    │   │   - Format requirements shown:
    │   │       • company_name (required)
    │   │       • contact_email (required)
    │   │       • contact_name (optional)
    │   │       • website_url (optional)
    │   │   - Download sample CSV link
    │   │
    │   └─> CTA: "Create & Upload" (disabled until valid)
    │
    ├─> [CSV Upload & Validation]
    │   - File picker opens
    │   - User selects CSV file
    │   │
    │   ├─> [Processing Overlay]
    │   │   - "Validating your prospects..."
    │   │   - Progress bar
    │   │   - Estimated time: ~3 seconds for 100 prospects
    │   │   │
    │   │   ├─> Validation Success (100% valid)
    │   │   │   └─> Show success message
    │   │   │       "✓ 47 prospects ready to go!"
    │   │   │       → Continue to Review
    │   │   │
    │   │   ├─> Partial Success (some valid, some invalid)
    │   │   │   └─> [Validation Report Screen]
    │   │   │       - Summary: "42 valid, 5 invalid"
    │   │   │       - Details table:
    │   │   │           | Row | Company    | Issue              | Action  |
    │   │   │           |-----|------------|--------------------|---------|
    │   │   │           | 3   | Acme Inc   | Invalid email      | [Fix]   |
    │   │   │           | 7   | Widget Co  | Missing company    | [Skip]  |
    │   │   │       - Options:
    │   │   │           • [Proceed with 42] (primary)
    │   │   │           • [Fix Inline] (edit table)
    │   │   │           • [Re-upload CSV]
    │   │   │
    │   │   └─> Complete Failure (all invalid)
    │   │       └─> Error message + guidance
    │   │           "We couldn't validate any prospects"
    │   │           → [Re-upload] or [See Example]
    │   │
    │   └─> User Decision
    │       ├─> Proceed with valid → Continue
    │       ├─> Fix inline → Edit → Re-validate → Continue
    │       └─> Re-upload → Back to upload step
    │
    ├─> [Campaign Review & Confirm]
    │   - Summary card:
    │       • Campaign: "Denver Restaurants Q1"
    │       • Template: Social Media Upgrade
    │       • Prospects: 42 companies
    │       • Estimated processing: 90 minutes
    │   - Preview first 3 prospect cards
    │   - Settings:
    │       • Daily send limit: [40] (editable)
    │       • Research depth: [Standard] (dropdown)
    │   - CTA: "Start Campaign" (primary)
    │   - Secondary: "Save Draft" | "Cancel"
    │   │
    │   └─> User confirms
    │
    ├─> [Processing Started]
    │   - Success overlay
    │   - "Campaign created! Processing has begun."
    │   - "We'll email you when drafts are ready (~90 min)"
    │   - CTA: "Go to Dashboard" | "View Campaign"
    │   │
    │   └─> Redirect
    │
    └─> END: Campaign dashboard or main dashboard
        - Campaign status: "Processing"
        - Progress indicator: "3/42 prospects researched"
```

### Key Interactions
1. **CSV Drag-Drop**: Support drag-drop in addition to file picker
2. **Inline Validation**: Check email format, required fields in real-time
3. **Character Counter**: Live feedback on value prop length
4. **Preview Prospects**: Show first few rows from CSV before confirming

### Success Criteria
- ✅ User successfully uploads valid CSV
- ✅ Campaign created in Firestore
- ✅ Research jobs enqueued
- ✅ User understands processing timeline

### Error Handling
- **Invalid CSV Format**: Show specific error (missing columns, wrong format)
- **Duplicate Campaign Name**: Suggest unique name
- **Network Failure**: Save draft locally, retry on reconnect
- **File Too Large**: Warn if >1000 prospects, suggest batching

---

## Flow 3: Email Review & Approval (Core Flow)

### Entry Point
User receives notification that drafts are ready, or navigates to campaign with "Ready to Review" status.

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                   EMAIL REVIEW & APPROVAL FLOW                      │
└─────────────────────────────────────────────────────────────────────┘

START: User opens campaign with ready drafts
    │
    ├─> [Campaign Review Dashboard]
    │   - Header:
    │       • Campaign name: "Denver Restaurants Q1"
    │       • Status: "42 drafts ready to review"
    │       • Progress: 0/42 reviewed
    │   - Filter/Sort options:
    │       • All | High Confidence | Medium | Low
    │       • Sort by: Confidence | Company Name | Date
    │   - Batch actions bar:
    │       • [Select All] [Approve Selected] [Skip Selected]
    │   - CTA: "Start Reviewing" (primary)
    │   │
    │   └─> Click to start
    │
    ├─> [Email Review Interface - Card View]
    │   │
    │   ├─> Layout: Split screen
    │   │   │
    │   │   ├─> LEFT PANEL (60%): Email Draft
    │   │   │   - Company info header:
    │   │   │       • Logo (if available)
    │   │   │       • Company name
    │   │   │       • Website link (clickable)
    │   │   │       • Confidence badge: [High 85%]
    │   │   │   - Email preview:
    │   │   │       • Subject: [editable inline]
    │   │   │       • Body: [editable rich text]
    │   │   │       • Personalization highlights (purple bg)
    │   │   │       • CTA clearly visible
    │   │   │   - Email preview toggle: [Edit Mode] / [Preview Mode]
    │   │   │
    │   │   └─> RIGHT PANEL (40%): Research Context
    │   │       - AI Reasoning card:
    │   │           • "Why this email works:"
    │   │           • Bullet points of reasoning
    │   │           • Confidence score breakdown
    │   │       - Research highlights:
    │   │           • [Website Insight]
    │   │               "No video content on product pages"
    │   │               → Source: [URL link]
    │   │           • [Social Media Insight]
    │   │               "Posted 3 product photos last week"
    │   │               → Source: [Instagram link]
    │   │       - Opportunity card:
    │   │           • Suggested video: "Product demo video"
    │   │           • Rationale: "Active social but missing video"
    │   │
    │   └─> Action Bar (bottom, sticky):
    │       - Left side: Progress (3/42)
    │       - Center: Primary actions
    │           • [Skip] (secondary btn)
    │           • [Regenerate] (secondary btn)
    │           • [Approve] (primary btn, green)
    │       - Right side:
    │           • [← Previous] [Next →] (keyboard: ← →)
    │       - Keyboard hints visible on hover
    │
    ├─> USER ACTIONS (Per Email):
    │   │
    │   ├─> ACTION: Approve (as-is)
    │   │   - Keyboard: A or Enter
    │   │   - Visual feedback: ✓ animation
    │   │   - Status: Draft → Approved
    │   │   - Auto-advance to next email
    │   │   - Undo toast (3 seconds): "Approved. Undo?"
    │   │   │
    │   │   └─> Next email appears
    │   │
    │   ├─> ACTION: Edit & Approve
    │   │   - Keyboard: E (enter edit mode)
    │   │   - Steps:
    │   │       1. Click "Edit Mode" or press E
    │   │       2. Inline editing enabled
    │   │       3. Make changes (subject or body)
    │   │       4. Changes auto-saved (debounced)
    │   │       5. Click "Approve" when done
    │   │   - Change indicator: "Edited" badge
    │   │   - Edit tracking: Log changes for AI learning
    │   │   │
    │   │   └─> Next email appears
    │   │
    │   ├─> ACTION: Skip
    │   │   - Keyboard: S
    │   │   - Confirmation (if high confidence): "Skip this high-quality draft?"
    │   │       • [Yes, Skip] [Cancel]
    │   │   - Status: Draft → Skipped
    │   │   - Prospect: Marked as skipped, can un-skip later
    │   │   │
    │   │   └─> Next email appears
    │   │
    │   └─> ACTION: Regenerate
    │       - Keyboard: R
    │       - Modal: "Request new draft?"
    │           • Optional: Feedback textarea
    │               "What should we change?"
    │           • Examples: "More specific" | "Different tone" | "Shorter"
    │       - Processing overlay: "Regenerating draft..."
    │       - New draft appears (replaces old)
    │       - History preserved: Can view previous drafts
    │       │
    │       └─> Review new draft
    │
    ├─> [Batch Review Mode] (Optional)
    │   - User can switch to list view
    │   - Shows all emails in scrollable list
    │   - Quick actions per item:
    │       • Checkbox: [✓] select
    │       • Preview: [👁] modal
    │       • Status: Pending/Approved/Skipped
    │   - Bulk actions:
    │       • "Approve All High Confidence" (one-click)
    │       • "Skip All Low Confidence"
    │   │
    │   └─> Return to card view for detailed review
    │
    ├─> [Review Complete]
    │   - Trigger: All emails reviewed (approved or skipped)
    │   - Success screen:
    │       • "Review complete! 🎉"
    │       • Summary:
    │           "38 approved, 4 skipped"
    │       • Next step prompt:
    │           "Ready to send?"
    │       • CTA: "Send Approved Emails" (primary)
    │       • Secondary: "Review Again" | "Back to Dashboard"
    │   │
    │   └─> User decision
    │       ├─> Send now → Continue to Send Flow
    │       └─> Not now → Save state, return to dashboard
    │
    └─> END: Approved emails queued, ready to send
```

### Key Interactions

#### Keyboard Shortcuts (Power User)
```
A / Enter  → Approve current email
E          → Enter edit mode
S          → Skip current email
R          → Regenerate draft
←          → Previous email
→          → Next email
Esc        → Exit edit mode / Close modal
? / Shift+? → Show keyboard shortcuts
```

#### Edit Experience
- **Inline Editing**: Rich text editor (bold, italic, links)
- **Auto-Save**: Debounced, saves every 2 seconds
- **Undo/Redo**: Ctrl+Z / Ctrl+Y supported
- **Version History**: Can revert to original AI draft

#### Visual Feedback
- **Confidence Badges**: 
  - High (80-100%): Green badge
  - Medium (50-79%): Yellow badge
  - Low (<50%): Red badge
- **Personalization Highlights**: Purple background on AI-inserted content
- **Edit Indicators**: "Edited" pill next to subject line

### Success Criteria
- ✅ User reviews all drafts in target time (<3 min/email)
- ✅ At least 70% approved (high quality threshold)
- ✅ Edits saved correctly
- ✅ User understands confidence scores

### Error Handling
- **Auto-Save Failure**: Show warning banner, retry, allow manual save
- **Regenerate Timeout**: Show error, option to try again or skip
- **Network Disconnection**: Save state locally, sync when reconnected

---

## Flow 4: Sending & Scheduling

### Entry Point
User has approved emails and clicks "Send Approved Emails".

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     EMAIL SENDING FLOW                              │
└─────────────────────────────────────────────────────────────────────┘

START: User clicks "Send Approved Emails"
    │
    ├─> [Send Configuration Screen]
    │   - Summary card:
    │       • Emails to send: 38
    │       • From: user@gmail.com
    │       • Daily limit: 40/day (editable)
    │   - Schedule options:
    │       • [Send Now] (radio, default)
    │       • [Schedule] (radio)
    │           └─> If selected: Date/time picker appears
    │   - Pacing strategy:
    │       • Dropdown: [Natural (60-90s)] (recommended)
    │       • Options: Fast (30s) | Natural | Slow (120s)
    │       • Helper: "Natural pacing improves deliverability"
    │   - Daily split (if >40 emails):
    │       • "38 emails will be sent today"
    │       • Or: "Day 1: 40 emails, Day 2: 18 emails"
    │   - Final check:
    │       • [ ] I've reviewed all emails
    │       • [ ] Unsubscribe link is included (auto-checked)
    │   - CTA: "Start Sending" (primary, large)
    │   - Secondary: "Cancel" | "Save Draft"
    │   │
    │   └─> User confirms
    │
    ├─> [Sending In Progress]
    │   - Full-screen overlay (can minimize)
    │   - Progress visualization:
    │       • Progress bar: 12/38 sent
    │       • Percentage: 32%
    │       • Estimated completion: ~25 minutes remaining
    │   - Real-time feed:
    │       • ✓ Email sent to john@acmeburgers.com
    │       • ✓ Email sent to sarah@widgetcafe.com
    │       • ⏸ Pausing 75 seconds... (pacing)
    │   - Action: [Pause Sending] button
    │       • If paused: [Resume] | [Cancel Remaining]
    │   - Safe to close: "You can close this. We'll continue in background."
    │   │
    │   ├─> DURING SENDING:
    │   │   │
    │   │   ├─> Success Case (per email)
    │   │   │   - Gmail API: 200 OK
    │   │   │   - Store: message_id, sent_timestamp
    │   │   │   - Update UI: ✓ green checkmark
    │   │   │   - Continue to next
    │   │   │
    │   │   ├─> Transient Error (rate limit, network)
    │   │   │   - Retry logic: 3 attempts
    │   │   │   - Exponential backoff
    │   │   │   - UI: "Retrying..." (no user action needed)
    │   │   │   │
    │   │   │   ├─> Retry Success → Continue
    │   │   │   └─> Retry Failed → Mark as failed, continue
    │   │   │
    │   │   └─> Permanent Error (invalid email)
    │   │       - Skip email
    │   │       - Log error
    │   │       - UI: ⚠ warning icon
    │   │       - Continue to next
    │   │
    │   └─> COMPLETION:
    │       ├─> All Successful
    │       │   └─> Success screen
    │       │
    │       ├─> Partial Success (some failed)
    │       │   └─> Success screen with warning
    │       │
    │       └─> User Cancelled
    │           └─> Partial success screen
    │
    ├─> [Send Complete Screen]
    │   - Success message: "Emails sent! 🚀"
    │   - Summary:
    │       • Successfully sent: 36/38
    │       • Failed: 2 (see details)
    │       • Time taken: 38 minutes
    │   - Failed emails (if any):
    │       | Company    | Email              | Error           | Action  |
    │       |------------|--------------------|-----------------|---------|
    │       | Acme Co    | bad@email.com      | Invalid address | [Edit]  |
    │       | Widget Inc | bounce@domain.com  | Bounce          | [Skip]  |
    │   - Next steps card:
    │       • "Responses typically arrive within 48 hours"
    │       • "We'll notify you when prospects reply"
    │   - CTAs:
    │       • [View Campaign Analytics] (primary)
    │       • [Back to Dashboard] (secondary)
    │   │
    │   └─> User navigates away
    │
    └─> END: Campaign status = "Active"
        - Emails in prospect's Gmail Sent folder
        - System tracking for replies
```

### Key Interactions

#### Pacing Visualization
```
Email 1 [====================] Sent ✓
        [----75 seconds----]
Email 2 [====================] Sent ✓
        [----82 seconds----]
Email 3 [=========>----------] Sending...
```

#### Pause/Resume Behavior
- **Pause**: Stop after current email completes
- **Resume**: Continue with same pacing
- **Cancel**: Stop all remaining sends, save draft state

### Success Criteria
- ✅ All approved emails sent successfully
- ✅ Emails appear in user's Gmail Sent folder
- ✅ Proper pacing maintained (no rate limits hit)
- ✅ User receives confirmation

### Error Handling
- **Gmail API Rate Limit**: Automatic retry with backoff, extend pacing
- **Network Failure**: Pause sending, retry when connected, resume
- **Invalid Recipients**: Skip, log, continue with others
- **Gmail Disconnected**: Alert user, prompt to re-authenticate

---

## Flow 5: Response Tracking & Management

### Entry Point
Prospect replies to sent email (detected by system) OR user manually checks for responses.

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                   RESPONSE TRACKING FLOW                            │
└─────────────────────────────────────────────────────────────────────┘

START: System detects reply (polling every 5 min)
    │
    ├─> [Reply Detection Worker]
    │   - Check Gmail for replies to sent messages
    │   - Match by Gmail thread ID
    │   - Extract reply content
    │   │
    │   └─> New reply found
    │
    ├─> [Reply Classification] (AI)
    │   - Analyze reply sentiment
    │   - Categories:
    │       • Positive: Interested, wants meeting
    │       • Objection: Price concern, timing, etc.
    │       • Negative: Not interested, unsubscribe
    │       • Unclear: Needs human review
    │   - Confidence score
    │   │
    │   └─> Classification complete
    │
    ├─> [User Notification]
    │   - In-App notification (bell icon badge)
    │   - Optional: Email notification
    │   - Optional: SMS notification (future)
    │   - Notification content:
    │       • "New reply from Acme Burgers! 🎉"
    │       • Snippet: "Hi! I'd love to discuss..."
    │       • Classification: Positive
    │       • CTA: "View Reply"
    │   │
    │   └─> User clicks notification
    │
    ├─> [Response Detail View]
    │   │
    │   ├─> Header:
    │   │   - Company: Acme Burgers
    │   │   - Contact: John Smith (john@acmeburgers.com)
    │   │   - Status badge: [Positive Reply]
    │   │   - Replied at: 2 days ago
    │   │
    │   ├─> Email Thread:
    │   │   - Original email sent (collapsed)
    │   │   - Reply received (expanded):
    │   │       • Full reply text
    │   │       • AI classification: "Interested ✓"
    │   │       • Key signals extracted:
    │   │           "Wants to discuss" | "Asked about pricing"
    │   │
    │   ├─> Context Panel (right):
    │   │   - Original research
    │   │   - Opportunity identified
    │   │   - Campaign details
    │   │   - Timeline of interactions
    │   │
    │   ├─> Quick Actions:
    │   │   - [Reply in Gmail] (opens Gmail)
    │   │   - [Schedule Meeting] (calendar integration)
    │   │   - [Mark as Meeting Booked]
    │   │   - [Add Note]
    │   │
    │   └─> Action taken
    │
    ├─> USER ACTIONS:
    │   │
    │   ├─> ACTION: Reply in Gmail
    │   │   - Opens Gmail in new tab
    │   │   - Pre-filled reply thread
    │   │   - User responds manually
    │   │   └─> Return to ProspectFlow
    │   │
    │   ├─> ACTION: Schedule Meeting
    │   │   - Calendar integration (Google Calendar)
    │   │   - Pre-filled: Guest email, suggested times
    │   │   - User confirms and sends invite
    │   │   - Status: Reply → Meeting Scheduled
    │   │   - Analytics: +1 meeting booked
    │   │   └─> Success confirmation
    │   │
    │   ├─> ACTION: Mark as Meeting Booked
    │   │   - Manual override (if meeting set outside app)
    │   │   - Confirm modal: "Meeting booked with Acme Burgers?"
    │   │   - Status: Reply → Meeting Booked
    │   │   - Analytics: +1 meeting booked
    │   │   - Optional: Add meeting date/time
    │   │   └─> Success celebration
    │   │
    │   └─> ACTION: Add Note
    │       - Inline note textarea
    │       - Examples: "Follow up in 2 weeks" | "Price objection"
    │       - Saved to prospect record
    │       - Visible in timeline
    │       └─> Note saved
    │
    ├─> [Bulk Response Management]
    │   - User can view all responses in list
    │   - Filters:
    │       • All | Positive | Objection | Negative | Unclear
    │       • By campaign
    │       • Date range
    │   - Sort: Most recent | Oldest | By campaign
    │   - Bulk actions:
    │       • Mark multiple as reviewed
    │       • Export to CSV
    │   │
    │   └─> Navigate to individual responses
    │
    └─> END: Response tracked, user action taken
        - Analytics updated
        - Prospect status updated
        - Timeline logged
```

### Key Interactions

#### Classification Visual Indicators
```
Positive:    [🎉 Interested]         Green
Objection:   [⚠️  Has Concerns]      Yellow
Negative:    [❌ Not Interested]     Red
Unclear:     [❓ Needs Review]       Gray
```

#### Timeline View
```
Jan 15  Email sent
        "Video opportunity for social media"
        ↓
Jan 17  Email opened
        Opened at 10:32 AM
        ↓
Jan 18  Reply received ← YOU ARE HERE
        "I'd love to discuss..."
        Classification: Positive
        ↓
Jan 19  Meeting scheduled
        Calendar invite sent
```

### Success Criteria
- ✅ Replies detected within 5 minutes
- ✅ Classification accuracy >85%
- ✅ User notified promptly
- ✅ Easy transition to response action

### Error Handling
- **Classification Uncertain**: Default to "Unclear", flag for manual review
- **Gmail Access Expired**: Prompt re-authentication
- **Notification Failed**: Store in-app, show badge on login

---

## Flow 6: Campaign Analytics Review

### Entry Point
User wants to see how campaign is performing.

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                   CAMPAIGN ANALYTICS FLOW                           │
└─────────────────────────────────────────────────────────────────────┘

START: User clicks "View Analytics" from dashboard or campaign
    │
    ├─> [Analytics Dashboard]
    │   │
    │   ├─> Top KPIs (Hero Metrics):
    │   │   ┌─────────────────────────────────────────────────────┐
    │   │   │  Meetings Booked                    Response Rate    │
    │   │   │       8 / 15                            12.5%       │
    │   │   │  [Progress bar]                     [Trend: ↑ 3%]  │
    │   │   │  Target: 15/month                   Target: 10%    │
    │   │   └─────────────────────────────────────────────────────┘
    │   │   ┌─────────────────────────────────────────────────────┐
    │   │   │  Time Saved                         Emails Sent     │
    │   │   │    5.5 hours                            160         │
    │   │   │  [Clock icon]                       [Envelope icon] │
    │   │   │  This week                          This month      │
    │   │   └─────────────────────────────────────────────────────┘
    │   │
    │   ├─> Campaign Performance Table:
    │   │   | Campaign Name     | Sent | Response | Positive | Meetings |
    │   │   |-------------------|------|----------|----------|----------|
    │   │   | Denver Rest Q1    | 42   | 14.3%    | 8.2%     | 3        |
    │   │   | Product Demo      | 58   | 10.3%    | 6.9%     | 4        |
    │   │   | Social Content    | 60   | 13.3%    | 10.0%    | 6        |
    │   │   - Sortable columns
    │   │   - Click row → Campaign details
    │   │
    │   ├─> Response Rate Trend Chart:
    │   │   - Line chart showing response rate over time
    │   │   - X-axis: Date (last 30 days)
    │   │   - Y-axis: Response rate %
    │   │   - Target line: 10%
    │   │   - Hover: Show details for that day
    │   │
    │   ├─> Funnel Visualization:
    │   │   Emails Sent [160] ───────────────────┐
    │   │                                          │
    │   │   Opened [112] (70%) ─────────────┐    │
    │   │                                     │    │
    │   │   Replied [20] (12.5%) ──────┐    │    │
    │   │                               │    │    │
    │   │   Positive [16] (10%) ───┐   │    │    │
    │   │                           │   │    │    │
    │   │   Meetings [8] (5%) ──┐  │   │    │    │
    │   │                        │  │   │    │    │
    │   │                        ▼  ▼   ▼    ▼    ▼
    │   │   Conversion stages with drop-off percentages
    │   │
    │   ├─> Best Performing Emails (Top 5):
    │   │   - Cards showing top emails by response rate
    │   │   - Each card:
    │   │       • Subject line
    │   │       • Response rate: 25%
    │   │       • Company: Acme Burgers
    │   │       • What worked: "Specific Instagram reference"
    │   │       • [View Email] link
    │   │   - CTA: "Apply this approach" (creates template)
    │   │
    │   └─> Filters & Date Range:
    │       - Date picker: Last 7 days | 30 days | 90 days | Custom
    │       - Campaign filter: All | Select specific
    │       - Export: [Download CSV]
    │
    ├─> [Drill-Down: Single Campaign Analytics]
    │   - (User clicks campaign from table)
    │   │
    │   ├─> Campaign Header:
    │   │   - Name: "Denver Restaurants Q1"
    │   │   - Status: Active
    │   │   - Created: Jan 10, 2025
    │   │   - Template: Social Media Upgrade
    │   │
    │   ├─> Performance Summary:
    │   │   - Total prospects: 42
    │   │   - Emails sent: 38
    │   │   - Skipped: 4
    │   │   - Responses: 6 (15.8%)
    │   │   - Positive: 4 (10.5%)
    │   │   - Meetings: 2
    │   │
    │   ├─> Response Breakdown:
    │   │   - Pie chart:
    │   │       • Positive: 4 (green)
    │   │       • Objection: 1 (yellow)
    │   │       • Negative: 1 (red)
    │   │       • No response: 32 (gray)
    │   │
    │   ├─> Individual Prospect Status:
    │   │   - Table with all prospects
    │   │   | Company      | Status   | Sent Date | Last Activity |
    │   │   |--------------|----------|-----------|---------------|
    │   │   | Acme Burgers | Meeting  | Jan 12    | Replied Jan 14|
    │   │   | Widget Cafe  | Opened   | Jan 12    | Opened Jan 13 |
    │   │   | Pizza Co     | Sent     | Jan 12    | -             |
    │   │   - Click row → Prospect detail view
    │   │
    │   ├─> Timeline View:
    │   │   - Chronological list of all campaign events
    │   │   - Jan 10: Campaign created
    │   │   - Jan 11: Research completed
    │   │   - Jan 12: Drafts ready
    │   │   - Jan 13: User reviewed 38 emails
    │   │   - Jan 14: Sent 38 emails
    │   │   - Jan 15: First reply received
    │   │
    │   └─> Actions:
    │       - [Create Follow-up Campaign]
    │       - [Export Results]
    │       - [Archive Campaign]
    │
    └─> END: User understands performance, can take action
        - Insights inform next campaign
        - Can identify what's working
        - Clear path to improvement
```

### Key Interactions

#### Interactive Charts
- **Hover**: Show tooltip with exact values
- **Click**: Filter to that segment
- **Zoom**: Date range zoom on timeline charts

#### Comparison View
- Compare 2-3 campaigns side-by-side
- Identify patterns in high-performers
- Export comparison report

### Success Criteria
- ✅ User can quickly assess campaign health
- ✅ Meetings booked prominently displayed
- ✅ Clear connection between actions and outcomes
- ✅ Insights actionable (can create templates from winners)

---

## Flow 7: Error Recovery & Edge Cases

### Scenario A: Gmail Disconnected

```
User attempts to send emails
    │
    └─> System detects: Gmail token expired
        │
        ├─> [Error Modal]
        │   - "Gmail connection lost"
        │   - Explanation: "Your Gmail authorization has expired"
        │   - Impact: "We can't send emails until you reconnect"
        │   - CTA: [Reconnect Gmail] (primary)
        │   - Secondary: [Cancel]
        │
        └─> User clicks Reconnect
            │
            └─> Gmail OAuth flow (same as onboarding)
                │
                ├─> Success → Resume previous action
                └─> Cancelled → Return to dashboard with notice
```

### Scenario B: Research Failure

```
System processing prospects
    │
    └─> Research worker encounters errors
        │
        ├─> [Partial Failure: Some prospects failed]
        │   - Dashboard shows: "35/40 prospects ready"
        │   - Failed list available: [View 5 Failed]
        │   │
        │   └─> User clicks View Failed
        │       │
        │       └─> [Failed Prospects Table]
        │           | Company   | Reason                    | Action    |
        │           |-----------|---------------------------|-----------|
        │           | Acme Inc  | Website unreachable       | [Retry]   |
        │           | Widget Co | No social media found     | [Skip]    |
        │           - Bulk actions: [Retry All] [Skip All]
        │           - User can manually add research
        │
        └─> [Complete Failure: All prospects failed]
            - Error message with cause
            - Suggestions: Check URLs, internet connection
            - CTA: [Retry All] [Contact Support]
```

### Scenario C: Send Failure Mid-Batch

```
Sending 40 emails, failure at #25
    │
    └─> [Error Detected]
        │
        ├─> Transient error (rate limit)
        │   - System: Auto-retry with backoff
        │   - UI: "Paused for 2 minutes due to rate limit"
        │   - User: No action needed
        │   - Resume automatically
        │
        └─> Permanent error (Gmail disconnected)
            - Stop sending immediately
            - Modal: "Sending stopped at 24/40"
            - Explanation + solution
            - Options:
                • [Fix & Resume] → Resolve issue → Continue from #25
                • [Cancel Remaining] → Mark as partial send
```

---

## Mobile-Specific Flows

### Flow 8: Mobile Response Check (Read-Only)

```
User opens ProspectFlow on mobile
    │
    ├─> [Mobile Dashboard]
    │   - Simplified layout
    │   - Key metrics at top:
    │       • Meetings: 8
    │       • New replies: 3 (red badge)
    │   - Campaign cards (vertical scroll)
    │   - CTA: "View Replies" (prominent)
    │   │
    │   └─> User taps "View Replies"
    │
    ├─> [Mobile Response List]
    │   - Full-screen list view
    │   - Each reply card:
    │       • Company name
    │       • Reply snippet (2 lines)
    │       • Status badge: Positive/Objection/etc.
    │       • Time: "2 hours ago"
    │   - Tap card → Detail view
    │   │
    │   └─> User taps reply card
    │
    ├─> [Mobile Response Detail]
    │   - Full-screen detail
    │   - Sections:
    │       • Company info
    │       • Reply text (full)
    │       • Original email (collapsible)
    │   - Actions (bottom sheet):
    │       • [Reply in Gmail] → Opens Gmail app
    │       • [Mark as Meeting]
    │       • [Add Note]
    │   - Swipe gestures:
    │       • Swipe left: Previous reply
    │       • Swipe right: Next reply
    │   │
    │   └─> User takes action
    │
    └─> END: Quick response management on-the-go
```

**Mobile Constraints:**
- ❌ No email editing (too complex for mobile)
- ❌ No CSV upload (desktop task)
- ✅ View campaigns and status
- ✅ Check and respond to replies
- ✅ Quick approve high-confidence drafts (future)

---

## Summary: User Flow Priorities

### MVP (Phase 1)
1. ✅ Onboarding
2. ✅ Campaign Creation
3. ✅ Email Review & Approval
4. ✅ Sending
5. ⚠️  Basic response tracking (manual)

### Post-MVP (Phase 2)
6. ✅ Automated response detection
7. ✅ Analytics dashboard
8. ✅ Mobile response checking

### Future
9. Follow-up sequence flows
10. A/B testing workflows
11. Team collaboration flows

---

**Next Document:** [Information Architecture →](./02-Information-Architecture.md)
