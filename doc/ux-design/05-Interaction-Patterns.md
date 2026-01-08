# Interaction Patterns
## ProspectFlow - User Interactions & Micro-interactions

**Version:** 1.0  
**Date:** January 2025

---

## Overview

This document catalogs all interaction patterns, transitions, animations, and feedback mechanisms in ProspectFlow. These patterns create a consistent, delightful user experience.

---

## Core Interaction Principles

### 1. **Provide Immediate Feedback**
Every user action receives visual/auditory feedback within 100ms.

### 2. **Be Predictable**
Similar actions should have similar outcomes and behaviors.

### 3. **Guide Don't Block**
Help users make good decisions but don't prevent them from acting.

### 4. **Celebrate Success**
Acknowledge accomplishments and progress.

### 5. **Minimize Cognitive Load**
Reduce decisions, provide smart defaults, remember preferences.

---

## Interaction Catalog

## 1. Button Interactions

### 1.1 Click/Tap
**Trigger:** User clicks or taps button

**Sequence:**
1. **Immediate**: Button scales down slightly (0.98x)
2. **100ms**: Button returns to normal scale
3. **Action**: Execute onClick handler
4. **Feedback**: Show loading state or toast (depending on action)

**States:**
```
Normal → Hover → Active (pressed) → Loading/Success
```

**Visual:**
- Hover: Background darkens 10%, subtle shadow increases
- Active: Background darkens 15%, inset shadow
- Loading: Spinner appears, button disabled, opacity 70%

**Code Example:**
```tsx
<Button 
  onClick={handleClick}
  loading={isLoading}
  className="transition-all duration-150 active:scale-98"
>
  {isLoading ? 'Processing...' : 'Submit'}
</Button>
```

### 1.2 Keyboard Navigation
**Trigger:** Tab to button, press Enter/Space

**Sequence:**
1. **Tab**: Focus ring appears (2px blue outline)
2. **Enter/Space**: Same as click sequence

**Accessibility:**
- Focus visible (WCAG 2.4.7)
- Focus order logical (WCAG 2.4.3)

---

## 2. Form Interactions

### 2.1 Input Focus
**Trigger:** User clicks in input field

**Sequence:**
1. **Immediate**: Border color changes to blue
2. **100ms**: Box shadow appears (focus ring)
3. **Placeholder**: Fades to lighter color
4. **Label**: Animates up and scales down (if using floating label)

**Visual:**
```css
/* Normal */
border: 1px solid #D1D5DB; /* gray-300 */

/* Focus */
border: 1px solid #3B82F6; /* blue-500 */
box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
```

### 2.2 Input Validation (Real-time)
**Trigger:** User types in field with validation rules

**Sequence:**
1. **On Change**: Debounced validation (500ms after last keystroke)
2. **Valid**: Green checkmark appears (fade in)
3. **Invalid**: Red X appears, error message shows below field
4. **On Blur**: Force validation immediately

**Visual Feedback:**
- Valid: Green border + checkmark icon
- Invalid: Red border + error message (slide down animation)

**Example:**
```tsx
<Input
  type="email"
  value={email}
  onChange={handleEmailChange}
  onBlur={validateEmail}
  error={emailError}
  success={emailValid}
/>
{emailError && (
  <ErrorMessage className="animate-slideDown">
    {emailError}
  </ErrorMessage>
)}
```

### 2.3 Checkbox/Toggle
**Trigger:** User clicks checkbox or toggle

**Sequence:**
1. **Click**: Scale animation (1x → 1.1x → 1x)
2. **State change**: Checkmark slides in (for checkbox) or toggle slides (for switch)
3. **Haptic** (mobile): Light tap feedback

**Animation:**
- Checkbox: Checkmark draws from top-left to bottom-right (200ms)
- Toggle: Circle slides left/right with ease-in-out (150ms)

---

## 3. Navigation Interactions

### 3.1 Tab Switching
**Trigger:** User clicks tab

**Sequence:**
1. **Click**: Tab becomes active (bold text, underline)
2. **Content**: Fade out old content (150ms)
3. **Content**: Fade in new content (200ms)
4. **Underline**: Slides from old tab to new tab (300ms, ease-in-out)

**Animation:**
```css
.tab-underline {
  transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

.tab-content {
  animation: fadeIn 200ms ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### 3.2 Page Transition
**Trigger:** User navigates to new page

**Sequence:**
1. **Click link**: Loading indicator starts (after 300ms delay)
2. **Page load**: Current page fades out (150ms)
3. **New page**: Fades in (200ms), slides up slightly
4. **Loading indicator**: Removed

**Loading States:**
- Under 300ms: No loading indicator (instant feel)
- 300ms-2s: Spinner in top-right corner
- Over 2s: Full-page loading overlay

---

## 4. Card/List Interactions

### 4.1 Hoverable Card
**Trigger:** Mouse enters card area

**Sequence:**
1. **Hover**: Shadow increases, card elevates (4px up)
2. **Hover**: Actions (buttons) fade in or become more prominent
3. **Leave**: Card returns to normal state

**Animation:**
```css
.card {
  transition: all 200ms ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.15);
}

.card:hover .card-actions {
  opacity: 1;
}
```

### 4.2 List Item Selection
**Trigger:** User clicks list item

**Sequence:**
1. **Click**: Background flashes (ripple effect from click point)
2. **Selected**: Background changes to light blue
3. **Checkbox**: Animates to checked state

**Multiple Selection:**
- Shift+Click: Select range
- Cmd/Ctrl+Click: Toggle individual items

### 4.3 Drag & Drop (Future)
**Trigger:** User starts dragging item

**Sequence:**
1. **Mouse down**: Wait 150ms (prevents accidental drag)
2. **Drag start**: Item lifts (shadow increases), cursor changes
3. **Dragging**: Ghost image follows cursor
4. **Drop zone**: Highlights when valid drop target
5. **Drop**: Item animates into position, confirmation toast

---

## 5. Modal Interactions

### 5.1 Modal Open
**Trigger:** User triggers modal (button click, etc.)

**Sequence:**
1. **Immediate**: Overlay fades in (200ms)
2. **100ms**: Modal scales in from center (200ms, ease-out)
3. **Focus**: First focusable element receives focus
4. **Background**: Blurs slightly (optional)

**Animation:**
```css
.modal-overlay {
  animation: fadeIn 200ms ease;
}

.modal-content {
  animation: scaleIn 200ms ease-out;
  animation-delay: 100ms;
}

@keyframes scaleIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
```

### 5.2 Modal Close
**Trigger:** User clicks close button, presses Escape, or clicks overlay

**Sequence:**
1. **Immediate**: Modal scales out (150ms)
2. **100ms**: Overlay fades out (150ms)
3. **Complete**: Modal removed from DOM, focus returned to trigger element

### 5.3 Focus Trap
**Behavior:**
- Tab cycles through focusable elements within modal
- Shift+Tab cycles backward
- Cannot tab out of modal
- Escape key closes modal

---

## 6. Data Loading Interactions

### 6.1 Skeleton Loading
**Use Case:** Loading content (cards, tables, text)

**Sequence:**
1. **Initial**: Skeleton placeholders appear instantly
2. **Loading**: Animated shimmer effect (left to right)
3. **Loaded**: Fade out skeletons, fade in real content

**Animation:**
```css
.skeleton {
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

### 6.2 Progress Indicator
**Use Case:** Long-running tasks (sending emails, processing prospects)

**Types:**
1. **Determinate**: Shows exact progress (e.g., 12/38 emails sent)
   - Progress bar fills
   - Percentage updates
   - Estimated time remaining

2. **Indeterminate**: Shows activity without progress (e.g., initial processing)
   - Spinner rotates
   - Pulse animation
   - Generic message

### 6.3 Optimistic Updates
**Use Case:** Actions that are likely to succeed (approve email, skip prospect)

**Sequence:**
1. **Immediate**: Update UI as if action succeeded
2. **Background**: Send API request
3. **Success**: Nothing (already updated)
4. **Failure**: Revert UI, show error toast with retry option

**Example:**
```tsx
const handleApprove = async (emailId) => {
  // Optimistic update
  setEmails(prev => prev.map(e => 
    e.id === emailId ? { ...e, status: 'approved' } : e
  ));
  
  try {
    await approveEmail(emailId);
    // Success - nothing to do
  } catch (error) {
    // Revert
    setEmails(prev => prev.map(e => 
      e.id === emailId ? { ...e, status: 'pending' } : e
    ));
    toast.error('Failed to approve email', {
      action: { label: 'Retry', onClick: () => handleApprove(emailId) }
    });
  }
};
```

---

## 7. Notification/Feedback Interactions

### 7.1 Toast Notifications
**Trigger:** System event or user action result

**Sequence:**
1. **Appear**: Slide in from right (desktop) or bottom (mobile) - 200ms
2. **Display**: Stay visible for duration (default 5s)
3. **Dismiss**: Slide out same direction - 150ms

**User Actions:**
- Click X: Dismiss immediately
- Click action button: Execute action + dismiss
- Swipe (mobile): Dismiss

**Stacking:**
- Multiple toasts stack vertically
- Newest at top
- Max 3 visible at once

### 7.2 Inline Validation Messages
**Trigger:** Form field validation fails

**Sequence:**
1. **Error detected**: Error message slides down below field (200ms)
2. **Icon appears**: Red X icon fades in next to field
3. **Border changes**: Field border turns red
4. **Screen reader**: Error announced

**Animation:**
```css
.error-message {
  animation: slideDown 200ms ease;
  color: #EF4444; /* red-500 */
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 7.3 Success Celebrations
**Use Case:** Significant achievements (campaign sent, meeting booked)

**Sequence:**
1. **Checkmark animation**: Grows from center + rotates (500ms)
2. **Confetti** (optional): Particle animation (1s)
3. **Success message**: Fades in
4. **Haptic** (mobile): Medium impact

**When to Use:**
- ✅ Campaign sent successfully
- ✅ Meeting booked
- ✅ 10+ emails approved
- ❌ Individual email approved (too frequent)

---

## 8. Keyboard Shortcuts

### Global Shortcuts

| Key | Action | Context |
|-----|--------|---------|
| `/` | Focus search | Anywhere |
| `?` | Show keyboard shortcuts | Anywhere |
| `Esc` | Close modal/cancel | Modals, overlays |

### Email Review Interface

| Key | Action |
|-----|--------|
| `A` or `Enter` | Approve current email |
| `E` | Enter edit mode |
| `S` | Skip current email |
| `R` | Regenerate draft |
| `→` or `J` | Next email |
| `←` or `K` | Previous email |
| `Esc` | Exit edit mode |
| `Cmd/Ctrl + Enter` | Approve & Next |

### Table/List Navigation

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate rows |
| `Enter` | Open selected row |
| `Space` | Toggle selection |
| `Shift + ↑/↓` | Extend selection |
| `Cmd/Ctrl + A` | Select all |

### Implementation

```tsx
useKeyboardShortcut({
  'a': handleApprove,
  'e': handleEdit,
  's': handleSkip,
  'r': handleRegenerate,
  'ArrowRight': handleNext,
  'ArrowLeft': handlePrevious,
}, [dependencies], {
  enabled: isReviewMode,
});
```

### Discoverability
- Show hints on hover (e.g., "Press A to approve")
- `?` key shows full shortcut panel
- Tooltips mention shortcuts
- First-time tooltip: "Tip: Press A to quickly approve"

---

## 9. Drag & Drop Interactions (Future)

### 9.1 File Upload
**Trigger:** User drags file over drop zone

**Sequence:**
1. **Drag over**: Drop zone highlights (border, background)
2. **Drop**: File icon animates in, processing starts
3. **Processing**: Progress bar or spinner
4. **Complete**: Success checkmark + filename

### 9.2 Reordering
**Use Case:** Reorder campaign priorities, email drafts

**Sequence:**
1. **Grab**: Item lifts (shadow increases)
2. **Drag**: Other items shift to make space
3. **Drop**: Item settles into new position
4. **Complete**: Auto-save + toast confirmation

---

## 10. Responsive Touch Interactions

### 10.1 Swipe Gestures (Mobile)

| Gesture | Action | Context |
|---------|--------|---------|
| Swipe left | Show actions (delete, archive) | List items |
| Swipe right | Mark as read / approve | List items |
| Pull down | Refresh | Lists, feeds |
| Swipe left/right | Navigate between items | Detail views |

### 10.2 Long Press
**Use Case:** Context menu, bulk selection

**Sequence:**
1. **Press & hold** (500ms): Haptic feedback
2. **Menu appears**: Context menu slides up
3. **Release**: Select option or dismiss

### 10.3 Tap vs Long Tap

| Interaction | Duration | Action |
|-------------|----------|--------|
| Tap | <100ms | Open/select |
| Long tap | >500ms | Show context menu |
| Double tap | 2 taps <300ms | Zoom / quick action |

---

## 11. Empty State Interactions

### 11.1 First-Time Empty State
**Use Case:** No campaigns created yet

**Display:**
- Illustration (not just text)
- Clear heading: "Ready to start prospecting?"
- Helpful description
- Primary CTA: "Create Your First Campaign"
- Optional: Tutorial video link

### 11.2 Zero Results State
**Use Case:** Search or filter returns no results

**Display:**
- Search icon / illustration
- Heading: "No results found"
- Suggestion: Try different keywords
- CTA: "Clear filters" or "View all"

### 11.3 Error State
**Use Case:** Failed to load data

**Display:**
- Error icon
- Heading: "Something went wrong"
- Error message (user-friendly)
- CTA: "Try Again" button
- Optional: "Contact Support" link

---

## 12. Progressive Disclosure

### Pattern: Show More/Less
**Use Case:** Long text, large lists

**Sequence:**
1. **Initial**: Show preview (e.g., first 3 lines)
2. **Click "Show More"**: Content expands (smooth height animation)
3. **Button changes**: "Show Less"
4. **Click "Show Less"**: Content collapses

**Animation:**
```css
.expandable-content {
  max-height: 100px;
  overflow: hidden;
  transition: max-height 300ms ease;
}

.expandable-content.expanded {
  max-height: 2000px; /* Large enough for content */
}
```

### Pattern: Accordion
**Use Case:** Settings, FAQ, grouped content

**Behavior:**
- Single accordion: Only one section open at a time
- Multiple accordion: Multiple sections can be open
- Default: First section open (or all closed)

---

## 13. Undo/Redo Interactions

### Use Cases
- ✅ Email approval
- ✅ Campaign archive
- ✅ Prospect skip
- ❌ Email send (cannot undo)

### Pattern
1. **Action**: User performs destructive action
2. **Immediate**: UI updates (optimistic)
3. **Toast**: Shows "Action completed" with Undo button (5s)
4. **Undo window**: User has 5 seconds to undo
5. **After timeout**: Action committed

**Example:**
```tsx
const handleArchive = (campaignId) => {
  // Archive immediately
  archiveCampaign(campaignId);
  
  // Show undo toast
  const toastId = toast.success('Campaign archived', {
    action: {
      label: 'Undo',
      onClick: () => {
        unarchiveCampaign(campaignId);
        toast.dismiss(toastId);
      }
    },
    duration: 5000,
  });
};
```

---

## 14. Micro-interactions Catalog

### 14.1 Button Ripple Effect
**Trigger:** Click/tap button

**Animation:** Circular ripple emanates from click point, fades out.

```css
@keyframes ripple {
  0% {
    transform: scale(0);
    opacity: 0.5;
  }
  100% {
    transform: scale(4);
    opacity: 0;
  }
}
```

### 14.2 Count-Up Animation
**Use Case:** Statistics, metrics that change

**Animation:** Number animates from old value to new value (500ms).

```tsx
<CountUp start={0} end={42} duration={0.5} />
```

### 14.3 Pulse Animation
**Use Case:** Draw attention (new notification, important metric)

**Animation:** Element scales slightly larger and back, repeats 2-3 times.

```css
@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}
```

### 14.4 Shake Animation
**Use Case:** Form validation error, incorrect input

**Animation:** Element shakes left-right, indicates "no" or error.

```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
  20%, 40%, 60%, 80% { transform: translateX(10px); }
}
```

### 14.5 Slide In/Out
**Use Case:** Sidebars, notifications, modals

**Animation:**
- Slide in from right: Enter screen
- Slide out to right: Exit screen

```css
@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

---

## 15. Animation Duration Guidelines

| Animation Type | Duration | Easing |
|----------------|----------|--------|
| Micro (hover, focus) | 100-150ms | ease-out |
| Small (button, checkbox) | 150-250ms | ease-in-out |
| Medium (modal, card) | 200-300ms | ease-out |
| Large (page transition) | 300-500ms | ease-in-out |
| Loading/waiting | 500-1000ms | linear (spinner) |

### Easing Functions
- **ease-out**: Fast start, slow end (entering elements)
- **ease-in**: Slow start, fast end (exiting elements)
- **ease-in-out**: Smooth both ends (state changes)
- **spring**: Bouncy, playful (success celebrations)

---

## 16. Haptic Feedback (Mobile)

### When to Use
- ✅ Button press (light)
- ✅ Toggle switch (light)
- ✅ Success action (medium)
- ✅ Error/warning (heavy)
- ✅ Swipe action (light)
- ❌ Hover (not applicable on mobile)
- ❌ Frequent actions (annoying)

### Implementation
```tsx
const triggerHaptic = (type: 'light' | 'medium' | 'heavy') => {
  if ('vibrate' in navigator) {
    const patterns = {
      light: 10,
      medium: 20,
      heavy: 50,
    };
    navigator.vibrate(patterns[type]);
  }
};
```

---

## 17. Accessibility Considerations

### Screen Reader Announcements
- Form validation errors
- Success/error messages
- Dynamic content changes
- Loading states

### Focus Management
- Modal open: Focus first element
- Modal close: Return focus to trigger
- Delete item: Focus next item
- Form submit: Focus error (if any)

### Reduced Motion
Respect `prefers-reduced-motion` media query.

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Next Document

**[Responsive Design Guidelines →](./06-Responsive-Design-Guidelines.md)**
