# Production Workflow Management System - PRD

## Overview

This PRD defines a comprehensive Production-based workflow management system that builds upon the .room folder SQLite infrastructure. The system introduces Productions as root-level containers that manage hierarchies of Rooms, Tasks, and Participants to create a complete collaborative workflow platform for video production and content management.

## Background

Building on the .room folder system's SQLite metadata management, this feature creates a higher-level organizational structure that mirrors real-world production workflows. Instead of just browsing filesystem hierarchies, users can navigate via Tasks that group and contextualize directories, providing different UIs based on task type and workflow stage.

## Core Concept

### Hierarchical Structure
```
Production
├── Rooms (can contain sub-Rooms)
│   ├── Linked Folders (.room or regular filesystem)
│   ├── Tasks
│   │   ├── Assigned Participants
│   │   ├── Connected Directories
│   │   └── Custom Task UI (Review, Approval, Kanban, etc.)
│   └── Sub-Rooms
└── Global Participants & Roles
```

### Database Schema Extensions

**New Tables (extends .room-metadata.db):**

```sql
-- Productions table
CREATE TABLE productions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active', -- 'active', 'paused', 'completed', 'archived'
    created_by TEXT, -- participant_id
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deadline DATE,
    metadata JSON -- Production-specific settings and data
);

-- Rooms table (hierarchical)
CREATE TABLE rooms (
    id TEXT PRIMARY KEY,
    production_id TEXT REFERENCES productions(id),
    parent_room_id TEXT REFERENCES rooms(id), -- NULL for root rooms
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL, -- 'editorial', 'review', 'archive', 'custom'
    status TEXT DEFAULT 'active',
    folder_path TEXT, -- Linked filesystem folder (optional)
    is_room_folder BOOLEAN DEFAULT FALSE, -- True if linked to .room folder
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata JSON
);

-- Tasks table
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    room_id TEXT REFERENCES rooms(id),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL, -- 'review_approval', 'editorial', 'upload', 'archive', 'kanban', 'custom'
    status TEXT DEFAULT 'todo', -- 'todo', 'in_progress', 'review', 'completed', 'blocked'
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    assigned_to TEXT, -- participant_id (primary assignee)
    created_by TEXT REFERENCES participants(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    due_date DATE,
    completed_at DATETIME,
    folder_path TEXT, -- Connected directory
    ui_config JSON, -- Task-specific UI configuration
    metadata JSON
);

-- Participants table
CREATE TABLE participants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL, -- 'director', 'editor', 'producer', 'reviewer', 'client', 'custom'
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata JSON -- Additional participant data
);

-- Task assignments (many-to-many)
CREATE TABLE task_assignments (
    task_id TEXT REFERENCES tasks(id),
    participant_id TEXT REFERENCES participants(id),
    role TEXT, -- Role in this specific task
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (task_id, participant_id)
);

-- Room access permissions
CREATE TABLE room_permissions (
    room_id TEXT REFERENCES rooms(id),
    participant_id TEXT REFERENCES participants(id),
    permission_level TEXT DEFAULT 'read', -- 'read', 'write', 'admin'
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, participant_id)
);

-- Task comments and activities
CREATE TABLE task_activities (
    id TEXT PRIMARY KEY,
    task_id TEXT REFERENCES tasks(id),
    participant_id TEXT REFERENCES participants(id),
    activity_type TEXT NOT NULL, -- 'comment', 'status_change', 'file_upload', 'assignment'
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata JSON
);
```

## Key Features

### 1. Production Management

#### Production Creation and Setup
```json
// production-config.json
{
    "version": "1.0",
    "id": "prod_12345",
    "name": "Feature Film Project",
    "type": "film_production",
    "created": "2025-08-12T00:00:00Z",
    "settings": {
        "default_room_type": "editorial",
        "auto_task_creation": true,
        "notification_settings": {
            "deadline_reminders": true,
            "status_updates": true
        },
        "ui_theme": "dark",
        "kanban_enabled": true
    },
    "workflow_templates": [
        "standard_editorial",
        "client_review",
        "final_delivery"
    ]
}
```

#### Features:
- Create Productions with name, description, deadline, and settings
- Link existing .room folders or regular filesystem directories
- Define production-wide participants and roles
- Set global permissions and access controls
- Production dashboard with progress overview

### 2. Room Hierarchy Management

#### Hierarchical Room Structure
- **Root Rooms**: Direct children of Production
- **Sub-Rooms**: Nested organization for complex projects
- **Linked Folders**: Connection to filesystem directories
- **Room Types**: Editorial, Review, Archive, Custom

#### Room Configuration
```json
// room-config.json (extends .folder-config.json)
{
    "room_id": "room_editorial_01",
    "production_id": "prod_12345",
    "parent_room_id": null,
    "type": "editorial",
    "linked_folder": "/path/to/editorial-folder",
    "is_room_folder": true,
    "permissions": {
        "default_access": "read",
        "allow_task_creation": ["editor", "director", "producer"],
        "allow_file_upload": ["editor", "assistant_editor"]
    },
    "ui_settings": {
        "default_view": "task_board",
        "show_folder_tree": true,
        "enable_version_stacking": true
    }
}
```

### 3. Task-Based Navigation and Management

#### Task Types and Custom UIs

**Review & Approval Tasks:**
```json
{
    "type": "review_approval",
    "ui_config": {
        "view_type": "review_grid",
        "approval_workflow": {
            "stages": ["initial_review", "director_approval", "final_approval"],
            "required_approvers": 2,
            "allow_comments": true,
            "show_version_compare": true
        },
        "display_options": {
            "thumbnail_size": "large",
            "show_timecode": true,
            "enable_annotations": true
        }
    }
}
```

**Kanban Board Tasks:**
```json
{
    "type": "kanban",
    "ui_config": {
        "view_type": "kanban_board",
        "columns": [
            {"id": "backlog", "name": "Backlog", "limit": 0},
            {"id": "in_progress", "name": "In Progress", "limit": 3},
            {"id": "review", "name": "Review", "limit": 5},
            {"id": "done", "name": "Complete", "limit": 0}
        ],
        "card_fields": ["assignee", "due_date", "priority", "file_count"],
        "enable_drag_drop": true
    }
}
```

**Editorial Tasks:**
```json
{
    "type": "editorial",
    "ui_config": {
        "view_type": "timeline_view",
        "timeline_settings": {
            "show_versions": true,
            "group_by_sequence": true,
            "enable_rough_cut": true
        },
        "media_browser": {
            "show_metadata": true,
            "thumbnail_scrubbing": true,
            "filter_by_status": true
        }
    }
}
```

#### Task Features:
- Task creation with type selection and custom UI configuration
- Participant assignment and role-based access
- Connected directory management (link to filesystem folders)
- Status tracking with customizable workflows
- Activity logging and comment system
- Due date tracking and notifications

### 4. Participant and Role System

#### Role Definitions
```javascript
// Default roles (customizable per production)
const DEFAULT_ROLES = {
    director: {
        name: "Director",
        permissions: ["view_all", "approve_final", "create_tasks", "manage_participants"],
        color: "#FF6B6B"
    },
    producer: {
        name: "Producer",
        permissions: ["view_all", "manage_budget", "create_tasks", "manage_participants"],
        color: "#4ECDC4"
    },
    editor: {
        name: "Editor",
        permissions: ["view_editorial", "upload_media", "create_versions", "comment"],
        color: "#45B7D1"
    },
    assistant_editor: {
        name: "Assistant Editor",
        permissions: ["view_editorial", "upload_media", "organize_media"],
        color: "#96CEB4"
    },
    reviewer: {
        name: "Reviewer",
        permissions: ["view_assigned", "comment", "approve_assigned"],
        color: "#FFEAA7"
    },
    client: {
        name: "Client",
        permissions: ["view_review", "comment", "approve_final"],
        color: "#DDA0DD"
    }
};
```

#### Participant Management:
- Add participants with name, email, and role
- Assign participants to specific tasks and rooms
- Role-based UI customization and feature access
- Activity tracking per participant
- Simple presence indicators (no real-time auth required)

### 5. Task-Based UI Navigation

#### Navigation Structure
```
Production Dashboard
├── Room Overview (Hierarchical tree)
├── Task Board (All tasks across rooms)
│   ├── My Tasks
│   ├── Team Tasks  
│   ├── By Status
│   └── By Due Date
├── Kanban Views (Per task type)
├── Review Queues
└── Reports & Analytics
```

#### Custom UI Components

**TaskBoardView.vue**
- Displays tasks grouped by status, assignee, or custom criteria
- Drag-and-drop task status updates
- Quick task creation and assignment
- Filtering and search across all production tasks

**KanbanView.vue**
- Customizable column-based workflow
- Task cards with rich information display
- Lane swimming for different task types or priorities
- Real-time updates when tasks move between columns

**ReviewApprovalView.vue**
- Media-focused review interface
- Side-by-side version comparison
- Annotation and commenting system
- Approval workflow with digital signatures/checkboxes

**RoomHierarchyTree.vue**
- Collapsible tree view of Production → Rooms → Tasks
- Drag-and-drop room and task reorganization
- Visual indicators for task status and room health
- Context menus for quick actions

## Technical Implementation

### Service Layer Extensions

#### Production Service
```javascript
// src/services/productionService.js
class ProductionService {
    constructor() {
        this.db = null;
    }
    
    async createProduction(productionData) {
        // Create production record
        // Initialize production database
        // Create default rooms and participants
        // Return production handle
    }
    
    async loadProduction(productionId) {
        // Load production configuration
        // Initialize room and task data
        // Set up participant permissions
        // Return production state
    }
    
    async createRoom(productionId, roomData) {
        // Create room in hierarchy
        // Link to filesystem folder if specified
        // Set up permissions
        // Initialize room-specific database tables
    }
    
    async createTask(roomId, taskData) {
        // Create task record
        // Link to connected directories
        // Set up UI configuration
        // Notify assigned participants
    }
    
    async assignParticipant(taskId, participantId, role) {
        // Create assignment relationship
        // Update task permissions
        // Log assignment activity
    }
    
    // ... additional methods for task management, status updates, etc.
}
```

#### Task Navigation Service
```javascript
// src/services/taskNavigationService.js
class TaskNavigationService {
    async getTasksByStatus(productionId, status) {
        // Query tasks across all rooms by status
        // Include room and participant context
        // Return task list with metadata
    }
    
    async getTasksByParticipant(participantId) {
        // Get all tasks assigned to participant
        // Group by production and room
        // Include due dates and priorities
    }
    
    async getTasksForRoom(roomId) {
        // Get all tasks for specific room
        // Include connected directory information
        // Return with UI configuration
    }
    
    async updateTaskStatus(taskId, newStatus, participantId) {
        // Update task status
        // Log activity
        // Trigger notifications if needed
        // Update Kanban board positions
    }
}
```

### UI Component Architecture

#### Navigation Components
- **ProductionSelector.vue**: Production switcher and overview
- **TaskNavigationSidebar.vue**: Task-based navigation panel
- **RoomHierarchyTree.vue**: Hierarchical room and task browser
- **ParticipantPresence.vue**: Show active participants and roles

#### Task Management Components
- **TaskCreator.vue**: Modal for creating new tasks with type selection
- **TaskCard.vue**: Reusable task display component for various views
- **TaskDetailPanel.vue**: Expandable task details with activities and comments
- **ParticipantAssignment.vue**: Participant selection and role assignment UI

#### Specialized View Components
- **ProductionDashboard.vue**: Production overview with progress metrics
- **TaskBoardView.vue**: Configurable task board with multiple grouping options
- **KanbanView.vue**: Drag-and-drop Kanban board for workflow management
- **ReviewApprovalView.vue**: Media review interface with approval workflows

### Integration with Existing System

#### SpacesView.vue Enhancements
- Add "Production Mode" toggle
- Show productions in sidebar alongside rooms
- Production-aware room creation and management
- Task-based filtering and navigation options

#### FileSystemCollectionAdapter.vue Extensions
- Task context awareness for file display
- Show files grouped by associated tasks
- Task-specific file actions and workflows
- Integration with review and approval UIs

## User Stories

### Epic 1: Production Setup and Management
1. **As a production manager**, I want to create a new Production with linked folders so I can organize all project assets under one hierarchy
2. **As a production manager**, I want to create Rooms within the Production and link them to filesystem folders so I can organize work by department or phase
3. **As a production manager**, I want to add Participants with defined roles so I can control access and assign work appropriately

### Epic 2: Task-Based Workflow Management
1. **As a department head**, I want to create Tasks within Rooms and connect them to specific directories so work can be organized by deliverable rather than just filesystem structure
2. **As a team member**, I want to view my assigned tasks across all productions so I can prioritize my work efficiently
3. **As a director**, I want to create review and approval tasks with custom UI so stakeholders can provide feedback in a structured way

### Epic 3: Specialized Task UIs
1. **As an editor**, I want Kanban board view for my tasks so I can manage workflow stages visually
2. **As a client**, I want a review interface that shows media with commenting and approval options so I can provide feedback efficiently
3. **As a producer**, I want dashboard views showing production progress and task statuses so I can monitor project health

### Epic 4: Collaborative Features
1. **As a team member**, I want to see who is assigned to tasks and their roles so I know who to collaborate with
2. **As a reviewer**, I want to add comments and track approval status on tasks so feedback is centralized and actionable
3. **As a production manager**, I want to see activity logs for all tasks so I can track progress and identify bottlenecks

## Acceptance Criteria

### Phase 1: Core Production Infrastructure
- [ ] Production creation with database initialization
- [ ] Hierarchical Room creation and management
- [ ] Basic Task creation with type selection
- [ ] Participant management with role assignments
- [ ] Database schema implementation with proper relationships

### Phase 2: Task-Based Navigation
- [ ] Task board view with filtering and grouping options
- [ ] Task-centric navigation replacing pure filesystem browsing
- [ ] Task assignment and status update workflows
- [ ] Integration with existing .room folder system

### Phase 3: Specialized Task UIs
- [ ] Kanban board implementation with drag-and-drop
- [ ] Review and approval interface with commenting
- [ ] Editorial task UI with media timeline features
- [ ] Custom UI configuration per task type

### Phase 4: Production Management Dashboard
- [ ] Production overview dashboard with metrics
- [ ] Activity logging and reporting
- [ ] Participant activity tracking
- [ ] Progress monitoring and deadline management

## Technical Considerations

### Database Design
- Extend existing .room SQLite database to include production tables
- Maintain referential integrity across production hierarchy
- Optimize queries for task-based navigation and filtering
- Handle large numbers of tasks and participants efficiently

### File System Integration
- Maintain compatibility with File System Access API
- Support both .room folders and regular directories
- Handle permission changes when participants are added/removed
- Sync filesystem changes with task and room metadata

### UI Performance
- Lazy loading for large production hierarchies
- Efficient task filtering and search
- Responsive design for different screen sizes
- Smooth transitions between different task UI modes

### Scalability
- Support multiple concurrent productions
- Handle large teams with many participants
- Efficient task querying and status updates
- Modular UI components for different task types

## Success Metrics

1. **Workflow Efficiency**: Reduction in time to find and organize work items
2. **Task Completion Rate**: Increase in on-time task completion
3. **Collaboration Quality**: Improved feedback quality and turnaround time
4. **User Adoption**: Percentage of users switching from filesystem to task-based navigation
5. **Production Visibility**: Improved project status visibility for stakeholders

## Future Enhancements

1. **Real-time Collaboration**: WebSocket-based real-time updates and presence
2. **Advanced Notifications**: Email/push notifications for task assignments and deadlines
3. **Template System**: Production and task templates for common workflow patterns
4. **Integration APIs**: Connect with external tools like Slack, Asana, Frame.io
5. **Advanced Analytics**: Detailed workflow analytics and optimization suggestions
6. **Mobile Support**: Mobile app for task management and review approval
7. **Version Control**: Git-like versioning for task configurations and workflows

---

*This PRD creates a comprehensive production workflow management system that transforms the filesystem browser into a task-driven collaborative platform while maintaining the robust .room folder infrastructure for metadata and file organization.*