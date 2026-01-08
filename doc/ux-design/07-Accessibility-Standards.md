# Accessibility Standards
## ProspectFlow - WCAG 2.1 AA Compliance Guide

**Version:** 1.0  
**Date:** January 2025

---

## Overview

ProspectFlow is committed to building an accessible product that can be used by everyone, regardless of ability. This document defines our accessibility standards based on WCAG 2.1 Level AA compliance.

**Target:** WCAG 2.1 Level AA Conformance

---

## Why Accessibility Matters

### Business Reasons
- **Larger Market:** 15% of world population has some form of disability
- **Legal Compliance:** ADA, Section 508, AODA regulations
- **Better UX:** Accessibility improvements benefit all users
- **SEO:** Semantic HTML and structure improve search rankings

### Ethical Reasons
- **Inclusive by Design:** Everyone deserves equal access
- **Professional Tool:** Freelancers with disabilities deserve great tools
- **Right Thing:** Accessibility is a human right

---

## WCAG 2.1 Principles (POUR)

### 1. Perceivable
Information and UI components must be presentable to users in ways they can perceive.

### 2. Operable
UI components and navigation must be operable by all users.

### 3. Understandable
Information and operation of UI must be understandable.

### 4. Robust
Content must be robust enough to be interpreted by a wide variety of user agents, including assistive technologies.

---

## Level AA Requirements Checklist

### ✅ Perceivable

#### 1.1 Text Alternatives
**Requirement:** Provide text alternatives for non-text content.

**Implementation:**
- ✅ All images have `alt` text
- ✅ Decorative images have `alt=""` (empty)
- ✅ Icons have `aria-label` or text equivalent
- ✅ Charts have text descriptions
- ✅ Videos have captions

**Examples:**
```tsx
// Meaningful image
<img src="campaign-chart.png" alt="Campaign performance chart showing 12% response rate" />

// Decorative image
<img src="separator.png" alt="" role="presentation" />

// Icon button
<button aria-label="Settings">
  <SettingsIcon aria-hidden="true" />
</button>

// Complex chart
<div role="img" aria-label="Bar chart showing 3 campaigns with response rates of 10%, 12%, and 15%">
  <svg>...</svg>
</div>
```

#### 1.3 Adaptable
**Requirement:** Content can be presented in different ways without losing information.

**Implementation:**
- ✅ Use semantic HTML (heading hierarchy, lists, tables)
- ✅ Content order makes sense when CSS is disabled
- ✅ Form labels properly associated with inputs
- ✅ Tables have proper headers

**Examples:**
```tsx
// Semantic structure
<main>
  <h1>Dashboard</h1>
  <section>
    <h2>Key Metrics</h2>
    <ul>
      <li>Meetings: 8</li>
      <li>Response Rate: 12%</li>
    </ul>
  </section>
</main>

// Proper form labels
<label htmlFor="email">Email Address</label>
<input id="email" type="email" name="email" />

// Table headers
<table>
  <thead>
    <tr>
      <th scope="col">Company</th>
      <th scope="col">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Acme Inc</td>
      <td>Active</td>
    </tr>
  </tbody>
</table>
```

#### 1.4 Distinguishable
**Requirement:** Make it easy for users to see and hear content.

**Implementation:**
- ✅ Color contrast ratio ≥ 4.5:1 for normal text
- ✅ Color contrast ratio ≥ 3:1 for large text (18pt+)
- ✅ Color contrast ratio ≥ 3:1 for UI components
- ✅ Text can be resized to 200% without loss of functionality
- ✅ Don't use color alone to convey information

**Color Contrast Examples:**
```css
/* GOOD: Black text on white bg = 21:1 ratio */
color: #000000;
background: #FFFFFF;

/* GOOD: Dark gray on white = 12.6:1 */
color: #1F2937;
background: #FFFFFF;

/* BORDERLINE: Light gray on white = 4.5:1 (minimum) */
color: #6B7280;
background: #FFFFFF;

/* BAD: Too light gray = 2.9:1 ❌ */
color: #9CA3AF;
background: #FFFFFF;
```

**Color + Icon:**
```tsx
// BAD: Color only
<Badge className="text-red-600">Error</Badge>

// GOOD: Color + icon + text
<Badge className="text-red-600">
  <ErrorIcon aria-hidden="true" />
  Error
</Badge>
```

---

### ✅ Operable

#### 2.1 Keyboard Accessible
**Requirement:** All functionality available from keyboard.

**Implementation:**
- ✅ All interactive elements reachable via Tab
- ✅ Logical tab order (left-to-right, top-to-bottom)
- ✅ No keyboard traps (can always escape)
- ✅ Skip links for screen readers
- ✅ Focus visible on all interactive elements

**Tab Order Example:**
```tsx
// Ensure logical tab order matches visual order
<form>
  <input id="name" tabIndex={1} /> {/* First */}
  <input id="email" tabIndex={2} /> {/* Second */}
  <button type="submit" tabIndex={3}> {/* Third */}
    Submit
  </button>
</form>

// Better: Let browser determine order naturally
<form>
  <input id="name" />
  <input id="email" />
  <button type="submit">Submit</button>
</form>
```

**Skip Links:**
```tsx
// Allow keyboard users to skip navigation
<a href="#main-content" className="skip-link">
  Skip to main content
</a>

<nav>...</nav>

<main id="main-content">
  <h1>Dashboard</h1>
  ...
</main>

// CSS
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
}

.skip-link:focus {
  top: 0;
}
```

#### 2.2 Enough Time
**Requirement:** Provide users enough time to read and use content.

**Implementation:**
- ✅ No time limits on forms (or can extend)
- ✅ Auto-advancing carousels have pause button
- ✅ Session timeout warnings with option to extend

**Example:**
```tsx
// Session timeout warning
<Modal open={showTimeoutWarning}>
  <Modal.Header>Session Expiring</Modal.Header>
  <Modal.Body>
    Your session will expire in 2 minutes due to inactivity.
  </Modal.Body>
  <Modal.Footer>
    <Button onClick={extendSession}>Continue Working</Button>
    <Button variant="secondary" onClick={logout}>Log Out</Button>
  </Modal.Footer>
</Modal>
```

#### 2.3 Seizures
**Requirement:** Do not design content that could cause seizures.

**Implementation:**
- ✅ Nothing flashes more than 3 times per second
- ✅ No large flashing areas
- ✅ Animations respect `prefers-reduced-motion`

**Reduced Motion:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

#### 2.4 Navigable
**Requirement:** Provide ways to help users navigate, find content, and determine location.

**Implementation:**
- ✅ Descriptive page titles
- ✅ Logical heading hierarchy (h1 → h2 → h3)
- ✅ Focus order follows reading order
- ✅ Link purpose clear from link text
- ✅ Multiple ways to find pages (search, nav, sitemap)
- ✅ Breadcrumbs show location

**Page Titles:**
```tsx
<Helmet>
  <title>Review Emails - Denver Restaurants Q1 - ProspectFlow</title>
</Helmet>
// Pattern: Task - Context - App Name
```

**Descriptive Links:**
```tsx
// BAD: Not descriptive
<a href="/campaigns/123">Click here</a>

// GOOD: Descriptive
<a href="/campaigns/123">View Denver Restaurants Q1 campaign</a>

// GOOD: Context clear from surrounding text
<p>Campaign: Denver Restaurants Q1</p>
<a href="/campaigns/123">View details</a>
```

#### 2.5 Input Modalities
**Requirement:** Make it easier to operate functionality through various inputs.

**Implementation:**
- ✅ Touch targets ≥ 44x44px (mobile)
- ✅ Gestures don't require precision (e.g., multi-finger swipe)
- ✅ Label in name matches visible label
- ✅ Motion actuation can be disabled

---

### ✅ Understandable

#### 3.1 Readable
**Requirement:** Make text content readable and understandable.

**Implementation:**
- ✅ Language of page identified (`lang` attribute)
- ✅ Language of parts identified if different

**Examples:**
```tsx
<html lang="en">
  <head>...</head>
  <body>
    <p>This is English text.</p>
    <p lang="es">Este texto está en español.</p>
  </body>
</html>
```

#### 3.2 Predictable
**Requirement:** Web pages appear and operate in predictable ways.

**Implementation:**
- ✅ No change of context on focus
- ✅ No change of context on input (unless user warned)
- ✅ Consistent navigation across pages
- ✅ Consistent identification of components

**Examples:**
```tsx
// BAD: Dropdown auto-submits on selection
<Select onChange={handleSubmit}>

// GOOD: Dropdown doesn't submit until button clicked
<Select onChange={handleSelect} />
<Button onClick={handleSubmit}>Apply Filter</Button>

// BAD: Inconsistent navigation
// Page 1: [Home] [Campaigns] [Analytics]
// Page 2: [Dashboard] [Projects] [Stats]

// GOOD: Consistent navigation
// All pages: [Dashboard] [Campaigns] [Analytics]
```

#### 3.3 Input Assistance
**Requirement:** Help users avoid and correct mistakes.

**Implementation:**
- ✅ Form errors clearly identified
- ✅ Labels and instructions provided
- ✅ Error suggestions provided
- ✅ Confirmation for destructive actions
- ✅ Ability to review and correct before submission

**Error Handling:**
```tsx
<div>
  <Label htmlFor="email">
    Email Address
    <span className="text-red-600" aria-label="required">*</span>
  </Label>
  
  <Input
    id="email"
    type="email"
    value={email}
    onChange={setEmail}
    aria-invalid={!!emailError}
    aria-describedby={emailError ? "email-error" : undefined}
  />
  
  {emailError && (
    <div id="email-error" role="alert" className="text-red-600">
      <ErrorIcon aria-hidden="true" />
      {emailError}
      <p className="text-sm">Please enter a valid email like user@example.com</p>
    </div>
  )}
</div>
```

**Confirmation:**
```tsx
// Destructive action
const handleDelete = () => {
  if (confirm('Are you sure you want to delete this campaign? This cannot be undone.')) {
    deleteCampaign();
  }
};

// Better: Use modal
<Modal open={showDeleteConfirm}>
  <Modal.Header>Confirm Deletion</Modal.Header>
  <Modal.Body>
    Are you sure you want to delete <strong>Denver Restaurants Q1</strong>? 
    This will permanently delete all emails, responses, and analytics. 
    This action cannot be undone.
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={closeModal}>Cancel</Button>
    <Button variant="danger" onClick={confirmDelete}>Delete Campaign</Button>
  </Modal.Footer>
</Modal>
```

---

### ✅ Robust

#### 4.1 Compatible
**Requirement:** Maximize compatibility with current and future user agents.

**Implementation:**
- ✅ Valid HTML (no syntax errors)
- ✅ Proper ARIA roles and attributes
- ✅ Elements have unique IDs
- ✅ Status messages use appropriate ARIA

**ARIA Roles:**
```tsx
// Navigation
<nav role="navigation" aria-label="Main navigation">
  <ul>
    <li><a href="/dashboard">Dashboard</a></li>
    <li><a href="/campaigns">Campaigns</a></li>
  </ul>
</nav>

// Search
<form role="search" aria-label="Search campaigns">
  <input type="search" aria-label="Search" />
  <button type="submit">Search</button>
</form>

// Status messages
<div role="status" aria-live="polite">
  Campaign created successfully
</div>

<div role="alert" aria-live="assertive">
  Error: Failed to send emails
</div>
```

---

## Component-Specific Guidelines

### Buttons

```tsx
// Good button
<button
  type="button"
  onClick={handleClick}
  disabled={isDisabled}
  aria-label="Create new campaign"
>
  <PlusIcon aria-hidden="true" />
  Create Campaign
</button>

// Icon-only button
<button
  type="button"
  onClick={handleSettings}
  aria-label="Open settings"
>
  <SettingsIcon aria-hidden="true" />
</button>
```

**Requirements:**
- ✅ Clear label (visible or aria-label)
- ✅ Type attribute specified
- ✅ Disabled state properly indicated
- ✅ Icons marked `aria-hidden="true"`

### Forms

```tsx
<form onSubmit={handleSubmit}>
  <div>
    <label htmlFor="campaign-name">
      Campaign Name
      <span aria-label="required">*</span>
    </label>
    
    <input
      id="campaign-name"
      name="name"
      type="text"
      required
      aria-required="true"
      aria-describedby="name-help"
    />
    
    <span id="name-help" className="help-text">
      Choose a name you'll recognize later
    </span>
  </div>
  
  <button type="submit">Create Campaign</button>
</form>
```

**Requirements:**
- ✅ All inputs have labels
- ✅ Labels associated via `for`/`id` or wrapping
- ✅ Required fields marked with `required` and `aria-required`
- ✅ Help text associated with `aria-describedby`
- ✅ Errors associated with `aria-describedby` and `aria-invalid`

### Modals

```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">Confirm Action</h2>
  <p id="modal-description">
    Are you sure you want to proceed?
  </p>
  
  <button onClick={handleConfirm}>Confirm</button>
  <button onClick={handleCancel}>Cancel</button>
</div>
```

**Requirements:**
- ✅ `role="dialog"` and `aria-modal="true"`
- ✅ Title associated with `aria-labelledby`
- ✅ Description associated with `aria-describedby`
- ✅ Focus trapped within modal
- ✅ Escape key closes modal
- ✅ Focus returned to trigger on close

### Tables

```tsx
<table>
  <caption>Campaign Performance Summary</caption>
  <thead>
    <tr>
      <th scope="col">Campaign Name</th>
      <th scope="col">Emails Sent</th>
      <th scope="col">Response Rate</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Denver Restaurants Q1</th>
      <td>38</td>
      <td>15.8%</td>
    </tr>
  </tbody>
</table>
```

**Requirements:**
- ✅ `<caption>` or `aria-label` describes table
- ✅ `<th>` elements have `scope` attribute
- ✅ Row headers use `<th scope="row">`
- ✅ Complex tables have `headers` attribute

### Cards

```tsx
<article
  role="article"
  aria-labelledby="campaign-title-123"
>
  <h3 id="campaign-title-123">Denver Restaurants Q1</h3>
  
  <dl>
    <dt>Status</dt>
    <dd>
      <span className="badge badge-success">Active</span>
    </dd>
    
    <dt>Emails Sent</dt>
    <dd>38</dd>
    
    <dt>Response Rate</dt>
    <dd>15.8%</dd>
  </dl>
  
  <a href="/campaigns/123">View campaign details</a>
</article>
```

**Requirements:**
- ✅ Use `<article>` for card container
- ✅ Heading properly associated
- ✅ Use definition list for key-value pairs
- ✅ Link text describes destination

---

## Screen Reader Testing

### Tools

**Free Screen Readers:**
- **macOS:** VoiceOver (built-in) - Cmd+F5 to enable
- **Windows:** NVDA (free) - https://www.nvaccess.org/
- **Windows:** JAWS (paid, industry standard)
- **iOS:** VoiceOver (built-in)
- **Android:** TalkBack (built-in)

### Testing Checklist

#### Page Load
- [ ] Page title announced
- [ ] Main landmark identified
- [ ] Heading hierarchy makes sense

#### Navigation
- [ ] All links announced with clear text
- [ ] Current page indicated
- [ ] Skip links work

#### Forms
- [ ] All labels announced
- [ ] Required fields identified
- [ ] Error messages announced
- [ ] Success messages announced

#### Interactive Elements
- [ ] Buttons announce label and role
- [ ] Button state (pressed, expanded) announced
- [ ] Disabled state announced

#### Dynamic Content
- [ ] Loading states announced
- [ ] Error messages announced
- [ ] Success messages announced
- [ ] New content (via AJAX) announced

### VoiceOver Testing (macOS)

**Basic Commands:**
- `Cmd+F5`: Turn on/off
- `Ctrl+Option+Right`: Next element
- `Ctrl+Option+Left`: Previous element
- `Ctrl+Option+U`: Rotor (links, headings, landmarks)
- `Ctrl+Option+Space`: Activate element

**Test Script:**
1. Enable VoiceOver
2. Navigate using Tab key only
3. Try to complete key tasks (create campaign, review email)
4. Check that all information is accessible
5. Verify forms can be completed
6. Test dynamic content updates

---

## ARIA Patterns Reference

### Live Regions

```tsx
// Polite (doesn't interrupt)
<div role="status" aria-live="polite">
  Campaign created successfully
</div>

// Assertive (interrupts)
<div role="alert" aria-live="assertive">
  Error: Connection lost
</div>

// Atomic updates
<div role="status" aria-live="polite" aria-atomic="true">
  Processing 12 of 38 emails...
</div>
```

### Button States

```tsx
// Toggle button
<button
  aria-pressed={isPressed}
  onClick={togglePress}
>
  {isPressed ? 'On' : 'Off'}
</button>

// Menu button
<button
  aria-expanded={isOpen}
  aria-controls="menu-123"
  onClick={toggleMenu}
>
  Options
</button>
```

### Tabs

```tsx
<div>
  <div role="tablist" aria-label="Campaign views">
    <button
      role="tab"
      aria-selected={activeTab === 'overview'}
      aria-controls="overview-panel"
      id="overview-tab"
      onClick={() => setActiveTab('overview')}
    >
      Overview
    </button>
    <button
      role="tab"
      aria-selected={activeTab === 'analytics'}
      aria-controls="analytics-panel"
      id="analytics-tab"
      onClick={() => setActiveTab('analytics')}
    >
      Analytics
    </button>
  </div>
  
  <div
    role="tabpanel"
    id="overview-panel"
    aria-labelledby="overview-tab"
    hidden={activeTab !== 'overview'}
  >
    Overview content
  </div>
  
  <div
    role="tabpanel"
    id="analytics-panel"
    aria-labelledby="analytics-tab"
    hidden={activeTab !== 'analytics'}
  >
    Analytics content
  </div>
</div>
```

---

## Automated Testing

### Tools

1. **axe DevTools** (Chrome/Firefox extension)
   - Install from browser store
   - Run on each page
   - Fix all Critical and Serious issues

2. **Lighthouse** (Chrome DevTools)
   - Open DevTools → Lighthouse tab
   - Run Accessibility audit
   - Aim for 90+ score

3. **WAVE** (Web Accessibility Evaluation Tool)
   - Browser extension
   - Visual feedback on page

### CI/CD Integration

```javascript
// jest-axe example
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('Dashboard should have no accessibility violations', async () => {
  const { container } = render(<Dashboard />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Automated Checks Catch:
- ✅ Missing alt text
- ✅ Color contrast issues
- ✅ Missing labels
- ✅ Invalid ARIA
- ✅ Heading hierarchy problems

### Manual Checks Still Needed:
- ⚠️ Keyboard navigation flow
- ⚠️ Screen reader announcements
- ⚠️ Focus management
- ⚠️ Context and meaning

---

## Common Accessibility Mistakes

### ❌ Mistake 1: Div/Span as Button

```tsx
// BAD
<div onClick={handleClick}>Click me</div>

// GOOD
<button onClick={handleClick}>Click me</button>
```

**Why:** Divs aren't keyboard accessible and don't announce as buttons.

### ❌ Mistake 2: Placeholder as Label

```tsx
// BAD
<input placeholder="Email" />

// GOOD
<label htmlFor="email">Email</label>
<input id="email" placeholder="you@example.com" />
```

**Why:** Placeholders disappear, not announced as labels.

### ❌ Mistake 3: Icons Without Text

```tsx
// BAD
<button><TrashIcon /></button>

// GOOD
<button aria-label="Delete">
  <TrashIcon aria-hidden="true" />
</button>
```

**Why:** Screen readers can't describe icon meaning.

### ❌ Mistake 4: Color Only

```tsx
// BAD
<span className="text-red-600">Error</span>

// GOOD
<span className="text-red-600">
  <ErrorIcon aria-hidden="true" />
  Error
</span>
```

**Why:** Color-blind users can't distinguish.

### ❌ Mistake 5: Auto-Playing Content

```tsx
// BAD
<video autoplay />

// GOOD
<video controls>
  <track kind="captions" src="captions.vtt" />
</video>
```

**Why:** Can't be stopped, no captions.

---

## Accessibility QA Checklist

### Before Release

#### Automated Tests
- [ ] Run axe DevTools on all pages
- [ ] Run Lighthouse accessibility audit
- [ ] Fix all Critical and Serious issues
- [ ] Achieve ≥90 Lighthouse score

#### Keyboard Testing
- [ ] All interactive elements reachable via Tab
- [ ] Tab order logical
- [ ] Focus visible on all elements
- [ ] No keyboard traps
- [ ] Modals trap focus correctly
- [ ] Can close all modals with Escape

#### Screen Reader Testing
- [ ] Test with VoiceOver (macOS/iOS)
- [ ] Test with NVDA (Windows)
- [ ] All content announced correctly
- [ ] Form labels announced
- [ ] Errors announced
- [ ] Dynamic content updates announced

#### Visual Testing
- [ ] Color contrast ≥4.5:1 for text
- [ ] Color contrast ≥3:1 for UI elements
- [ ] Text resizable to 200% without breaking
- [ ] Content doesn't rely on color alone

#### Mobile Testing
- [ ] Touch targets ≥44x44px
- [ ] Works with iOS VoiceOver
- [ ] Works with Android TalkBack

---

## Resources

### Documentation
- **WCAG 2.1:** https://www.w3.org/WAI/WCAG21/quickref/
- **ARIA Practices:** https://www.w3.org/WAI/ARIA/apg/
- **MDN Accessibility:** https://developer.mozilla.org/en-US/docs/Web/Accessibility

### Tools
- **axe DevTools:** https://www.deque.com/axe/devtools/
- **WAVE:** https://wave.webaim.org/
- **Color Contrast Checker:** https://webaim.org/resources/contrastchecker/

### Testing
- **Screen Readers:** NVDA, JAWS, VoiceOver, TalkBack
- **Lighthouse:** Chrome DevTools
- **Keyboard Testing:** Tab, Arrow keys, Enter, Space, Escape

---

## Summary

### Our Commitment
ProspectFlow is committed to WCAG 2.1 Level AA compliance for all core features.

### Key Principles
1. **Keyboard Accessible:** Everything works without a mouse
2. **Screen Reader Friendly:** All content announced correctly
3. **Visually Clear:** High contrast, clear labels
4. **Predictable:** Consistent patterns, no surprises
5. **Forgiving:** Clear errors, easy to correct

### Continuous Improvement
- Monthly accessibility audits
- User feedback from disabled users
- Stay updated with WCAG 2.2 and beyond
- Regular team training

---

**End of UX Design Documentation Suite**

---

**Complete Document Index:**
1. [UX Design Overview](./00-UX-Design-Overview.md)
2. [User Flow Diagrams](./01-User-Flow-Diagrams.md)
3. [Information Architecture](./02-Information-Architecture.md)
4. [Wireframes](./03-Wireframes.md)
5. [Component Specifications](./04-Component-Specifications.md)
6. [Interaction Patterns](./05-Interaction-Patterns.md)
7. [Responsive Design Guidelines](./06-Responsive-Design-Guidelines.md)
8. [Accessibility Standards](./07-Accessibility-Standards.md) ← You are here
