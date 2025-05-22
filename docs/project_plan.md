# Grid-to-Detail View Transition Implementation Plan

## Overview

This document outlines the step-by-step approach to implement view transitions between the collection grid view and the detail view, including integrating a scrubbable image component for video thumbnails. Each step includes a verification phase to ensure functionality is preserved.

## Problem Statement

1. Current view transitions are not working properly
2. We need to add a scrubbable image component to the grid view
3. We need to implement a smooth transition flow where:
   - Grid elements fade out except for the selected item
   - The selected item transitions to the detail view
   - New elements in the detail view animate in after transition

## Implementation Tasks

### Phase 1: Restore Basic View Transitions

1. **Verify current state**
   - Check if view transitions are working at all
   - Identify any console errors
   - Verification: Navigate between grid and detail views to confirm current behavior

2. **Debug and fix core view transitions implementation**
   - Check HTML metadata for view-transitions support
   - Verify router integration with View Transitions API
   - Confirm transition name consistency between views
   - Verification: Ensure basic transitions work between pages

### Phase 2: Add Scrubbable Image Component

1. **Create the ScrubbableImage component**
   - Add basic functionality without integrating into view transitions
   - Test the component in isolation
   - Verification: Confirm component works standalone

2. **Integrate ScrubbableImage in grid view**
   - Carefully add to CollectionView without breaking view transitions
   - Only apply to video items with sprite URLs
   - Verification: Ensure grid view still loads and displays properly

3. **Test scrubbable thumbnails**
   - Verify mouse interaction works
   - Ensure it does not interfere with routing
   - Verification: Hover over thumbnails to test scrubbing behavior

### Phase 3: Enhance Transition UX

1. **Implement fade-out for non-transitioning grid items**
   - Create helper function to identify items that should fade out
   - Add class-based animation without modifying main transition
   - Verification: Confirm grid items fade out except selected item

2. **Add detail view animations**
   - Create CSS for new element animations in detail view
   - Identify elements that should animate in after transition
   - Verification: Confirm detail elements animate in properly

3. **Fix thumbnail overlay issue**
   - Use z-index management to prevent overlapping elements
   - Control transition timing with proper CSS animations
   - Verification: Check that thumbnails do not persist during transitions

### Phase 4: Final Integration and Testing

1. **Integrate and test complete flow**
   - Ensure all components work together
   - Verify transitions on different browsers
   - Verification: Complete flow testing with all features

2. **Performance optimization**
   - Check for jank or frame drops
   - Optimize animations for smooth transitions
   - Verification: Confirm transitions are smooth

## Detailed Implementation Steps

### Task 1.1: Fix HTML Meta Tags for View Transitions

```html
<\!-- Ensure this meta tag exists in index.html -->
<meta name="view-transition" content="same-origin">
```

### Task 1.2: Update Router Configuration for View Transitions

```js
// Correct implementation with native API
router.beforeEach(async (to, from) => {
  if (document.startViewTransition) {
    try {
      return document.startViewTransition(() => {
        // Let the router handle the navigation
      }).ready;
    } catch (error) {
      console.error("Error during view transition:", error);
    }
  }
});
```

### Task 2.1: ScrubbableImage Component Implementation

```vue
<template>
  <div
    class="scrubbable-image"
    :style="containerStyle"
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
    ref="containerRef"
  >
    <\!-- Scrubbing UI elements -->
  </div>
</template>
```

### Task 3.1: CSS for View Transitions and Animations

```css
/* Basic view transition styles */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.5s;
}

/* Specific transition fixes */
.video-wrapper { 
  z-index: 2;
  background-color: #000;
}

/* Fix for transitions */
::view-transition-group(image),
::view-transition-group(video-image) {
  background-color: #000;
  overflow: hidden;
}
```

## Verification Points

- ✅ Collection grid view displays correctly
- ✅ Detail view displays correctly  
- ✅ View transitions work between grid and detail
- ✅ Scrubbable thumbnails work on hover
- ✅ No thumbnail overlay issues during transitions
- ✅ Grid items fade out appropriately
- ✅ Detail elements animate in correctly
EOF < /dev/null