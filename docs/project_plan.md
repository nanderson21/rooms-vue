# Rooms Vue Development Plan

## Overview

This document outlines the development roadmap for the Rooms Vue application, including the existing implementation and upcoming features.

## Completed Features

### 1. Grid-to-Detail View Transition Implementation
- ✅ Basic view transitions between collection grid and detail views
- ✅ Scrubbable image component for video thumbnails  
- ✅ Smooth transition animations with fade effects
- ✅ Router integration with View Transitions API

### 2. Neo4j Data Analysis Integration (NEW)
- ✅ Neo4j database setup with Docker configuration
- ✅ Data ingestion scripts for JSON file system datasets
- ✅ Interactive data visualization dashboard
- ✅ Multiple view types: Tree structure, Statistics, File explorer, Large files analysis
- ✅ D3.js-powered charts and graphs for data insights
- ✅ Integration into main Vue.js application

### 3. File System Access API Integration (NEW)
- ✅ File System Access API utility module with directory picker and file scanning
- ✅ Media processing utilities for thumbnail generation and metadata extraction
- ✅ Room service for managing file system handles and room data
- ✅ Integration with SpacesView.vue for creating rooms from local folders
- ✅ FileSystemRoomView component for displaying folder contents
- ✅ Support for images, videos, audio, documents with proper thumbnails
- ✅ Real-time thumbnail generation and media metadata extraction
- ✅ Permission handling and error states for file system access

## Upcoming Features

### 4. .room Folders with SQLite Metadata Management (PLANNED)
- See [Room Folders PRD](room-folders-prd.md) for detailed specifications
- SQLite-based metadata management for enhanced folder organization
- JSON configuration system for policies and folder behavior
- Frame.io-style version stacking via drag-and-drop interface
- Database-driven UI customization and persistent folder states
- Automatic policy enforcement and workflow management
- Enhanced file system monitoring and activity logging

### 5. Production Workflow Management System (PLANNED)
- See [Production Workflow PRD](production-workflow-prd.md) for detailed specifications
- Production-based hierarchy management with Rooms and Tasks
- Task-centric navigation replacing pure filesystem browsing
- Participant and role system with permission-based access
- Specialized Task UIs (Kanban, Review/Approval, Editorial workflows)
- Collaborative features with commenting and activity logging
- Integration with .room folder SQLite database infrastructure

## Current Architecture

### Frontend (Vue.js)
- Vue 3 with Composition API
- Vue Router for navigation
- D3.js for data visualizations
- FontAwesome icons
- Vite build system
- File System Access API for local folder access
- Canvas API for thumbnail generation
- HTML5 Media APIs for video/audio processing

### Database (Neo4j)
- Docker-based Neo4j 5.15 deployment
- APOC plugin support for advanced graph operations
- Cypher queries for data analysis
- File system metadata modeling as graph structures

### Data Pipeline
- JSON dataset ingestion from `/src/datasets/`
- Hierarchical file/folder structure modeling
- Relationship mapping for directory trees
- Metadata extraction (size, modification time, file types)

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