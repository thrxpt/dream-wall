---
name: Dream Wall
description: Beyond the Star. Dream Begin.
colors:
  space: "#050a19"
  surface: "#0c1428"
  line: "#25324d"
  ink: "#f2f5ff"
  muted: "#a7b7d5"
  blue: "#82b4ff"
  cyan: "#96e9f7"
  action: "#346ff0"
  danger: "#ffb3b4"
  dream-panel: "#0c162cf5"
  arrival-panel: "#132d51"
typography:
  display:
    fontFamily: '"Manrope Variable", "Noto Sans Thai", sans-serif'
    fontSize: "clamp(45px, 5.9vw, 90px)"
    fontWeight: 650
    lineHeight: 1.08
    letterSpacing: "-.04em"
  headline:
    fontFamily: '"Manrope Variable", "Noto Sans Thai", sans-serif'
    fontSize: "clamp(25px, 3vw, 36px)"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-.025em"
  dream:
    fontFamily: '"Noto Sans Thai", "Manrope Variable", sans-serif'
    fontSize: "clamp(20px, 1.55vw, 27px)"
    fontWeight: 500
    lineHeight: 1.65
  arrival:
    fontFamily: '"Noto Sans Thai", "Manrope Variable", sans-serif'
    fontSize: "clamp(25px, 2.7vw, 44px)"
    fontWeight: 500
    lineHeight: 1.65
  body:
    fontFamily: '"Manrope Variable", "Noto Sans Thai", sans-serif'
    fontSize: "15px"
    lineHeight: 1.8
  label:
    fontFamily: '"Manrope Variable", "Noto Sans Thai", sans-serif'
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  control: "8px"
  button: "9px"
  card: "14px"
  feature: "16px"
  round-tag: "30px"
spacing:
  compact: "8px"
  gap: "16px"
  group: "24px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "white"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "11px 16px"
  button-secondary:
    backgroundColor: "#142039"
    textColor: "#e2ebff"
    rounded: "{rounded.button}"
    padding: "11px 16px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "#b8c8e3"
    rounded: "{rounded.button}"
    padding: "11px 16px"
  button-danger-outline:
    backgroundColor: "transparent"
    textColor: "{colors.danger}"
    rounded: "{rounded.button}"
    padding: "11px 16px"
  button-danger:
    backgroundColor: "#ac3549"
    textColor: "white"
    rounded: "{rounded.button}"
    padding: "11px 16px"
  search-field:
    backgroundColor: "#080f20"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "9px 12px"
    width: "250px"
  round-tag:
    textColor: "{colors.muted}"
    rounded: "{rounded.round-tag}"
    padding: "8px 15px"
  dream-card:
    backgroundColor: "{colors.dream-panel}"
    textColor: "{colors.ink}"
    typography: "{typography.dream}"
    rounded: "{rounded.card}"
    padding: "20px 22px 17px"
  arrival:
    backgroundColor: "{colors.arrival-panel}"
    textColor: "{colors.ink}"
    typography: "{typography.arrival}"
    rounded: "{rounded.feature}"
    padding: "24px 30px"
---

# Design System: Dream Wall

## Overview

**Creative North Star: "The Neptune Dream Constellation"**

An anonymous dream becomes a star in a shared Neptune sky. Deep blue space, real Neptune photography, fine orbits and ice-white Thai text support the exact event theme: “Beyond the Star. Dream Begin.”

The public wall is a spacious projector experience; administration is a denser operating surface. Opaque message panels keep the sky behind the reading plane. CSS in app/globals.css remains the implementation authority.

**Key Characteristics:**
- Department identity: “COMPUTER ENGINEERING · OPERATION NEPTUNE” beneath the Dream Wall wordmark. The Thai invitation “ให้ความฝันของเธอ ออกเดินทางไกลกว่าดวงดาว” sits beneath the event heading, followed by “Terminal of Despina · CLI Workshop” in smaller muted text. Both remain visible when dreams are displayed.
- Midnight blue with cyan and electric blue accents.
- Thai-first message readability with compact Manrope controls.
- A single featured arrival, then a rotating shared wall.

## Colors

### Primary
Electric action blue drives primary controls; pale blue identifies the title, brand and stars. Cyan marks live status, selected pagination and keyboard focus.

### Neutral
Midnight space surrounds navy operating panels; ice-white carries text and muted blue carries supporting information. Dream and arrival panels have their own opaque reading surfaces. Rose signals destructive actions; connection warnings use warm amber treatments.

## Typography

Manrope Variable supplies Latin display and controls, with Noto Sans Thai fallback. Dream text explicitly leads with Noto Sans Thai. Fonts are bundled locally through Fontsource.

The display contracts to (clamp(38px, 4.1vw, 64px)) when dreams exist. Admin headlines use the headline role; list messages use body. Arrival text is centered with a (1000px) maximum width. At mobile size, dream text becomes (18px), arrival text (24px), left aligned; very narrow cards return to (20px). Small status and signature labels support, rather than replace, readable dream text.

**The Reading Plane Rule.** Preserve full Thai text on the opaque message plane; long submissions advance through readable segments rather than shrinking into microtype.

## Layout

The wall fills at least (100svh), with a flex column, a flexible central dream region and a footer. Desktop shell padding is (32px 4.5vw 22px); messages use three equal columns with the gap token. Up to six segments appear per page. Neptune occupies the right sky behind the content; its opacity decreases when dreams appear.

At (1000px) the shell and cards tighten. At (700px) the grid becomes two columns, header status stacks, admin search spans the toolbar width, list actions wrap and reset controls stack. At (380px) the grid becomes one column. Screens at least (1700px) enlarge cards, branding and controls. A separate short-desktop query at (min-width: 701px) and (max-height: 820px) compresses the occupied title and card spacing. Admin content is centered within (1120px), with (36px 32px 0) padding.

## Elevation & Depth

Depth comes from the radial sky, screened Neptune image and tonal, bordered panels. Cards have no drop shadow. The reset dialog alone uses an ambient shadow (0 18px 60px #0007) over a dark backdrop (#020610cc).

## Shapes

Fine orbital ellipses and circular stars belong to the sky. Controls have small rounded corners; cards are broader and the arrival/dialog share the feature radius. Round identifiers are outlined capsules. Borders, rather than heavy shadows, separate reading and operating surfaces.

## Components

Buttons share a compact label, icon gap (8px), minimum height (42px) and transition (160ms ease). Primary is electric blue; secondary is filled navy; quiet is transparent; outlined and filled rose variants distinguish reset entry from confirmed deletion. Hover changes the fill. Disabled controls reduce opacity to (.45). Global keyboard focus is a cyan (2px) outline with (5px) offset; search uses a focus-within outline with (3px) offset.

Search is a bordered dark field. Filter navigation is an inline group with a filled selected tab and `aria-pressed`; the round capsule pairs muted text with a brighter tabular number. Dream cards preserve whitespace and wrap unbroken text. Star icons repeat the constellation language without introducing an institutional logo.

The arrival panel replaces the grid for each new dream. Text is segmented into at most (64) Thai graphemes per part, with each part shown for (6500ms); normal wall pages rotate every (12000ms). Pause/resume lives in an admin playback section and stops both timers and background animations across every display through the shared polled snapshot. The state persists across reloads; reset resumes playback. The public footer retains the count and motto, with no controls or admin link; F toggles fullscreen. Round changes and hidden messages reconcile the displayed content immediately. Empty/loading/offline states retain the sky; public connection copy promises automatic retry. Admin filters, search, hide/restore and a native reset dialog support operation; deletion requires the exact typed word `RESET`.

Admin has a separate automatic-update control above playback. It stops scheduled two-second requests across all displays and persists through reloads and resets, while submissions continue to save. A manual check fetches once. Re-enabling requires each stopped projector tab to reload or become visible again; this instruction remains next to the control. Stopped displays show a muted waiting status, and playback controls are disabled until automatic updates are enabled.

Arrival entrance is a gentle (700ms) upward fade with blur; the loading orbit rotates over (3s). Reduced-motion preference removes animations, transitions and smooth scrolling. The fullscreen shortcut runs only when supported.

## Do's and Don'ts

### Do:
- **Do** preserve the supplied event wording and Neptune identity.
- **Do** keep Thai dreams on opaque, high-contrast surfaces and retain every segment.
- **Do** preserve keyboard focus, pause/resume and reduced-motion support.

### Don't:
- **Don't** invent institutional logos, endorsements or participant dreams.
- **Don't** turn the public wall into a submission form or CLI tutorial.
