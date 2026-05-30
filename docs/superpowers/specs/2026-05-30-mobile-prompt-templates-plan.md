# Mobile Prompt Templates — Implementation Plan

## Goal
Migrate the desktop "Prompt Template" picker to mobile. User taps the action in the BottomSheet (or attachments panel), sees a searchable list of templates grouped by category, selects one, and the template content (with `{{placeholders}}` intact) is injected into the chat composer textarea for manual editing.

## Files Created
| File | Purpose |
|------|---------|
| `src/components/mobile/prompt-templates/PromptTemplateList.tsx` | Searchable, grouped template list with loading/empty/error states |

## Files Modified
| File | What Changes |
|------|-------------|
| `src/components/mobile/BottomSheetContent.tsx` | Wire up `Prompt Templates` ActionRow onClick via new prop |
| `src/components/mobile/ChatComposerBar.tsx` | Accept `initialContent` prop to pre-fill textarea |
| `src/components/mobile/pages/ChatPage.tsx` | Conditionally render PromptTemplateList vs mainContent |
| `src/components/mobile/MobileAppShell.tsx` | State + callbacks to orchestrate template flow |

## Data Flow

```
BottomSheetContent              MobileAppShell                ChatPage
───────────────                ─────────────                ────────
"Prompt Templates"  ──onOpen──> showTemplates=true          showTemplates=true?
  (close sheet)                        │                        │
                                       │                  PromptTemplateList
                                       │                  ┌───────────────┐
                                       │                  │ Search + list  │
                                       │──onSelect─────►   │ User taps     │
                                       │  (content)        │ a template    │
                                       │                   └───────────────┘
                                       │
                                  pendingContent = content
                                  showTemplates = false
                                  composerActive = true
                                       │
                                       ▼
                               ChatComposerBar
                               ┌─────────────────┐
                               │ initialContent   │
                               │ = content        │
                               │ textarea shows   │
                               │ template text    │
                               │ with {{vars}}    │
                               └─────────────────┘
                               User edits & sends
```

## Step-by-Step

### Step 1: Create `PromptTemplateList.tsx`

**Location:** `src/components/mobile/prompt-templates/PromptTemplateList.tsx`

**Props:**
```ts
type PromptTemplateListProps = {
  onSelect: (content: string) => void;
  onBack: () => void;
};
```

**Behavior:**
- Calls `GET /api/prompt-templates` on mount (same as desktop `TemplatePickerPopover`)
- Shows a search input at top with a "Back to chat" chevron/button
- Groups templates by `category` (templates without category → "General" group)
- Each group has a heading label, then tap targets for each template
- Each item shows: `FileText` icon, template name (bold), description (gray, smaller)
- On select: calls `onSelect(template.content)` immediately
- **States:**
  - **Loading:** 3-4 skeleton rows (shimmer animation, like `SidebarTemplatesPanel`)
  - **Empty:** Centered text "No templates yet" + subtext "Create templates in Settings"
  - **Error:** Inline error banner "Failed to load templates" with a Retry button
- Search filters across `name`, `description`, and `content` fields
- Styled consistently with the mobile BottomSheet look (rounded, bg-card, etc.)
- Scrollable list inside the page

**Key constants / imports reused:**
- `authenticatedFetch` from `../../utils/api`
- `FileText`, `Search`, `ChevronLeft`, `ArrowLeft` icons from lucide-react
- `cn` from `../../lib/utils`

### Step 2: Modify `BottomSheetContent.tsx`

**Changes:**
- Add new optional prop: `onOpenPromptTemplates?: () => void`
- Line 375: Change static `<ActionRow icon={FileText} label="Prompt Templates"... />` to call `onOpenPromptTemplates` in its `onClick`

No other changes to this file.

### Step 3: Modify `ChatComposerBar.tsx`

**Changes:**
- Add new prop: `initialContent?: string`
- Add a `useEffect` watching `initialContent` — when it changes to a non-empty string, set `inputText` to that value

This ensures the composer textarea is pre-filled with the template content when it opens after template selection.

### Step 4: Modify `ChatPage.tsx`

**Changes:**
- Accept new props: `showTemplates: boolean`, `onTemplateSelect: (content: string) => void`, `onTemplateBack: () => void`
- When `showTemplates` is true, render `<PromptTemplateList onSelect={onTemplateSelect} onBack={onTemplateBack} />` instead of `{mainContent}`

### Step 5: Modify `MobileAppShell.tsx`

**Changes:**
- Add two new state variables:
  - `const [showPromptTemplates, setShowPromptTemplates] = useState(false)`
  - `const [pendingTemplateContent, setPendingTemplateContent] = useState('')`
- Add callback `handleOpenPromptTemplates`:
  - Calls `setSheetOpen(false)` (closes BottomSheet)
  - Calls `setShowPromptTemplates(true)`
- Add callback `handleSelectTemplate(content: string)`:
  - Calls `setPendingTemplateContent(content)`
  - Calls `setShowPromptTemplates(false)`
  - Calls `setComposerActive(true)` (opens composer with the template)
- Add callback `handleTemplateBack`:
  - Calls `setShowPromptTemplates(false)` (returns to chat)
- Pass new props to `<ChatPage>`:
  - `showTemplates={showPromptTemplates}`
  - `onTemplateSelect={handleSelectTemplate}`
  - `onTemplateBack={handleTemplateBack}`
- Pass new prop `onOpenPromptTemplates={handleOpenPromptTemplates}` to `<BottomSheetContent>`
- Pass `initialContent={pendingTemplateContent}` to `<ChatComposerBar>`, and reset `pendingTemplateContent` after it's consumed (to avoid re-triggering on subsequent composer opens)
- Also wire up the "Use prompt templates" button in `ChatComposerBar`'s `AttachmentsPanel` — add an `onOpenPromptTemplates` prop to `ChatComposerBar`, which is passed down to the `AttachmentsPanel` component.

### Step 6 (Bonus): Wire ChatComposerBar attachments panel

**Changes in `ChatComposerBar`:**
- Add `onOpenPromptTemplates?: () => void` prop
- Pass it to the `AttachmentsPanel`'s "Use prompt templates" ActionRow `onClick`

This ensures users can also access templates from the `+` attachment menu.

## State & Edge Cases

| Case | Behavior |
|------|----------|
| No templates exist | Empty state with "Create templates in Settings" |
| API fetch fails | Error banner with Retry button |
| Template has no `category` | Grouped under "General" |
| Search matches nothing | "No matching templates" message |
| User taps Back | Returns to chat view, composer stays closed |
| Template selected | Composer opens with template text, `{{placeholders}}` visible |
| User sends without editing placeholders | Template sends with `{{placeholder}}` as plain text (expected, user decision) |
| Double-tap a template | Second tap is a no-op (composer already opened) — `pendingTemplateContent` is consumed once |
| ChatComposerBar already open when selecting template | Text is replaced with template content |

## No Changes To
- Backend API (`/api/prompt-templates`) — already works
- `usePromptTemplatesSettings` hook — not used; inline fetch is simpler for a one-shot picker
- `TemplateEditorModal`, `SaveTemplateButton` — CRUD remains in Settings
- `SidebarTemplatesPanel`, `TemplatesSettingsTab` — desktop-only, unchanged
- `BottomSheet.tsx` — no changes needed
- Any shared types or stores
