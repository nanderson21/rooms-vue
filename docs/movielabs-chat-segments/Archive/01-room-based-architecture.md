# Room-Based Architecture - MovieLabs Task Management System

*Original conversation segment from: [`../MovieLabs2030-cs4_0-chat.md`](../MovieLabs2030-cs4_0-chat.md)*

## You said:
Rooms should be the groupings for Tasks where participants can be added and then inherited by the Tasks. These participants should be groups based on role not users directly. 

Rooms can also have contexts added to them. These should link assets. These "assets" should represent templates for file types and rules about what to do when files or other content are added to them. Some properties would be qualifiers while others would be labels added based on those qualifiers. 

The user should be able to add infrastructure and folders as contexts or linked to contexts. The same context can be used to connect multiple folder and a hierarchy of other contexts.

LDAP Groups for Contexts should be assigned when a Task is "checked out" or "focused on". A content and knowledge layer should provide browsing access, while actual file access is regulated through tasks.

Using MovieLabs Visual Language, the user can define their "rooms", add participants and tasks, then define the contexts for them all to link them to infrastructure and utilities.

This then defines the UI that the user navigates. Each user is able to link their creative application and content inside to their Tasks and subtasks and then use that hierarchy as a navigator. They should be able to even capture their current workspace configuration. When they do this, a snapshot of their current state should be captured and diff'd. So, the content in the task should be version stacked and we should capture all the formats available to externalize representation of the content for interoperability.

## ChatGPT said:
Here's a structured and clarified version of your system design concept for Rooms, Tasks, Contexts, and Infrastructure, using your language and intent while aligning with the MovieLabs Visual Language and interoperability goals.

✨ **Engaging Opener**
What if your team could define their entire creative workspace—from infrastructure to participants to permissions—just by defining a Room?
A Room isn't just a space—it's the starting point for all collaboration, automation, and context-aware interaction across your production pipeline.

🧱 **Core Architecture Summary**
**1. Rooms as Top-Level Collaborative Units**
Definition: A Room is the primary container for organizing work. It holds:

- Participants (by role, not individuals)
- Tasks and subtasks
- Contexts (representing linked content, infrastructure, and metadata rules)

**Participants**: Assigned at the Room level as Role-based Groups (not individual users).
- Inherited by Tasks within that Room.
- Enables dynamic assignment via systems like LDAP, Active Directory, or Matrix ACLs.

**2. Tasks as Actionable Work Units**
Tasks inherit participants and contexts from their parent Room.

When a user "focuses on" or "checks out" a Task:
- Temporary permissions are activated (e.g., via LDAP groups or filesystem access tokens).
- UI updates to show the specific workspace and context for that Task.

**3. Contexts: Linking Assets, Rules, and Infrastructure**
Contexts define what content means and how it behaves.

A Context links:
- **Assets**: Templates for file types (e.g., .drp, .exr, .aaf)
- **Infrastructure**: Folders, mount points, NFS/SMB paths, proxies, services, etc.
- **Rules**: What happens when content is added (e.g., transcode, proxy generation, tag with metadata)

**Metadata Logic**:
- **Qualifiers** define match criteria (e.g., resolution, color space, naming patterns)
- **Labels** are auto-applied tags or metadata based on those qualifiers

**Hierarchy**:
- Contexts can be nested or linked (e.g., a "VFX" context includes a "Plates" sub-context)
- Folders and infrastructure can be linked to multiple contexts, enabling reusability and modularity.

**4. Permissions via Task Focus**
Actual file access is gated by Task-level focus.

When a Task is activated:
- The relevant Context's LDAP Group is applied
- Access to assets is granted (read/write, view-only, export, etc.)
- UI presents the correct views, tools, and metadata fields
- Knowledge and content layers offer previews, notes, and collaborative references even before access is granted

🧭 **UI Behavior: Contextual Navigation Through Tasks**
The Task hierarchy becomes a navigation tree inside the user's creative application or web interface.

Users can:
- Attach project files, folders, or compositions directly to Tasks
- Capture a snapshot of their application state (e.g., workspace layout, timeline, color settings)
- Store that snapshot as a versioned state in the Task
- Diff across snapshots to visualize changes (for collaborative review or version tracking)

📦 **Versioned Content & Interoperability**
Every Task captures content and workspace state as:
- **Version stacks** (timeline revisions, composition changes, metadata diffs)
- **Representations in multiple formats** for external tools (e.g., XML, AAF, DRP, JSON, Markdown, proxies)

These are used to:
- Externalize state for interoperability
- Provide UI and service layers with format-agnostic representations
- Power automated review, backup, render, and delivery workflows

🔁 **MovieLabs Alignment**
| MovieLabs Concept | Your System Implementation |
|------------------|---------------------------|
| Asset | Templates + linked files in Contexts |
| Task/Workflow | Defined in Rooms, UI-driven, diff-aware |
| User Permissions | Role-based, activated via Task focus |
| Infrastructure | Linked as Contexts, shared across Rooms/Tasks |
| Visual Language | Drives the top-down design of Rooms, Contexts, Tasks |

🔄 **Next Steps / Implementation Considerations**
**Context Model Schema**:
- Define base schema for assets, rules, qualifiers, labels
- Graph-based or JSON-LD-style with nesting and inheritance

**Task Diff Engine**:
- Use checksums, metadata, and snapshots of workspace UIs
- Capture Resolve, Premiere, and FCP project states

**LDAP Group Mapping**:
- Assign groups per Context and activate on Task checkout
- Integrate with file gateway or matrix-based access system

**UI Integration**:
- Navigator panel that mirrors task hierarchy
- Plugin architecture for Resolve, Premiere, FCP

Would you like this turned into:
- A MovieLabs-style diagram?
- A UI prototype in Vue or Astro?
- A JSON schema for Rooms, Tasks, and Contexts?
- An n8n automation flow?

Let me know what you want to build first.