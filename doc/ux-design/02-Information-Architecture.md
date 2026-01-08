# Information Architecture
## ProspectFlow - Site Structure & Navigation

**Version:** 1.0  
**Date:** January 2025

---

## Overview

This document defines the complete information architecture for ProspectFlow, including:
- Site map and navigation structure
- Content hierarchy and organization
- Taxonomy and labeling
- User mental models
- Navigation patterns

---

## Site Map

### Primary Navigation Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PROSPECTFLOW                                 │
│                    (Top-level Navigation)                            │
└─────────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┬──────────────┐
                │               │               │              │
           DASHBOARD        CAMPAIGNS       ANALYTICS      SETTINGS
                │               │               │              │
                │               │               │              │
        ┌───────┴────────┐     │         ┌─────┴─────┐       │
        │                │     │         │           │       │
    Quick Stats    Activity    │    Overview    Campaigns    │
    Key Metrics    Feed        │    Funnel      Compare      │
    Campaigns      Recent      │    Trends      Export       │
    To-Do List     Replies     │    Best Emails              │
                               │                              │
                               │                              │
                    ┌──────────┴──────────┐                  │
                    │                     │                  │
               Campaign List      Campaign Detail            │
                    │                     │                  │
            ┌───────┴────────┐    ┌──────┴──────┐          │
            │                │    │             │          │
        All Campaigns    Create   Overview    Prospects    │
        Active           New      Review      Analytics    │
        Completed               Send        Timeline      │
        Archived                            Actions       │
                                                            │
                                                    ┌───────┴────────┐
                                                    │                │
                                                Profile        Integrations
                                                Account        Gmail Status
                                                Preferences    API Keys
                                                Billing        Notifications
```

### Navigation Hierarchy

#### Level 1: Top Navigation (Global)
```
┌─────────────────────────────────────────────────────────────────────┐
│ [Logo] Dashboard | Campaigns | Analytics | Settings      [User] [⚙] │
└─────────────────────────────────────────────────────────────────────┘
```

**Always Visible:**
- Logo (home link)
- Primary navigation tabs
- User menu (avatar + dropdown)
- Notification bell (with badge)
- Settings/preferences access

#### Level 2: Contextual Navigation
Appears based on current section:

**Dashboard View:**
- No secondary nav (single-page dashboard)

**Campaigns View:**
```
Campaigns
├── All Campaigns (default)
├── + Create New (button, right-aligned)
└── Filters: [All | Active | Completed | Archived]
```

**Campaign Detail View:**
```
Campaign: "Denver Restaurants Q1"
├── Overview (default tab)
├── Review Emails (tab)
├── Prospects (tab)
├── Analytics (tab)
└── Settings (tab)
```

**Analytics View:**
```
Analytics
├── Overview (default)
├── By Campaign (dropdown selector)
└── Date Range: [Last 30 days ▼]
```

**Settings View:**
```
Settings (left sidebar)
├── Profile
├── Account
├── Integrations
├── Notifications
├── Billing (post-MVP)
└── Help & Support
```

#### Level 3: In-Page Navigation
Within specific views:

**Email Review Interface:**
```
[Campaign Name]  |  Review Mode: [Card View | List View]

[Filters: All | High Confidence | Medium | Low]
[Sort: Confidence | Company | Date]

< Previous | 15/42 | Next >
```

**Prospect Detail:**
```
[Company Name]
Tabs: Details | Timeline | Research | Email History
```

---

## Content Organization Principles

### 1. Progressive Disclosure
Show the most important information first, reveal details on demand.

**Example: Campaign Card**
```
Level 1 (Always Visible):
- Campaign name
- Status
- Progress: "38/42 emails sent"
- Quick action: [View]

Level 2 (Hover/Click):
- Response rate
- Meetings booked
- Last activity
- Quick actions: [Review] [Analytics] [Settings]

Level 3 (Full Detail Page):
- Complete analytics
- All prospects
- Timeline
- Settings
```

### 2. Priority-Based Layout
Most critical information at top, supporting details below.

**Dashboard Priority Order:**
1. Key Metrics (meetings booked, response rate)
2. Action Items (drafts to review, replies to handle)
3. Campaign Status (at-a-glance)
4. Recent Activity Feed
5. Tips & Resources (collapsible)

### 3. Consistent Patterns
Same types of content appear in same locations.

**Standard Page Layout:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ Top Navigation (global)                                              │
├─────────────────────────────────────────────────────────────────────┤
│ Page Header: Title + Key Actions                                    │
├─────────────────────────────────────────────────────────────────────┤
│ Content Area:                                                        │
│   ┌─────────────────────┬───────────────────────────────────────┐  │
│   │  Main Content       │  Context Panel (if applicable)        │  │
│   │  (60-70% width)     │  (30-40% width)                       │  │
│   │                     │                                        │  │
│   │                     │  - Related info                        │  │
│   │                     │  - Quick actions                       │  │
│   │                     │  - Tips/help                           │  │
│   └─────────────────────┴───────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Taxonomy & Labeling

### Core Objects (Nouns)

| Object | Definition | User-Facing Label |
|--------|-----------|-------------------|
| Campaign | A themed batch of outreach emails | "Campaign" |
| Prospect | A potential client company + contact | "Prospect" or "Company" |
| Email Draft | AI-generated email awaiting review | "Draft" or "Email" |
| Research Profile | AI-gathered intelligence about prospect | "Research" |
| Response | Reply from prospect to sent email | "Reply" or "Response" |
| Meeting | Booked meeting with prospect | "Meeting" |
| Template | Reusable campaign structure | "Template" |

**Labeling Decisions:**
- ✅ "Campaign" (not "Sequence" or "Batch") - familiar to users
- ✅ "Prospect" in technical contexts, "Company" in user-facing UI
- ✅ "Draft" for emails awaiting approval (not "Suggestion")
- ✅ "Reply" for user-facing, "Response" in analytics
- ✅ "Meeting" (not "Booking" or "Appointment")

### Actions (Verbs)

| Action | Context | Label | Alternative Considered |
|--------|---------|-------|------------------------|
| Create new campaign | Button | "Create Campaign" | "New Campaign" ❌ |
| Upload prospects | Button | "Upload CSV" | "Import" ✅ (secondary) |
| Approve email | Button | "Approve" | "Accept" ❌ |
| Send emails | Button | "Send Emails" | "Start Sending" ✅ |
| Skip prospect | Button | "Skip" | "Pass" ❌ |
| Regenerate draft | Button | "Regenerate" | "Try Again" ❌ |
| View details | Link | "View" | "Details" ✅ |
| Edit inline | Mode | "Edit" | "Modify" ❌ |

**Verb Guidelines:**
- Use action-oriented, clear verbs
- Avoid jargon ("execute", "initiate")
- Match user mental model ("send" not "dispatch")

### Status Labels

#### Campaign Status
```
Draft     → Campaign created but not processing
Processing → Research/drafting in progress
Ready     → Drafts ready for review
Active    → Emails sent, tracking responses
Completed → All prospects processed, no pending actions
Archived  → User-archived for reference
```

#### Prospect Status
```
New         → Just uploaded, not yet researched
Researching → Research in progress
Ready       → Draft ready for review
Approved    → User approved, queued for sending
Sent        → Email sent successfully
Opened      → Prospect opened email
Replied     → Prospect sent a reply
Meeting     → Meeting booked
Skipped     → User chose to skip
Failed      → Technical failure (research or send)
```

#### Email Draft Status
```
Draft      → Initial AI generation
Edited     → User made changes
Approved   → Ready to send
Sent       → Successfully sent
Failed     → Send failed
```

#### Response Classification
```
Positive   → Interested, wants to engage
Objection  → Has concerns or questions
Negative   → Not interested
Unclear    → Needs human review
```

**Visual Indicators:**
- Processing: Spinner icon + blue
- Ready: Checkmark icon + green
- Failed: X icon + red
- Approved: Badge with checkmark
- High Confidence: Green badge
- Medium Confidence: Yellow badge
- Low Confidence: Red badge

---

## Navigation Patterns

### Pattern 1: Hub-and-Spoke
**Dashboard as Central Hub**

```
         ┌─── Campaign A
         │
         ├─── Campaign B
         │
Dashboard ──── Campaign C
         │
         ├─── Analytics
         │
         └─── Settings
```

Users return to dashboard between tasks. Dashboard shows all entry points.

**When to use:**
- First-time users (clear starting point)
- Users checking on multiple campaigns
- Periodic check-ins (not deep work)

### Pattern 2: Linear Flow
**Campaign Creation → Review → Send**

```
Create → Upload → Review → Send → Analytics
  │                                      │
  └────────← Back to Dashboard ←────────┘
```

Users move through sequential steps. Clear progression.

**When to use:**
- Task-oriented workflows (setting up campaign)
- First-time campaign creation
- Steps depend on previous completion

### Pattern 3: Free-Form Navigation
**Email Review Interface**

```
   Email 1 ←→ Email 2 ←→ Email 3
      ↕          ↕          ↕
   Details    Details    Details
      ↕          ↕          ↕
   Actions    Actions    Actions
```

Users navigate freely, no forced order.

**When to use:**
- Review/approval tasks (order doesn't matter)
- Exploration (analytics, research)
- Power users who know what they need

### Pattern 4: Contextual Navigation
**Drill-Down from Dashboard**

```
Dashboard Card: "Denver Restaurants Q1"
    ├─ Quick action: [View Analytics] → Analytics filtered to this campaign
    ├─ Click card → Campaign Detail
    └─ Status: "Ready to Review" → Jump directly to Review interface
```

Actions appear based on current state. Reduces clicks for common tasks.

---

## User Mental Models

### Model 1: Campaign as Project
**User thinking:** "A campaign is like a project with stages."

**IA Support:**
- Campaign has clear lifecycle (setup → process → review → send → track)
- Visual progress indicators at each stage
- Timeline view shows campaign history
- Status labels match project phases

### Model 2: Email as Document
**User thinking:** "Drafts are like documents I need to review and approve."

**IA Support:**
- Review queue like inbox or document approval system
- Edit in-place (familiar from Google Docs)
- Version history (can revert changes)
- Approve/reject actions (like document workflows)

### Model 3: Dashboard as Control Center
**User thinking:** "Dashboard shows me what needs my attention."

**IA Support:**
- Action items prominently displayed
- Notifications and badges for new activity
- Quick links to common tasks
- Status overview for all campaigns

### Model 4: Analytics as Performance Report
**User thinking:** "Analytics show me if I'm hitting my goals."

**IA Support:**
- Key metrics at top (meetings, response rate)
- Progress toward goals visible
- Comparison tools (campaign vs campaign)
- Export for external reporting

---

## Information Scent

### What is Information Scent?
Cues that help users predict what they'll find if they follow a link.

### High-Scent Examples

✅ **Good: Clear Preview**
```
Campaign: "Denver Restaurants Q1"
Status: Ready to Review
42 drafts waiting
[Review Emails] ← Clear what happens next
```

✅ **Good: Descriptive Label with Context**
```
[View Campaign Analytics]
See response rates, meetings booked, and performance trends
```

✅ **Good: Visual Cues**
```
Campaigns (3) ← Badge shows count
New Replies (5) 🔴 ← Red dot indicates unread
```

### Low-Scent Examples

❌ **Bad: Vague Label**
```
[Go] ← Where? To do what?
```

❌ **Bad: No Context**
```
[Details] ← Details of what? What will I see?
```

❌ **Bad: Hidden Actions**
```
Campaign Card with no visible actions
User must click to discover what they can do
```

### Improving Information Scent

**Technique 1: Add Context**
- Before: "View"
- After: "View Campaign Details"

**Technique 2: Show Preview**
- Before: Button only
- After: Button + preview of content ("42 drafts ready")

**Technique 3: Visual Indicators**
- Before: Plain link
- After: Icon + color + badge

**Technique 4: Hover States**
- Show tooltip with more details
- Preview card on hover (for campaigns)

---

## Navigation Patterns by User Type

### New User (First Campaign)
**Primary Path:**
```
Welcome → Connect Gmail → Create Campaign → Upload CSV → 
Wait for Processing → Review Emails → Send → Check Responses
```

**Navigation Needs:**
- Clear guidance (no hidden features)
- Linear flow (avoid confusion)
- Help at each step
- Progress indicators

**IA Support:**
- Onboarding wizard (linear)
- Dashboard shows "Next steps"
- Empty states with clear CTAs
- Contextual help tooltips

---

### Regular User (Batch Work)
**Primary Path:**
```
Dashboard → Campaign X → Review Emails (bulk) → 
Send → Check Replies → Dashboard
```

**Navigation Needs:**
- Fast access to review queue
- Keyboard shortcuts
- Batch actions
- Minimal clicks

**IA Support:**
- Dashboard shows "Needs review" prominently
- Direct link to review interface
- Bulk selection and actions
- Keyboard navigation

---

### Analytical User (Performance Review)
**Primary Path:**
```
Dashboard → Analytics → Drill into specific campaign →
Compare campaigns → Export data
```

**Navigation Needs:**
- Deep-dive capabilities
- Filtering and sorting
- Comparison tools
- Export options

**IA Support:**
- Analytics section with multiple views
- Filters easily accessible
- Drill-down from any metric
- Export buttons visible

---

## Content Hierarchy Examples

### Dashboard Page Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│ Level 1: Page Title                                                  │
│ "Dashboard"                                                          │
│                                                                      │
│ Level 2: Key Metrics (Hero Section)                                 │
│ ┌──────────────────┬──────────────────┬──────────────────┐         │
│ │ Meetings: 8/15   │ Response: 12.5%  │ Time Saved: 5.5h │         │
│ └──────────────────┴──────────────────┴──────────────────┘         │
│                                                                      │
│ Level 3: Action Items                                               │
│ ┌────────────────────────────────────────────────────────┐         │
│ │ ⚠️  Denver Rest Q1: 42 drafts ready to review           │         │
│ │ [Review Now]                                           │         │
│ └────────────────────────────────────────────────────────┘         │
│                                                                      │
│ Level 4: Campaign Status                                            │
│ ┌─────────────┬─────────────┬─────────────┐                        │
│ │ Campaign A  │ Campaign B  │ Campaign C  │                        │
│ │ Status      │ Status      │ Status      │                        │
│ └─────────────┴─────────────┴─────────────┘                        │
│                                                                      │
│ Level 5: Activity Feed                                              │
│ • New reply from Acme Burgers (2 hours ago)                        │
│ • Campaign B: 20 emails sent (5 hours ago)                         │
│                                                                      │
│ Level 6: Resources (Collapsible)                                    │
│ ▾ Tips & Best Practices                                             │
└─────────────────────────────────────────────────────────────────────┘
```

### Campaign Detail Page Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│ Level 1: Campaign Name + Status                                      │
│ "Denver Restaurants Q1" | Status: Active                            │
│                                                                      │
│ Level 2: Tabs (Primary Navigation)                                  │
│ [Overview] [Review] [Prospects] [Analytics] [Settings]              │
│                                                                      │
│ Level 3: Tab Content                                                │
│ (Overview Tab Selected)                                             │
│                                                                      │
│   Level 3a: Key Stats                                               │
│   ┌────────────────┬────────────────┬────────────────┐             │
│   │ Sent: 38       │ Response: 15%  │ Meetings: 3    │             │
│   └────────────────┴────────────────┴────────────────┘             │
│                                                                      │
│   Level 3b: Progress Timeline                                       │
│   Created → Processed → Reviewed → Sent → Active                   │
│                                                           ^         │
│                                                           └─ You    │
│                                                                      │
│   Level 3c: Quick Actions                                           │
│   [Review Remaining Drafts] [View Analytics] [Create Follow-up]    │
│                                                                      │
│   Level 3d: Prospect Summary                                        │
│   (Table with 10 rows, link to see all)                            │
│                                                                      │
│ Level 4: Supporting Information                                     │
│ Created: Jan 10, 2025 | Template: Social Media Upgrade             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Search & Discovery

### Global Search (Future)
Location: Top navigation bar (right of tabs)

**Search Scope:**
- Campaigns (by name, template, date)
- Prospects (by company name, email)
- Emails (by subject, content)
- Responses (by content, sender)

**Search Results:**
```
Results for "Acme"

Prospects (2)
  • Acme Burgers - Denver Restaurants Q1
  • Acme Coffee - Product Demo Campaign

Campaigns (0)

Email Drafts (1)
  • Subject: "Video opportunity for Acme Burgers"
```

### Filters & Sorting

**Campaign List Filters:**
- Status: All | Active | Completed | Archived
- Template: All | Social Media | Product Demo | Custom
- Date Range: Last 7 days | 30 days | 90 days | All time

**Prospect List Filters:**
- Status: All | Sent | Replied | Meeting | Skipped
- Confidence: All | High | Medium | Low
- Response: All | Positive | Objection | Negative

**Sort Options:**
- Date (newest/oldest)
- Name (A-Z)
- Status
- Confidence (high to low)
- Response rate (campaigns)

---

## Mobile Navigation

### Simplified Structure
Mobile users have different priorities: checking status and managing responses.

```
Mobile Navigation (Bottom Nav Bar)
├── Dashboard (default)
├── Campaigns (list only)
├── Replies (priority feature)
└── Menu (settings, profile)
```

**Removed from Mobile:**
- Campaign creation (desktop task)
- Email review/editing (too complex)
- Deep analytics (better on desktop)

**Optimized for Mobile:**
- Response checking (primary use case)
- Campaign status overview
- Quick approval of high-confidence drafts (future)

### Mobile Information Hierarchy

```
Mobile Dashboard (Single Column)

[Key Metric Cards]
Stacked vertically, swipeable

[Action Items]
Large touch targets

[Campaign Status]
Condensed cards

[Recent Activity]
Simplified feed
```

---

## Breadcrumbs

### When to Use Breadcrumbs
✅ Use for deep hierarchies (3+ levels)
✅ Use in campaign detail and nested views
❌ Don't use on dashboard (top-level)
❌ Don't use in modal workflows

### Breadcrumb Examples

**Campaign Detail:**
```
Campaigns > Denver Restaurants Q1 > Analytics
```

**Prospect Detail:**
```
Campaigns > Denver Restaurants Q1 > Prospects > Acme Burgers
```

**Settings:**
```
Settings > Integrations > Gmail
```

**Format:**
- Clickable: All except current page
- Separator: ">" or "/"
- Truncate long names: "Denver Rest... > Analytics"

---

## URL Structure

### URL Patterns
```
/dashboard
/campaigns
/campaigns/new
/campaigns/:campaignId
/campaigns/:campaignId/review
/campaigns/:campaignId/prospects
/campaigns/:campaignId/prospects/:prospectId
/campaigns/:campaignId/analytics
/analytics
/settings
/settings/profile
/settings/integrations
```

### URL Best Practices
- ✅ Readable and meaningful
- ✅ Consistent structure
- ✅ Shareable (deep links work)
- ✅ Preserve state in query params (filters, page)
  - Example: `/campaigns?status=active&sort=date`
- ✅ Use slugs for campaigns (optional)
  - `/campaigns/denver-restaurants-q1`

---

## Empty States

### Purpose
Guide users when content is missing, don't just show "No data".

### Campaign List (No Campaigns Yet)

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                          [Illustration]                              │
│                                                                      │
│                   Ready to start prospecting?                        │
│                                                                      │
│           Create your first campaign to begin sending               │
│           personalized emails powered by AI.                         │
│                                                                      │
│                      [Create Campaign]                               │
│                                                                      │
│               Or watch our 2-minute getting started video           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Replies (No Responses Yet)

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                       [Mailbox Illustration]                         │
│                                                                      │
│                      No replies yet                                  │
│                                                                      │
│           Responses typically arrive within 24-48 hours.            │
│           We'll notify you as soon as someone replies!              │
│                                                                      │
│                  [View Sent Campaigns]                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Search (No Results)

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                       [Search Illustration]                          │
│                                                                      │
│               No results found for "Acme Coffee"                     │
│                                                                      │
│           Try different keywords or check your spelling              │
│                                                                      │
│                  [Clear Search]                                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Information Architecture Testing

### Card Sorting (Future)
Run card sorting sessions with target users to validate:
- Category names make sense
- Groupings are intuitive
- Navigation labels are clear

### Tree Testing (Future)
Test if users can find specific information:
- "Where would you go to see how many meetings you've booked?"
- "How would you create a new campaign?"
- "Where would you check if someone replied to your email?"

### Metrics to Track
- **Task Success Rate**: Can users complete navigation tasks?
- **Time on Task**: How quickly can users find what they need?
- **Navigation Paths**: Are users taking expected routes?
- **Bounce Rate**: Are users leaving after seeing page?

---

## IA Maintenance & Evolution

### When to Revisit IA
- Adding major new features
- User feedback indicates confusion
- Analytics show unexpected navigation patterns
- Expanding to new user segments

### IA Change Process
1. Identify issue (user feedback, analytics)
2. Propose IA change
3. Validate with testing (if major change)
4. Implement incrementally
5. Measure impact
6. Iterate

---

**Next Document:** [Wireframes →](./03-Wireframes.md)
