# Component Specifications
## ProspectFlow - UI Component Library

**Version:** 1.0  
**Date:** January 2025

---

## Overview

This document defines all reusable UI components for ProspectFlow, including props, states, variants, and usage guidelines. This serves as the single source of truth for component implementation.

**Implementation:** All components should be built as React components with TypeScript, using Tailwind CSS for styling.

---

## Component Index

### Foundation
1. Button
2. Input
3. Textarea
4. Select/Dropdown
5. Checkbox
6. Radio Button
7. Toggle/Switch

### Layout
8. Card
9. Container
10. Grid
11. Stack
12. Divider

### Navigation
13. Navigation Bar
14. Breadcrumbs
15. Tabs
16. Pagination

### Feedback
17. Alert/Banner
18. Toast/Notification
19. Modal
20. Progress Bar
21. Spinner/Loading
22. Badge
23. Tooltip

### Data Display
24. Table
25. List
26. Stat Card
27. Timeline
28. Empty State

### Forms
29. Form Group
30. Field Label
31. Helper Text
32. Error Message

---

## 1. Button Component

### Purpose
Primary interaction element for user actions.

### Variants

#### 1.1 By Style
```tsx
<Button variant="primary">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="ghost">Ghost Action</Button>
<Button variant="danger">Delete</Button>
```

**Visual Specs:**
- **Primary**: Blue background, white text, bold
- **Secondary**: White background, gray border, gray text
- **Ghost**: Transparent, no border, colored text
- **Danger**: Red background, white text

#### 1.2 By Size
```tsx
<Button size="sm">Small</Button>
<Button size="md">Medium (default)</Button>
<Button size="lg">Large</Button>
```

**Size Specs:**
- **Small**: 32px height, 12px/16px padding, 14px text
- **Medium**: 40px height, 12px/20px padding, 16px text
- **Large**: 48px height, 16px/28px padding, 18px text

#### 1.3 By Icon
```tsx
<Button leftIcon={<PlusIcon />}>Create Campaign</Button>
<Button rightIcon={<ArrowRightIcon />}>Continue</Button>
<Button iconOnly><SettingsIcon /></Button>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | 'primary' \| 'secondary' \| 'ghost' \| 'danger' | 'primary' | Visual style |
| size | 'sm' \| 'md' \| 'lg' | 'md' | Size variant |
| disabled | boolean | false | Disabled state |
| loading | boolean | false | Shows spinner, disables interaction |
| leftIcon | ReactNode | null | Icon on left side |
| rightIcon | ReactNode | null | Icon on right side |
| iconOnly | boolean | false | Icon-only button (square) |
| fullWidth | boolean | false | Takes 100% width |
| onClick | () => void | - | Click handler |
| type | 'button' \| 'submit' | 'button' | HTML button type |

### States

```tsx
// Normal
<Button>Normal</Button>

// Hover
<Button className="hover">Hover</Button> // Slightly darker bg

// Active/Pressed
<Button className="active">Pressed</Button> // Darker, inset shadow

// Disabled
<Button disabled>Disabled</Button> // 50% opacity

// Loading
<Button loading>Loading</Button> // Spinner + disabled
```

### Accessibility
- Always focusable (unless disabled)
- Keyboard: Enter/Space to activate
- Screen reader: Label or aria-label required
- Focus ring on keyboard navigation

### Usage Examples

```tsx
// Primary action
<Button variant="primary" onClick={handleSubmit}>
  Create Campaign
</Button>

// With loading state
<Button variant="primary" loading={isSubmitting}>
  {isSubmitting ? 'Creating...' : 'Create Campaign'}
</Button>

// Icon button
<Button iconOnly variant="ghost" aria-label="Settings">
  <SettingsIcon />
</Button>

// Full width
<Button variant="primary" fullWidth>
  Continue
</Button>
```

### Code Implementation

```tsx
// Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  iconOnly?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  children?: React.ReactNode;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  iconOnly = false,
  fullWidth = false,
  onClick,
  type = 'button',
  children,
  className = '',
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-blue-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };
  
  const sizeClasses = {
    sm: iconOnly ? 'h-8 w-8' : 'h-8 px-4 text-sm',
    md: iconOnly ? 'h-10 w-10' : 'h-10 px-5 text-base',
    lg: iconOnly ? 'h-12 w-12' : 'h-12 px-7 text-lg',
  };
  
  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && 'w-full',
    (disabled || loading) && 'opacity-50 cursor-not-allowed',
    className,
  ].filter(Boolean).join(' ');
  
  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading && <Spinner className="mr-2" size="sm" />}
      {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {!iconOnly && children}
      {!loading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};
```

---

## 2. Input Component

### Purpose
Text input field for user data entry.

### Variants

```tsx
<Input type="text" placeholder="Enter text" />
<Input type="email" placeholder="email@example.com" />
<Input type="password" placeholder="Password" />
<Input type="number" placeholder="42" />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| type | 'text' \| 'email' \| 'password' \| 'number' \| 'url' | 'text' | Input type |
| value | string | - | Controlled value |
| defaultValue | string | - | Uncontrolled default value |
| placeholder | string | - | Placeholder text |
| disabled | boolean | false | Disabled state |
| error | boolean \| string | false | Error state or message |
| required | boolean | false | Required field |
| leftIcon | ReactNode | null | Icon on left |
| rightIcon | ReactNode | null | Icon on right |
| onChange | (value: string) => void | - | Change handler |
| onBlur | () => void | - | Blur handler |

### States

```tsx
// Normal
<Input placeholder="Normal" />

// Focus
<Input autoFocus placeholder="Focused" /> // Blue border, shadow

// Error
<Input error="Invalid email" /> // Red border

// Disabled
<Input disabled placeholder="Disabled" /> // Gray bg

// With icon
<Input leftIcon={<SearchIcon />} placeholder="Search..." />
```

### Accessibility
- Label associated via htmlFor/id
- Error announced by screen reader
- Required indicated visually and in aria-required
- Placeholder is not a label replacement

### Usage Example

```tsx
<div className="space-y-2">
  <Label htmlFor="email">Email Address *</Label>
  <Input
    id="email"
    type="email"
    placeholder="you@example.com"
    value={email}
    onChange={setEmail}
    error={emailError}
    required
  />
  {emailError && <ErrorMessage>{emailError}</ErrorMessage>}
</div>
```

---

## 3. Card Component

### Purpose
Container for grouping related content with visual separation.

### Variants

```tsx
<Card>Basic card content</Card>
<Card hoverable>Hoverable card (interactive)</Card>
<Card bordered>Card with border</Card>
<Card shadow="lg">Card with large shadow</Card>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | - | Card content |
| hoverable | boolean | false | Adds hover effect |
| bordered | boolean | true | Shows border |
| shadow | 'none' \| 'sm' \| 'md' \| 'lg' | 'sm' | Shadow size |
| padding | 'none' \| 'sm' \| 'md' \| 'lg' | 'md' | Internal padding |
| onClick | () => void | - | Click handler (if interactive) |

### Sub-components

```tsx
<Card>
  <Card.Header>
    <Card.Title>Campaign Details</Card.Title>
    <Card.Actions>
      <Button size="sm">Edit</Button>
    </Card.Actions>
  </Card.Header>
  
  <Card.Body>
    Main content goes here
  </Card.Body>
  
  <Card.Footer>
    Footer content or actions
  </Card.Footer>
</Card>
```

### Usage Example

```tsx
<Card hoverable onClick={() => navigate('/campaign/123')}>
  <Card.Header>
    <Card.Title>Denver Restaurants Q1</Card.Title>
    <Badge variant="success">Active</Badge>
  </Card.Header>
  
  <Card.Body>
    <Stat label="Emails Sent" value="38" />
    <Stat label="Response Rate" value="15.8%" />
  </Card.Body>
  
  <Card.Footer>
    <Button variant="secondary" size="sm">View Details</Button>
  </Card.Footer>
</Card>
```

---

## 4. Badge Component

### Purpose
Small label for status, counts, or categories.

### Variants

```tsx
<Badge variant="default">Default</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="error">Error</Badge>
<Badge variant="info">Info</Badge>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | 'default' \| 'success' \| 'warning' \| 'error' \| 'info' | 'default' | Color variant |
| size | 'sm' \| 'md' | 'md' | Size |
| dot | boolean | false | Shows dot indicator |
| children | ReactNode | - | Badge content |

### Usage Examples

```tsx
// Status badge
<Badge variant="success">Active</Badge>

// Count badge
<Badge variant="error">3</Badge>

// With dot
<Badge variant="warning" dot>Pending</Badge>

// In nav (notification)
<button>
  Notifications
  <Badge variant="error">5</Badge>
</button>

// Confidence score
<Badge variant={confidence > 80 ? 'success' : 'warning'}>
  {confidence}%
</Badge>
```

---

## 5. Modal Component

### Purpose
Overlay dialog for focused tasks or information.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| open | boolean | false | Controls visibility |
| onClose | () => void | - | Close handler |
| size | 'sm' \| 'md' \| 'lg' \| 'xl' | 'md' | Modal size |
| closeOnOverlay | boolean | true | Close when clicking overlay |
| closeOnEsc | boolean | true | Close on Escape key |
| children | ReactNode | - | Modal content |

### Sub-components

```tsx
<Modal open={isOpen} onClose={handleClose}>
  <Modal.Header>
    <Modal.Title>Confirm Action</Modal.Title>
    <Modal.Close />
  </Modal.Header>
  
  <Modal.Body>
    Are you sure you want to delete this campaign?
  </Modal.Body>
  
  <Modal.Footer>
    <Button variant="secondary" onClick={handleClose}>
      Cancel
    </Button>
    <Button variant="danger" onClick={handleDelete}>
      Delete
    </Button>
  </Modal.Footer>
</Modal>
```

### Accessibility
- Focus trapped within modal
- First focusable element focused on open
- Escape key closes modal
- Overlay click closes modal
- Background content inert
- ARIA: role="dialog", aria-labelledby, aria-describedby

---

## 6. Table Component

### Purpose
Display structured data in rows and columns.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| columns | Column[] | - | Column definitions |
| data | T[] | - | Row data |
| sortable | boolean | false | Enable column sorting |
| selectable | boolean | false | Enable row selection |
| onRowClick | (row: T) => void | - | Row click handler |
| loading | boolean | false | Shows loading state |

### Column Definition

```tsx
interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
}

const columns: Column<Prospect>[] = [
  {
    key: 'company',
    header: 'Company',
    render: (row) => (
      <div className="flex items-center">
        <CompanyLogo src={row.logo} />
        <span>{row.company}</span>
      </div>
    ),
    sortable: true,
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>,
  },
  {
    key: 'actions',
    header: 'Actions',
    render: (row) => (
      <Button size="sm" variant="ghost">View</Button>
    ),
    width: '100px',
  },
];
```

### Usage Example

```tsx
<Table
  columns={columns}
  data={prospects}
  sortable
  selectable
  onRowClick={(prospect) => navigate(`/prospect/${prospect.id}`)}
  loading={isLoading}
/>
```

---

## 7. Toast/Notification Component

### Purpose
Non-blocking feedback messages.

### Variants

```tsx
toast.success('Campaign created successfully!');
toast.error('Failed to send emails');
toast.warning('Approaching daily send limit');
toast.info('Processing will take ~90 minutes');
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| message | string | - | Notification message |
| variant | 'success' \| 'error' \| 'warning' \| 'info' | 'info' | Type |
| duration | number | 5000 | Auto-dismiss time (ms) |
| action | { label: string, onClick: () => void } | null | Action button |
| closable | boolean | true | Show close button |

### Usage Examples

```tsx
// Success
toast.success('Email sent successfully!');

// Error with retry
toast.error('Failed to send email', {
  action: {
    label: 'Retry',
    onClick: retrySend,
  },
});

// Undo action
toast.success('Campaign archived', {
  action: {
    label: 'Undo',
    onClick: restoreCampaign,
  },
  duration: 3000,
});
```

### Position
- Desktop: Top-right corner
- Mobile: Bottom center (above nav)

---

## 8. Progress Bar Component

### Purpose
Show completion percentage.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | number | 0 | Current value (0-100) |
| max | number | 100 | Maximum value |
| variant | 'default' \| 'success' \| 'warning' \| 'error' | 'default' | Color |
| size | 'sm' \| 'md' \| 'lg' | 'md' | Height |
| label | string | null | Optional label |
| showValue | boolean | false | Show percentage text |

### Usage Examples

```tsx
// Goal progress
<ProgressBar
  value={8}
  max={15}
  variant="success"
  label="Meetings Booked"
  showValue
/>

// Sending progress
<ProgressBar
  value={sentCount}
  max={totalEmails}
  label={`Sending ${sentCount}/${totalEmails}`}
/>
```

---

## 9. Stat Card Component

### Purpose
Display a single metric with label and optional trend.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| label | string | - | Metric label |
| value | string \| number | - | Metric value |
| trend | { value: number, direction: 'up' \| 'down' } | null | Trend indicator |
| icon | ReactNode | null | Icon |
| target | string \| number | null | Target value |
| progress | number | null | Progress to target (0-100) |

### Usage Example

```tsx
<StatCard
  label="Response Rate"
  value="12.5%"
  trend={{ value: 3, direction: 'up' }}
  target="10%"
  icon={<TrendingUpIcon />}
/>
```

---

## 10. Dropdown/Select Component

### Purpose
Selection from list of options.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| options | Option[] | - | List of options |
| value | string | - | Selected value |
| onChange | (value: string) => void | - | Change handler |
| placeholder | string | 'Select...' | Placeholder text |
| searchable | boolean | false | Enable search |
| disabled | boolean | false | Disabled state |

### Option Type

```tsx
interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}
```

### Usage Example

```tsx
<Select
  options={[
    { value: 'social', label: 'Social Media Upgrade' },
    { value: 'product', label: 'Product Demo' },
    { value: 'custom', label: 'Custom Campaign' },
  ]}
  value={selectedTemplate}
  onChange={setSelectedTemplate}
  placeholder="Choose template"
/>
```

---

## Component Composition Examples

### Example 1: Campaign Card

```tsx
<Card hoverable onClick={() => navigate('/campaign/123')}>
  <div className="flex items-start justify-between">
    <div>
      <h3 className="text-lg font-semibold">Denver Restaurants Q1</h3>
      <p className="text-sm text-gray-500">Created Jan 10, 2025</p>
    </div>
    <Badge variant="success">Active</Badge>
  </div>
  
  <div className="mt-4 space-y-2">
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">Emails Sent</span>
      <span className="font-medium">38 / 42</span>
    </div>
    
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">Response Rate</span>
      <span className="font-medium text-green-600">15.8%</span>
    </div>
    
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">Meetings</span>
      <span className="font-medium">3</span>
    </div>
  </div>
  
  <div className="mt-4 flex gap-2">
    <Button variant="secondary" size="sm" fullWidth>
      View Details
    </Button>
    <Button variant="ghost" size="sm" fullWidth>
      Analytics
    </Button>
  </div>
</Card>
```

### Example 2: Form Group

```tsx
<div className="space-y-6">
  <div>
    <Label htmlFor="name">Campaign Name *</Label>
    <Input
      id="name"
      value={name}
      onChange={setName}
      placeholder="e.g., Denver Restaurants Q1"
      error={nameError}
    />
    {nameError && <ErrorMessage>{nameError}</ErrorMessage>}
    <HelperText>Choose a name you'll recognize later</HelperText>
  </div>
  
  <div>
    <Label htmlFor="template">Template *</Label>
    <Select
      id="template"
      options={templateOptions}
      value={template}
      onChange={setTemplate}
    />
  </div>
  
  <div>
    <Label htmlFor="pitch">Your Value Proposition *</Label>
    <Textarea
      id="pitch"
      value={pitch}
      onChange={setPitch}
      placeholder="I help businesses..."
      maxLength={150}
      showCount
    />
    <HelperText>This will be used to personalize your emails</HelperText>
  </div>
  
  <div className="flex gap-3 justify-end">
    <Button variant="secondary" onClick={handleCancel}>
      Cancel
    </Button>
    <Button variant="primary" onClick={handleSubmit}>
      Continue
    </Button>
  </div>
</div>
```

---

## Responsive Behavior

### Breakpoint Strategy
```
Mobile:  < 640px  (sm)
Tablet:  640-1024px  (md)
Desktop: > 1024px  (lg)
```

### Component Adaptations

**Card Grid**
- Desktop: 3 columns
- Tablet: 2 columns
- Mobile: 1 column (stacked)

**Table**
- Desktop: Full table
- Mobile: Card-based view (collapsed)

**Modal**
- Desktop: Centered, max-width
- Mobile: Full-screen

**Navigation**
- Desktop: Horizontal tabs
- Mobile: Bottom navigation bar

---

## Next Document

**[Interaction Patterns →](./05-Interaction-Patterns.md)**
