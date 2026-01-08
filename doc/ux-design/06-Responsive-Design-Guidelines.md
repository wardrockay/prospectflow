# Responsive Design Guidelines
## ProspectFlow - Multi-Device Experience

**Version:** 1.0  
**Date:** January 2025

---

## Overview

ProspectFlow is designed as a desktop-first application with mobile support for viewing and quick actions. This document defines how the interface adapts across different screen sizes and devices.

---

## Design Philosophy

### Desktop-First Approach
**Rationale:** Core workflows (campaign creation, email review/editing) require:
- Large screen for context
- Keyboard shortcuts for efficiency
- Multiple information panels side-by-side

### Mobile Purpose
**Primary Use Cases:**
1. Check campaign status
2. View responses
3. Quick approve high-confidence drafts
4. Track metrics on-the-go

**Not Supported on Mobile:**
- Campaign creation
- Complex email editing
- CSV upload
- Detailed analytics manipulation

---

## Breakpoint Strategy

### Breakpoint Definitions

```css
/* Tailwind CSS default breakpoints */
sm: 640px   /* Small tablet, large phone landscape */
md: 768px   /* Tablet portrait */
lg: 1024px  /* Desktop, laptop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large desktop */
```

### Device Categories

| Category | Width Range | Breakpoint | Use Case |
|----------|-------------|------------|----------|
| Mobile | 320-639px | < sm | Phone portrait |
| Tablet | 640-1023px | sm-md | Tablet, phone landscape |
| Desktop | 1024-1279px | lg | Laptop, small desktop |
| Large Desktop | 1280px+ | xl-2xl | Large monitors |

---

## Layout Adaptations

### 1. Dashboard

#### Desktop (lg+)
```
┌─────────────────────────────────────────────────────────────┐
│ Navigation (horizontal)                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┬─────────┬─────────┐                           │
│  │ Metric  │ Metric  │ Metric  │  (3-column grid)          │
│  └─────────┴─────────┴─────────┘                           │
│                                                              │
│  ┌─────────┬─────────┬─────────┐                           │
│  │ Metric  │ Metric  │ Metric  │                           │
│  └─────────┴─────────┴─────────┘                           │
│                                                              │
│  ┌─────────────────────────────────────────────┐           │
│  │ Action Items                                 │           │
│  └─────────────────────────────────────────────┘           │
│                                                              │
│  ┌─────────┬─────────┬─────────┐                           │
│  │Campaign │Campaign │Campaign │  (3-column)               │
│  └─────────┴─────────┴─────────┘                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Tablet (sm-md)
```
┌────────────────────────────────────────┐
│ Navigation (horizontal)                 │
├────────────────────────────────────────┤
│                                         │
│  ┌───────────┬───────────┐            │
│  │ Metric    │ Metric    │  (2-column)│
│  └───────────┴───────────┘            │
│                                         │
│  ┌───────────┬───────────┐            │
│  │ Metric    │ Metric    │            │
│  └───────────┴───────────┘            │
│                                         │
│  ┌───────────┬───────────┐            │
│  │ Metric    │ Metric    │            │
│  └───────────┴───────────┘            │
│                                         │
│  ┌─────────────────────────────┐      │
│  │ Action Items (stacked)       │      │
│  └─────────────────────────────┘      │
│                                         │
│  ┌───────────┬───────────┐            │
│  │Campaign   │Campaign   │  (2-column)│
│  └───────────┴───────────┘            │
│                                         │
└────────────────────────────────────────┘
```

#### Mobile (< sm)
```
┌────────────────────────────┐
│ ☰  ProspectFlow    👤 🔔   │
├────────────────────────────┤
│                             │
│  < Swipeable Carousel >     │
│  ┌──────────────────────┐  │
│  │ Metric 1             │  │
│  └──────────────────────┘  │
│                             │
│  ┌──────────────────────┐  │
│  │ Action Items         │  │
│  │ (Stacked, priority)  │  │
│  └──────────────────────┘  │
│                             │
│  ┌──────────────────────┐  │
│  │ Campaign 1           │  │
│  │ (Single column)      │  │
│  └──────────────────────┘  │
│                             │
│  ┌──────────────────────┐  │
│  │ Campaign 2           │  │
│  └──────────────────────┘  │
│                             │
├────────────────────────────┤
│ Bottom Navigation (sticky) │
│ [Home][Campaigns][Replies] │
└────────────────────────────┘
```

### 2. Email Review Interface

#### Desktop (lg+)
```
Split view: 60% email draft, 40% research context
Side-by-side panels
Full keyboard shortcuts
Inline editing
```

#### Tablet (sm-md)
```
Tabs: [Email] [Research]
Single panel at a time
Touch-optimized buttons (larger targets)
Limited keyboard shortcuts
```

#### Mobile (< sm)
```
Full-screen email view
Swipe up for research drawer
Large action buttons at bottom
No inline editing (view only + approve/skip)
```

---

## Component Responsive Behavior

### Buttons

| Screen Size | Size | Padding | Font Size |
|-------------|------|---------|-----------|
| Mobile | 48px height | 16px | 16px |
| Tablet | 44px height | 14px | 15px |
| Desktop | 40px height | 12px/20px | 16px |

**Rationale:** Mobile buttons need larger touch targets (min 44px per Apple HIG).

### Cards

| Screen Size | Width | Padding | Shadow |
|-------------|-------|---------|--------|
| Mobile | 100% (full width) | 16px | sm |
| Tablet | ~48% (2-column grid) | 20px | sm |
| Desktop | ~32% (3-column grid) | 24px | md |

### Tables

#### Desktop
```
Full table with all columns
Sortable headers
Hoverable rows
```

#### Tablet
```
Fewer columns (hide optional data)
Scrollable horizontally
Tap row for details
```

#### Mobile
```
Card-based view (no table)
Each row becomes a card
Tap card for full details
```

**Example:**
```tsx
// Desktop: Table
<table>
  <tr>
    <td>Acme Burgers</td>
    <td>john@acme.com</td>
    <td>Meeting Booked</td>
    <td>Jan 14, 2025</td>
  </tr>
</table>

// Mobile: Card
<div className="card">
  <h3>Acme Burgers</h3>
  <p>john@acme.com</p>
  <Badge>Meeting Booked</Badge>
  <span>Jan 14, 2025</span>
</div>
```

### Navigation

#### Desktop (lg+)
```
Horizontal tabs in header
Always visible
```

#### Tablet (sm-md)
```
Horizontal tabs (may collapse to dropdown if many)
```

#### Mobile (< sm)
```
Bottom navigation bar (sticky)
3-5 primary destinations
Icon + label
```

**Mobile Bottom Nav:**
```
┌────────────────────────────────┐
│ [🏠 Home] [📊 Campaigns] [💬 Replies] [⚙️ More] │
└────────────────────────────────┘
```

---

## Touch Target Guidelines

### Minimum Sizes
- **Mobile:** 44x44px (Apple), 48x48px (Google)
- **Tablet:** 40x40px
- **Desktop:** No minimum (can use mouse precision)

### Spacing
- **Mobile:** Min 8px between interactive elements
- **Tablet:** Min 4px
- **Desktop:** Flexible

### Examples

```tsx
// Button - Mobile
<Button className="h-12 px-6 text-base">
  Large Touch Target
</Button>

// Button - Desktop
<Button className="h-10 px-5 text-sm">
  Smaller Mouse Target
</Button>
```

---

## Typography Scaling

### Base Font Sizes

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Body | 16px | 16px | 16px |
| Small | 14px | 14px | 14px |
| H1 | 28px | 32px | 36px |
| H2 | 22px | 24px | 24px |
| H3 | 18px | 18px | 18px |
| Display | 36px | 42px | 48px |

### Line Heights
- Mobile: 1.5-1.6 (more line height for readability)
- Desktop: 1.4-1.5

### Content Width
- Maximum line length: 65-75 characters
- Mobile: Full width (minus padding)
- Desktop: Max 680px for body text

```css
.prose {
  max-width: 680px;
  line-height: 1.5;
}

@media (max-width: 640px) {
  .prose {
    max-width: 100%;
    line-height: 1.6;
  }
}
```

---

## Image & Media Handling

### Responsive Images

```tsx
<img
  src="/images/hero-mobile.jpg"
  srcSet="
    /images/hero-mobile.jpg 640w,
    /images/hero-tablet.jpg 1024w,
    /images/hero-desktop.jpg 1920w
  "
  sizes="
    (max-width: 640px) 640px,
    (max-width: 1024px) 1024px,
    1920px
  "
  alt="Description"
/>
```

### Videos
- Desktop: Inline player
- Mobile: Full-screen on play (native behavior)
- Always provide controls

### Icons
- SVG preferred (scales perfectly)
- Mobile: 24x24px
- Desktop: 20x20px
- Use current color for flexibility

---

## Form Responsive Patterns

### Form Layout

#### Desktop
```
┌─────────────────────────────────┐
│ Label          Input (50% width)│
│ Label          Input            │
│                [Submit] [Cancel]│
└─────────────────────────────────┘
```

#### Mobile
```
┌─────────────────┐
│ Label           │
│ Input (100%)    │
│                 │
│ Label           │
│ Input (100%)    │
│                 │
│ [Submit (100%)] │
│ [Cancel (100%)] │
└─────────────────┘
```

### Input Types
- Mobile: Use appropriate keyboard type
  - `type="email"` → Email keyboard
  - `type="tel"` → Number pad
  - `type="number"` → Numeric keyboard
  - `type="url"` → URL keyboard with .com shortcut

### Selects/Dropdowns
- Desktop: Custom styled dropdown
- Mobile: Native picker (better UX on mobile)

```tsx
<Select
  options={options}
  native={isMobile} // Use native picker on mobile
/>
```

---

## Modal & Overlay Behavior

### Desktop (lg+)
```
┌─────────────────────────────────────────┐
│ [Overlay with blur]                      │
│                                          │
│     ┌─────────────────────────┐         │
│     │ Modal                    │         │
│     │ (Max 600px width)        │         │
│     │ Centered                 │         │
│     └─────────────────────────┘         │
│                                          │
└─────────────────────────────────────────┘
```

### Mobile (< sm)
```
┌────────────────────────────┐
│ Modal                       │
│ (Full screen)               │
│                             │
│                             │
│                             │
│                             │
│                             │
│ [Actions at bottom]         │
└────────────────────────────┘
```

**Mobile Modals:**
- Full-screen (or nearly full)
- Slide in from bottom
- Back button or swipe down to close

---

## Grid System

### Column Grid

```tsx
// Desktop: 12-column grid
<Grid cols={12} gap={6}>
  <GridItem colSpan={8}>Main content</GridItem>
  <GridItem colSpan={4}>Sidebar</GridItem>
</Grid>

// Tablet: 8-column grid
<Grid cols={8} gap={4}>
  <GridItem colSpan={6}>Main content</GridItem>
  <GridItem colSpan={2}>Sidebar (collapsed)</GridItem>
</Grid>

// Mobile: 4-column grid (mostly single column)
<Grid cols={4} gap={2}>
  <GridItem colSpan={4}>Full width</GridItem>
</Grid>
```

### Responsive Grid Example

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card />
  <Card />
  <Card />
</div>

// Mobile: 1 column
// Tablet: 2 columns
// Desktop: 3 columns
```

---

## Progressive Enhancement

### Core Functionality (Works Everywhere)
- View dashboard
- View campaigns
- View responses
- Basic navigation

### Enhanced (Desktop/Tablet)
- Keyboard shortcuts
- Inline editing
- Multi-panel layouts
- Advanced analytics
- Campaign creation

### Mobile-Specific Features
- Bottom navigation
- Swipe gestures
- Pull-to-refresh
- Native pickers
- Haptic feedback

---

## Performance Considerations

### Mobile Optimization
1. **Lazy Load Images:** Load images as they enter viewport
2. **Code Splitting:** Load only necessary JS for current view
3. **Reduce Bundle Size:** Mobile gets smaller JS bundle
4. **Optimize Fonts:** Subset fonts, only load weights used
5. **Defer Non-Critical JS:** Load analytics, etc. after main content

### Network Considerations
- Desktop: Assume good connection
- Mobile: Assume slower, potentially metered connection
  - Smaller images
  - Fewer API requests
  - Cache aggressively

---

## Testing Breakpoints

### Device Matrix

| Device Type | Resolution | Test |
|-------------|------------|------|
| iPhone SE | 375x667 | Smallest phone |
| iPhone 12/13 | 390x844 | Standard phone |
| iPhone 14 Pro Max | 430x932 | Large phone |
| iPad Mini | 744x1133 | Small tablet portrait |
| iPad Pro | 1024x1366 | Large tablet |
| MacBook Air | 1280x800 | Small laptop |
| Desktop | 1920x1080 | Standard desktop |
| Large Display | 2560x1440 | Large desktop |

### Browser DevTools
Use Chrome/Firefox DevTools device emulation:
1. Open DevTools
2. Toggle device toolbar (Cmd+Shift+M)
3. Select device or enter custom dimensions
4. Test touch events (enable touch emulation)

---

## Responsive Component Examples

### Example 1: Campaign Card

```tsx
<Card className="
  p-4 
  sm:p-5 
  lg:p-6 
  hover:shadow-lg
  transition-shadow
">
  <div className="
    flex 
    flex-col 
    sm:flex-row 
    sm:items-center 
    sm:justify-between 
    gap-3
  ">
    <div>
      <h3 className="text-lg sm:text-xl font-semibold">
        Campaign Name
      </h3>
      <p className="text-sm text-gray-500">
        Created Jan 10
      </p>
    </div>
    <Badge>Active</Badge>
  </div>
  
  <div className="mt-4 space-y-2">
    <Stat label="Sent" value="38" />
    <Stat label="Response" value="15%" />
  </div>
  
  <div className="mt-4 flex flex-col sm:flex-row gap-2">
    <Button fullWidth className="sm:flex-1">
      View
    </Button>
    <Button variant="secondary" fullWidth className="sm:flex-1">
      Analytics
    </Button>
  </div>
</Card>
```

### Example 2: Split Layout

```tsx
<div className="
  flex 
  flex-col 
  lg:flex-row 
  gap-4
">
  {/* Main content - full width on mobile, 60% on desktop */}
  <div className="flex-1 lg:w-3/5">
    <EmailDraft />
  </div>
  
  {/* Sidebar - full width on mobile, 40% on desktop */}
  <div className="flex-1 lg:w-2/5">
    <ResearchContext />
  </div>
</div>
```

### Example 3: Responsive Table

```tsx
{/* Desktop: Full table */}
<div className="hidden lg:block">
  <Table columns={columns} data={data} />
</div>

{/* Mobile: Card list */}
<div className="lg:hidden space-y-3">
  {data.map(item => (
    <Card key={item.id}>
      <h3>{item.company}</h3>
      <p>{item.email}</p>
      <Badge>{item.status}</Badge>
    </Card>
  ))}
</div>
```

---

## Accessibility Across Devices

### Mobile Accessibility
- Minimum 44px touch targets
- Good color contrast (4.5:1 for text)
- No horizontal scrolling
- Pinch-to-zoom enabled (don't disable)
- Form inputs properly labeled
- Error messages clear and accessible

### Desktop Accessibility
- Keyboard navigation works everywhere
- Focus visible on all interactive elements
- Skip links for screen readers
- ARIA labels where needed

### Testing
- iOS VoiceOver
- Android TalkBack
- Desktop screen readers (NVDA, JAWS, VoiceOver)
- Keyboard-only navigation

---

## Dark Mode (Future)

### Approach
```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #1F2937; /* gray-800 */
    --text-primary: #F9FAFB; /* gray-50 */
    --border: #374151; /* gray-700 */
  }
}
```

### Considerations
- OLED-friendly blacks on mobile
- Maintain contrast ratios
- Test in both light and dark
- Provide manual toggle (don't rely only on system preference)

---

## Print Styles (Future)

For campaign reports, analytics:

```css
@media print {
  .no-print { display: none; }
  .page-break { page-break-before: always; }
  
  * {
    background: white !important;
    color: black !important;
  }
}
```

---

## Next Document

**[Accessibility Standards →](./07-Accessibility-Standards.md)**
