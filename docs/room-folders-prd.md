# .room Folders with SQLite Metadata Management - PRD

## Overview

This PRD outlines the development of a comprehensive .room folder system that builds upon the existing File System Access API integration. The goal is to create an intelligent folder-based workflow management system that explicitly stores context, metadata, and policies directly within the filesystem using SQLite databases and JSON configuration files.

## Background

The existing SpacesView.vue implementation provides excellent File System Access API functionality for browsing and managing local video workflow folders. This feature builds upon that foundation to create a more sophisticated workflow management system inspired by Frame.io's version stacking and organizational capabilities.

## Core Concept

### .room Folder Structure
```
/project-name.room/
├── .room-metadata.db          # SQLite database for all metadata
├── room-config.json           # Room-level configuration
├── policies/                  # Workflow policies directory
│   ├── ingest-policies.json   # File ingestion rules
│   ├── format-policies.json   # Expected formats per folder type
│   └── ui-policies.json       # UI display and interaction rules
├── folders/                   # Managed subfolders
│   ├── raw/
│   │   ├── .folder-config.json
│   │   └── [content files]
│   ├── proxies/
│   │   ├── .folder-config.json
│   │   └── [content files]
│   └── final/
│       ├── .folder-config.json
│       └── [content files]
└── versions/                  # Version stacking metadata
    └── version-stacks.json    # Frame.io style version relationships
```

## Key Features

### 1. SQLite Metadata Database (.room-metadata.db)

**Tables:**
- `folders` - Folder metadata, status, type, purpose
- `files` - File metadata, relationships, versions
- `version_stacks` - Version relationships and stacking
- `activities` - Activity log for all interactions
- `policies` - Active policies and rules
- `ui_state` - UI display preferences and customizations

**Schema Example:**
```sql
CREATE TABLE folders (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'raw', 'proxy', 'final', 'custom'
    status TEXT DEFAULT 'active', -- 'active', 'inactive', 'archived'
    purpose TEXT, -- Description of folder purpose
    expected_formats TEXT, -- JSON array of expected file formats
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata JSON -- Additional folder-specific metadata
);

CREATE TABLE files (
    id TEXT PRIMARY KEY,
    folder_id TEXT REFERENCES folders(id),
    path TEXT NOT NULL,
    name TEXT NOT NULL,
    size INTEGER,
    type TEXT,
    status TEXT DEFAULT 'active',
    version_stack_id TEXT,
    version_number INTEGER,
    is_latest_version BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata JSON -- File-specific metadata
);

CREATE TABLE version_stacks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    base_file_id TEXT REFERENCES files(id),
    latest_version_id TEXT REFERENCES files(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata JSON -- Version stack metadata
);
```

### 2. JSON Configuration System

#### room-config.json
```json
{
    "version": "1.0",
    "name": "Project Name",
    "type": "video_workflow", 
    "created": "2025-08-12T00:00:00Z",
    "settings": {
        "auto_scan": true,
        "thumbnail_generation": true,
        "version_stacking_enabled": true,
        "ui_mode": "enhanced" // 'basic', 'enhanced', 'custom'
    },
    "folder_types": [
        "raw",
        "proxies", 
        "final",
        "archive"
    ]
}
```

#### .folder-config.json (per folder)
```json
{
    "type": "raw",
    "purpose": "Original camera files and assets",
    "expected_formats": [".mov", ".mp4", ".r3d", ".mxf"],
    "auto_ingest": true,
    "thumbnail_priority": "high",
    "version_stacking": false,
    "display_settings": {
        "sort_by": "date_created",
        "group_by": "none",
        "thumbnail_size": "medium"
    },
    "policies": {
        "allow_delete": false,
        "allow_rename": true,
        "require_backup": true
    }
}
```

### 3. Enhanced UI Integration

#### SpacesView.vue Enhancements
- Detect .room folders and display them with special room icons
- Show room status (active/inactive) based on database metadata
- Display folder hierarchy with type-based icons and status indicators
- Version stack visualization (Frame.io style)

#### New Components
- `RoomFolderView.vue` - Specialized view for .room folders
- `VersionStackManager.vue` - Drag-and-drop version stacking interface
- `FolderPolicyEditor.vue` - UI for editing folder policies
- `RoomDashboard.vue` - Overview of room health, stats, and activity

### 4. Version Stacking (Frame.io Style)

**Drag-and-Drop Interface:**
- Drag files onto each other to create version stacks
- Visual indicators showing version relationships
- Latest version highlighted
- Ability to promote any version to "latest"
- Version history timeline

**Database Integration:**
- Track version relationships in `version_stacks` table
- Maintain file metadata while preserving filesystem structure
- Support for branching versions (multiple versions from same base)

### 5. Automatic Folder Management

**File System Monitoring:**
- Watch for new files added to managed folders
- Automatically update database when filesystem changes
- Trigger policy enforcement (format validation, thumbnail generation)
- Activity logging for all detected changes

**Policy Enforcement:**
- Validate file formats against folder expectations
- Auto-generate thumbnails based on folder settings
- Enforce naming conventions and organizational rules
- Trigger workflows based on file types and folder policies

## Technical Implementation

### Database Service Layer
```javascript
// src/services/roomDatabase.js
class RoomDatabaseService {
    constructor(roomPath) {
        this.dbPath = path.join(roomPath, '.room-metadata.db');
        this.db = null;
    }
    
    async initialize() {
        // Initialize SQLite database
        // Create tables if they don't exist
        // Set up indexes and triggers
    }
    
    async createFolder(folderData) {
        // Insert folder metadata
        // Update filesystem if needed
    }
    
    async createVersionStack(files) {
        // Create version relationship
        // Update file metadata
    }
    
    async updateFolderStatus(folderId, status) {
        // Update database
        // Trigger UI refresh
    }
    
    // ... additional methods
}
```

### Room Service Integration
```javascript
// src/services/roomService.js - extend existing service
class RoomService {
    async createRoomFolder(parentPath, roomConfig) {
        // Create .room folder structure
        // Initialize SQLite database
        // Create default policies
        // Return room handle
    }
    
    async loadRoomFolder(roomPath) {
        // Validate .room structure
        // Load database and configurations
        // Initialize file system watching
        // Return room data
    }
    
    async syncRoomWithFilesystem(roomId) {
        // Scan filesystem for changes
        // Update database
        // Apply policies
        // Generate thumbnails as needed
    }
}
```

### UI Integration Points

#### Enhanced File Tree (TreeNode.vue)
- Display version stack indicators
- Show folder type icons and status
- Drag-and-drop support for version stacking
- Context menus for folder/file management

#### Room-Aware Collection Views
- Adapt existing collection views to understand room structure
- Display version stacks as grouped items
- Show folder-specific metadata and policies
- Enable room-specific sorting and filtering

## User Stories

### Epic 1: Room Creation and Management
1. **As a user**, I want to convert an existing folder into a .room so I can manage it with enhanced metadata and policies
2. **As a user**, I want to create a new .room folder with predefined folder structure based on workflow templates
3. **As a user**, I want to see room health status and statistics in the SpacesView

### Epic 2: Version Stacking
1. **As a user**, I want to drag one file onto another to create a version stack relationship
2. **As a user**, I want to see all versions of a file grouped together with the latest version prominently displayed
3. **As a user**, I want to promote any version in a stack to be the "latest" version
4. **As a user**, I want to expand/collapse version stacks to see all versions or just the latest

### Epic 3: Policy-Driven Workflows
1. **As a user**, I want to define which file formats are expected in each folder
2. **As a user**, I want automatic thumbnail generation based on folder-specific settings
3. **As a user**, I want to receive warnings when files don't match folder expectations
4. **As a user**, I want to customize how folders are displayed based on their type and purpose

### Epic 4: Database-Driven UI Customization
1. **As a user**, I want folder display preferences to persist in the database
2. **As a user**, I want to see activity history for all room interactions
3. **As a user**, I want to mark folders as active/inactive without moving files
4. **As a user**, I want search and filtering based on database metadata

## Acceptance Criteria

### Phase 1: Core Infrastructure
- [ ] SQLite database creation and management
- [ ] JSON configuration system
- [ ] .room folder structure creation
- [ ] Basic room detection in SpacesView
- [ ] Database-backed folder metadata

### Phase 2: Version Stacking
- [ ] Drag-and-drop version stack creation
- [ ] Version relationship visualization
- [ ] Latest version promotion
- [ ] Version stack expand/collapse

### Phase 3: Policy System
- [ ] Folder policy definition and editing
- [ ] Format validation and enforcement
- [ ] Automatic thumbnail generation per folder settings
- [ ] Activity logging and monitoring

### Phase 4: Enhanced UI
- [ ] Room dashboard with statistics and health
- [ ] Advanced filtering and search based on database metadata
- [ ] Customizable folder display preferences
- [ ] Integration with existing video player and preview systems

## Technical Considerations

### Performance
- SQLite database should be lightweight and performant for typical workflow sizes
- File system watching should be efficient and not impact system performance
- Thumbnail generation should be background/async where possible

### Data Integrity
- Database transactions for related operations
- Backup and recovery strategies for .room metadata
- Conflict resolution when filesystem changes outside of application

### Browser Compatibility
- File System Access API limitations (Chrome/Edge only currently)
- SQLite in browser using SQL.js or similar solution
- Progressive enhancement for unsupported browsers

### Security
- Validate all database inputs to prevent injection
- Sanitize file paths and names
- Respect filesystem permissions and boundaries

## Success Metrics

1. **User Adoption**: Percentage of filesystem rooms converted to .room folders
2. **Workflow Efficiency**: Time saved in file organization and version management
3. **Data Accuracy**: Reduction in lost or misplaced files through better metadata
4. **User Satisfaction**: Positive feedback on version stacking and policy features

## Future Enhancements

1. **Cloud Sync**: Sync .room metadata across devices while keeping files local
2. **Team Collaboration**: Shared room metadata for team workflows
3. **Advanced Analytics**: Detailed workflow analytics and optimization suggestions
4. **Plugin System**: Custom policies and workflows through JavaScript plugins
5. **Integration APIs**: REST API for external tool integration

---

*This PRD serves as a comprehensive guide for implementing advanced workflow management capabilities that build upon the existing File System Access API foundation while adding intelligent metadata management and Frame.io-inspired organizational features.*