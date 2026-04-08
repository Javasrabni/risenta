# Risentta Admin Dashboard Color Palette

> Color palette extracted from `/adm/*` components (Admin Dashboard)

---

## Primary Colors

### Neutral (Grayscale)
| Token | Hex | Usage |
|-------|-----|-------|
| `neutral-50` | `#FAFAFA` | Lightest background |
| `neutral-100` | `#F5F5F5` | Skill tags background, hover states |
| `neutral-200` | `#E5E5E5` | Borders, dividers, separators |
| `neutral-300` | `#D4D4D4` | Input borders, subtle borders |
| `neutral-400` | `#A3A3A3` | Secondary text, placeholders |
| `neutral-500` | `#737373` | Secondary text, muted text |
| `neutral-600` | `#525252` | Body text |
| `neutral-700` | `#404040` | Strong text, headings |
| `neutral-800` | `#262626` | Dark mode backgrounds |
| `neutral-900` | `#171717` | Primary text, headings |
| `neutral-950` | `#0A0A0A` | Deepest dark |

### Gray (Alternative Scale)
| Token | Hex | Usage |
|-------|-----|-------|
| `gray-50` | `#F9FAFB` | Comment backgrounds |
| `gray-100` | `#F3F4F6` | Post background, card background |
| `gray-200` | `#E5E7EB` | Borders |
| `gray-300` | `#D1D5DB` | Button borders |
| `gray-400` | `#9CA3AF` | Icon colors |
| `gray-500` | `#6B7280` | Secondary text |
| `gray-600` | `#4B5563` | Description text |
| `gray-700` | `#374151` | Dark mode elements |
| `gray-800` | `#1F2937` | Dark backgrounds |
| `gray-900` | `#111827` | Dark text |
| `gray-950` | `#030712` | Dark mode backgrounds |

---

## Accent Colors

### Blue (Primary Action)
| Token | Hex | Usage |
|-------|-----|-------|
| `blue-50` | `#EFF6FF` | Reply reference background |
| `blue-100` | `#DBEAFE` | Light hover states |
| `blue-400` | `#60A5FA` | Dark mode links |
| `blue-500` | `#3B82F6` | Upload button, coordinator accent |
| `blue-600` | `#2563EB` | Primary buttons, links |
| `blue-700` | `#1D4ED8` | Button hover |
| `blue-900` | `#1E3A8A` | Dark mode reply backgrounds |

### Amber (Special/Coordinator)
| Token | Hex | Usage |
|-------|-----|-------|
| `amber-50` | `#FFFBEB` | Light accent backgrounds |
| `amber-500` | `#F59E0B` | Coordinator accent (Rasyid section) |
| `amber-500/10` | `rgba(245, 158, 11, 0.1)` | Center coordinator gradient |

### Slate (Text & UI)
| Token | Hex | Usage |
|-------|-----|-------|
| `slate-50` | `#F8FAFC` | Light backgrounds |
| `slate-100` | `#F1F5F9` | Borders |
| `slate-200` | `#E2E8F0` | Dividers |
| `slate-300` | `#CBD5E1` | Light borders |
| `slate-400` | `#94A3B8` | Description text |
| `slate-500` | `#64748B` | Secondary text |
| `slate-600` | `#475569` | Body text (post descriptions) |
| `slate-700` | `#334155` | Strong text |
| `slate-800` | `#1E293B` | Dark surfaces |
| `slate-900` | `#0F172A` | Dark backgrounds |
| `slate-950` | `#020617` | Deepest dark |

---

## Semantic Colors

### Success
| Token | Hex | Usage |
|-------|-----|-------|
| `green-500` | `#22C55E` | Success messages |

### Error/Danger
| Token | Hex | Usage |
|-------|-----|-------|
| `red-500` | `#EF4444` | Delete actions, errors |
| `red-600` | `#DC2626` | Hover states for delete |

---

## Dark Mode Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `dark:bg-black` | `#000000` | Profile card background |
| `dark:bg-neutral-800` | `#262626` | Card backgrounds, inputs |
| `dark:bg-neutral-700` | `#404040` | Hover states |
| `dark:bg-neutral-600` | `#525252` | Skill tags, buttons |
| `dark:bg-neutral-900` | `#171717` | Post backgrounds |
| `dark:bg-gray-800` | `#1F2937` | Menu backgrounds |
| `dark:bg-gray-700` | `#374151` | Comment backgrounds |
| `dark:bg-blue-900/30` | `rgba(30, 58, 138, 0.3)` | Reply reference background |
| `dark:border-neutral-800` | `#262626` | Borders |
| `dark:border-neutral-700` | `#404040` | Subtle borders |
| `dark:border-neutral-600` | `#525252` | Input borders |

---

## Background Gradients

```
from-blue-500/10 to-transparent    - Division section backgrounds
from-amber-500/10 to-transparent     - Coordinator section (center)
from-gray-200 to-gray-300            - Avatar skeleton gradient (light)
from-gray-700 to-gray-800            - Avatar skeleton gradient (dark)
```

---

## Opacity Values

| Value | Usage |
|-------|-------|
| `opacity-50` | Disabled states |
| `opacity-60` | Cover image overlay |
| `bg-black/70` | Video unmute button |
| `bg-black/80` | Video button hover |

---

## Component-Specific Colors

### Profile Card
- **Background**: `white` (light) / `black` (dark)
- **Border**: `neutral-200` (light) / `neutral-800` (dark)
- **Shadow**: `shadow-xl` on md screens

### Post Card
- **Background**: `white` (light) / `neutral-900` (dark)
- **Border**: `gray-200` (light) / `neutral-800` (dark)
- **Shadow**: `shadow-xs`

### Comments Section
- **Background**: `gray-50` (light) / `neutral-800/50` (dark)
- **Border**: `gray-100` (light) / `neutral-800` (dark)

### Skill Tags
- **Background**: `neutral-100` (light) / `neutral-800` (dark)
- **Text**: `neutral-700` (light) / `neutral-300` (dark)
- **Border**: `neutral-200` (light) / `neutral-700` (dark)

### Buttons
- **Primary**: `bg-neutral-900` text-white / `dark:bg-white` dark:text-neutral-900
- **Secondary**: `bg-white` text-black / `dark:bg-neutral-800` dark:text-white
- **Danger**: `text-red-600` hover:bg-gray-100

---

## Usage Summary

```
Primary Text:       neutral-900 (dark) / white (dark mode)
Secondary Text:     neutral-500 / neutral-400 (dark)
Borders:            neutral-200 / neutral-800 (dark)
Backgrounds:        white / black or neutral-900 (dark)
Accent/Links:       blue-600 / blue-400 (dark)
Success:            green-500
Error/Danger:       red-500 / red-600
```
