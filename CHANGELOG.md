# Changelog

All notable changes to this project are listed here.

## 2.2.0
- Added "Hide my balance" option — hides your Robux balance while keeping item prices visible
- Consolidated balance settings into a single Show / Hide / Override selector
- Fixed bug where balance override was applied to all Robux values, not just your balance
- Updated popup layout with clearer section headings (Appearance, My Balance)

## 2.1.0
- Fixed bug where balance would show "Free" instead of actual value on Web Store version
- Refactored to use data attributes for reliable detection of page updates
- Balance displays now correctly show "0" instead of "Free" when user has 0 Robux
- "Free" now only displays for item prices, not personal balance
- Improved handling of dynamically loaded content

## 2.0.1
- Updated icons with slight shadow for better visibility on light backgrounds

## 2.0
- Updated project to TypeScript
- Redesigned the popup UI
- Instant script loading and display
- No longer need to refresh the page when changing settings
- Better handling of Free items and other edge cases

## 1.0 - Initial release
- Core functionality: show robux, show USD, show both, or show neither
- Simple popup UI for configuring settings