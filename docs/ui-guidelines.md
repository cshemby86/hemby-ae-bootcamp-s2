# UI Guidelines for TODO App

## Design System and Components

1. The UI must use Material Design components (for example: app bar, cards, dialogs, text fields, checkboxes, chips, and snackbars).
2. Component behavior and spacing should follow Material design conventions for consistency.
3. Use one primary component library consistently across the app to avoid mixed styles.

## Color Palette

1. Define and use a consistent color palette via theme tokens.
2. Recommended palette:
   - Primary: #1565C0
   - Secondary: #2E7D32
   - Background: #F7F9FC
   - Surface: #FFFFFF
   - Error: #C62828
   - Text Primary: #1F2937
   - Text Secondary: #6B7280
3. Maintain sufficient contrast for text and controls (minimum WCAG AA contrast ratio).
4. Color must not be the only way to convey status or meaning.

## Typography and Layout

1. Use a clear type scale with distinct sizes for page title, section title, body, and helper text.
2. Maintain consistent spacing using an 8px spacing system.
3. Ensure responsive layout for mobile, tablet, and desktop breakpoints.
4. Keep task actions (complete, edit, delete) visible and easy to reach on small screens.

## Buttons and Interactive Controls

1. Use contained buttons for primary actions (for example: Add Task).
2. Use outlined or text buttons for secondary actions.
3. Destructive actions (for example: Delete) must use error styling and require confirmation.
4. Button labels should be action-oriented (for example: Save Task, Mark Complete).
5. All interactive controls must show clear hover, focus, and disabled states.

## Task List and Forms

1. Each task row should clearly show title, status, due date, and priority.
2. Completed tasks should be visually distinct but still readable.
3. Task creation and editing forms must include inline validation messages.
4. Required fields must be clearly marked.
5. Due date input should support both keyboard entry and date picker selection.

## Accessibility Requirements

1. Meet WCAG 2.1 AA accessibility standards.
2. Ensure full keyboard navigation for all features, including modals and menus.
3. Provide visible focus indicators on all interactive elements.
4. Use semantic HTML and ARIA attributes where needed.
5. Associate form labels with inputs and provide meaningful error messages.
6. Provide accessible names for icon-only buttons (for example: Edit Task, Delete Task).
7. Announce important status updates to screen readers (for example: Task saved, Task deleted).

## Feedback and States

1. Show loading indicators during async operations.
2. Show success and error feedback using non-intrusive notifications.
3. Provide empty-state UI with guidance when no tasks exist.
4. Handle long task titles and edge cases without breaking layout.

## Consistency and Quality

1. All new screens and components must reuse the shared theme and component patterns.
2. UI changes should be validated against these guidelines during code review.
3. Any exception to these rules must be documented with rationale.