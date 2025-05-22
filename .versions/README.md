# Version History

## scrubbable_image_v1.tar.gz
- Date: May 9, 2025
- Description: Implementation of scrubbable image component with view transitions
- Key features:
  - ScrubbableImage component for video thumbnails
  - Fixed view transitions between grid and detail views
  - Non-selected grid items fade out during transitions
  - New elements in detail view fade in after transition
  - Proper Z-index handling for transition elements

To restore this version:
```bash
cd /path/to/project
mkdir -p temp_restore
tar -xzf ./.versions/scrubbable_image_v1.tar.gz -C temp_restore
cp -r temp_restore/* .
rm -rf temp_restore
```