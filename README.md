# Rooms Vue Preview

A preview environment for the rooms-vue project, which refactors the media browsing and review/approval components from Backstage (built with Astro.js) into Vue.js components.

## Development Setup

To preview the application:

1. Install dependencies:
   ```
   npm install
   ```

2. Run the development server:
   ```
   npm run dev
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:4000
   ```

## Features Implemented

- Collection Grid/List View
  - Toggle between grid and list views
  - View transitions for smooth navigation

- Media Item Detail View
  - Video player with comment markers and controls
  - Comment system with timeline integration
  - Tabbed interface for comments and file info

- Video Player with Comments
  - Custom video player with embedded comment markers
  - Timeline scrubbing
  - Fullscreen support

## Project Structure

- `/src/views/CollectionView.vue` - Grid/list view of collection items
- `/src/views/CollectionItemDetail.vue` - Detail view of a single item
- `/src/components/VideoPlayerWithComments.vue` - Video player with comment functionality
- `/src/utils/mockData.js` - Mock data for testing

## Notes

This is a preview implementation that focuses on recreating the functionality and UI experience of the original Backstage components. The styling and theming can be adjusted later to match the cs-frontend design system.