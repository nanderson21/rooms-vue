# PRD: XMP Asset Relationship Knowledge Graph Extractor

## Executive Summary

This PRD outlines the development of a system to extract structured metadata from XMP-embedded asset relationships (specifically Premiere Pro's Ingredients/Pantry model) and visualize these relationships through an interactive knowledge graph interface. The system extends the existing cs-xmp exiftool wrapper to support complex asset composition analysis.

## Problem Statement

Premiere Pro uses the XMP Ingredients/Pantry model to embed comprehensive asset composition metadata within rendered files. The `xmpMM:Ingredients` property lists component assets used in composition, while `xmpMM:Pantry` contains the full XMP metadata for each referenced asset. Currently, this sophisticated relationship model is buried within XMP metadata and not accessible for:

- Content management and asset tracking
- Understanding composition hierarchies and dependencies
- Asset usage analytics and governance
- Workflow optimization and change tracking
- Sub-asset extraction and manual association workflows

The existing cs-xmp Node.js wrapper provides basic XMP read/write capabilities but lacks specialized tools for parsing and visualizing these complex asset relationships.

## Objectives

### Primary Goals
- Extend cs-xmp to parse Ingredients/Pantry XMP structures from composed assets
- Build knowledge graph representation of asset composition hierarchies
- Visualize complex asset relationships through an interactive UI
- Enable content managers to understand asset provenance, usage patterns, and dependencies
- Support asset governance workflows and change tracking

### Success Metrics
- Successfully parse 95%+ of `xmpMM:Ingredients` and `xmpMM:Pantry` metadata from composed assets
- Sub-second response time for composition queries on datasets up to 10,000 assets
- Accurate resolution of asset references via DocumentID/InstanceID matching
- Intuitive UI allowing non-technical users to explore asset composition trees

## Technical Architecture

### 1. XMP Metadata Extraction Engine (cs-xmp Extension)

**Core Components:**
- **Ingredients Parser**: Extract and parse `xmpMM:Ingredients` arrays
- **Pantry Decoder**: Parse `xmpMM:Pantry` XMP packet collections  
- **Reference Resolver**: Match ingredient references to pantry entries via DocumentID/InstanceID
- **Composition Mapper**: Build hierarchical relationships between composed and component assets
- **Part Analyzer**: Parse `stRef:fromPart` and `stRef:toPart` temporal relationships

**Key XMP Properties to Extract:**
- `xmpMM:Ingredients` - Array of component asset references
- `xmpMM:Pantry` - Collection of component asset XMP packets
- `stRef:instanceID` - References to component InstanceIDs
- `stRef:documentID` - References to component DocumentIDs  
- `stRef:fromPart` - Source temporal ranges (e.g., "time:0d1200")
- `stRef:toPart` - Destination temporal ranges (e.g., "time:600d800")
- `stRef:FilePath` - Optional file path information
- `xmpMM:DocumentID` / `xmpMM:InstanceID` - Asset identification
- `xmpMM:OriginalDocumentID` - Original asset references

### 2. Knowledge Graph Data Model (Ingredients/Pantry-Based)

**Node Types:**
- **ComposedAsset**: Any asset with `xmpMM:Ingredients` (rendered videos, complex compositions)
- **ComponentAsset**: Assets referenced in Ingredients (source media, sub-compositions)
- **SourceMedia**: Original media files (video, audio, images, documents)
- **PantryEntry**: Extracted XMP metadata from component assets
- **Ingredient**: Individual ingredient reference with part mappings
- **TemporalPart**: Time-based segments within assets

**Relationship Types:**
- `HAS_INGREDIENT`: ComposedAsset → Ingredient (from `xmpMM:Ingredients`)
- `REFERENCES`: Ingredient → ComponentAsset (via DocumentID/InstanceID)
- `STORED_IN_PANTRY`: ComponentAsset → PantryEntry (from `xmpMM:Pantry`)
- `MAPS_FROM_PART`: Ingredient → TemporalPart (from `stRef:fromPart`)
- `MAPS_TO_PART`: Ingredient → TemporalPart (from `stRef:toPart`)
- `DERIVES_FROM`: ComposedAsset → ComponentAsset (high-level derivation)
- `NESTED_COMPOSITION`: ComponentAsset → ComposedAsset (when component is itself composed)

**Node Properties:**
- Unique identifiers (XMP InstanceID, file paths)
- Temporal metadata (timecode, duration, frame rate)
- Technical metadata (resolution, codec, bit rate)
- Provenance data (creation date, modification history)
- Project metadata (sequence settings, track configuration)

### 3. cs-xmp Extension Architecture

**New Module: cs-xmp-composition.js**
```javascript
// Extends existing cs-xmp with composition-specific functionality
import { read } from './cs-xmp.js'

export async function parseIngredients(filename) {
  // Extract xmpMM:Ingredients array from asset
}

export async function parsePantry(filename) {
  // Extract and decode xmpMM:Pantry XMP packets
}

export async function resolveComposition(filename) {
  // Build full composition tree by matching ingredients to pantry
}
```

**Integration with Existing cs-xmp:**
- Extends current `read()` function with specialized ingredient/pantry parsing
- Maintains existing exiftool configuration and csXMP.config compatibility
- Leverages current error handling and promise-based architecture
- Adds new functions without breaking existing cs-xmp API

### 4. Processing Pipeline

**Stage 1: Discovery and Classification**
- Scan file system for media files with XMP metadata
- Identify composed assets by presence of `xmpMM:Ingredients` property
- Classify assets as ComposedAsset, ComponentAsset, or SourceMedia
- Queue composed assets for priority processing

**Stage 2: Composition Analysis**
- Use cs-xmp to extract `xmpMM:Ingredients` and `xmpMM:Pantry` properties
- Parse ingredient references (DocumentID, InstanceID, Part mappings)
- Decode pantry XMP packets to extract component asset metadata
- Handle nested compositions recursively

**Stage 3: Reference Resolution**
- Match ingredient references to component assets via ID lookup
- Resolve file path references when available
- Handle missing or orphaned references gracefully
- Build component asset registry

**Stage 4: Graph Construction**
- Create nodes for composed assets, ingredients, and component assets
- Establish HAS_INGREDIENT and REFERENCES relationships
- Map temporal part relationships from stRef properties
- Build bidirectional composition hierarchy index

**Stage 4: Enhancement**
- Enrich nodes with additional file system metadata
- Resolve relative paths to absolute references  
- Calculate derived metrics (usage frequency, dependency depth)
- Validate graph consistency

## User Interface Specifications

### Knowledge Graph Visualization

**Primary View: Interactive Network Graph**
- Force-directed layout showing nodes and relationships
- Color-coded node types (projects=blue, media=green, renders=orange)
- Edge styling indicates relationship type (solid=contains, dashed=references)
- Zoom/pan controls for navigation
- Node clustering for large datasets

**Node Detail Panels**
- Click any node to show metadata sidebar
- Display all XMP properties in organized sections
- Show direct relationships (parent/child, references)
- Timeline preview for timeline nodes
- File system path and technical metadata

**Filtering and Search**
- Text search across node properties
- Filter by node type, date range, project
- Relationship path queries ("Show all source media for Project X")
- Saved filter presets

**Alternative Views:**
- **Timeline View**: Linear representation of project→sequence→track→clip hierarchy
- **Dependency Tree**: Hierarchical view focusing on asset dependencies
- **File Browser**: Traditional folder view with relationship annotations

### Additional UI Components

**Asset Import Wizard**
- Drag-and-drop interface for adding new media files
- Batch processing status with progress indicators
- Error handling for corrupted/incomplete XMP data

**Relationship Explorer**
- Dedicated tool for tracing asset provenance
- "How was this created?" - trace back to source materials
- "What uses this?" - find all derivatives and references
- Visual path highlighting in graph view

**Export and Integration**
- Export subgraphs as JSON, GraphML, or CSV
- Integration APIs for other content management systems
- Webhook notifications for new asset relationships

## Implementation Examples

### cs-xmp API Extensions

**Reading Composition Metadata:**
```javascript
// Existing cs-xmp usage (unchanged)
const result = await read('composed-video.mp4', ':all');
console.log(result.data[0].DocumentID);  // Standard XMP access

// New composition-specific functions  
const ingredients = await parseIngredients('composed-video.mp4');
console.log(ingredients);
/*
[
  {
    instanceID: "xmp.iid:abc123...",
    documentID: "A1EACEBA64856B3F...", 
    fromPart: "time:0d1200",
    toPart: "time:600d800",
    filePath: "/path/to/source.mp4"
  },
  // ... more ingredients
]
*/

const pantry = await parsePantry('composed-video.mp4');
console.log(pantry);
/*
[
  {
    documentID: "A1EACEBA64856B3F...",
    xmpPacket: {
      DocumentID: "A1EACEBA64856B3F...",
      InstanceID: "xmp.iid:abc123...",
      CreatorTool: "Adobe Premiere Pro 2023",
      // ... full XMP metadata for component
    }
  },
  // ... more pantry entries  
]
*/

// Full composition resolution
const composition = await resolveComposition('composed-video.mp4');
console.log(composition);
/*
{
  asset: { documentID: "...", filePath: "composed-video.mp4" },
  ingredients: [
    {
      reference: { instanceID: "...", fromPart: "..." },
      component: { documentID: "...", metadata: {...} },
      temporalMapping: { source: "0-1200", target: "600-800" }
    }
  ]
}
*/
```

**Handling Nested Compositions:**
```javascript
// Recursively resolve nested composed assets
const fullHierarchy = await resolveCompositionTree('final-render.mp4');
/*
Returns hierarchical structure showing:
- final-render.mp4 uses sequence-01.mp4 + audio-track.wav
- sequence-01.mp4 uses clip-a.mp4 + clip-b.mp4 + title.jpg
- Each level shows temporal part mappings
*/
```

## Data Schema

### Graph Database Schema (Neo4j/Property Graph)

```cypher
// Node Labels and Properties (Ingredients/Pantry Model)
(:ComposedAsset {documentID, instanceID, filePath, createdDate, hasIngredients: true})
(:ComponentAsset {documentID, instanceID, filePath, mimeType, duration, fileSize})
(:SourceMedia {documentID, instanceID, filePath, mimeType, duration, originalPath})
(:Ingredient {ingredientIndex, fromPart, toPart, filePath})
(:PantryEntry {documentID, xmpPacketJSON, extractedDate})
(:TemporalPart {startFrame, endFrame, duration, timecode})

// Relationship Types (Ingredients/Pantry Model)
()-[:HAS_INGREDIENT {index, order}]->(:Ingredient)
()-[:REFERENCES {documentID, instanceID}]->(:ComponentAsset)
()-[:STORED_IN_PANTRY {pantryIndex}]->(:PantryEntry)
()-[:MAPS_FROM_PART {startFrame, endFrame}]->(:TemporalPart)
()-[:MAPS_TO_PART {startFrame, endFrame}]->(:TemporalPart)
()-[:NESTED_COMPOSITION {}]->(:ComposedAsset)
```

### REST API Endpoints

```
GET /api/v1/compositions/{assetId}
GET /api/v1/compositions/{assetId}/ingredients
GET /api/v1/compositions/{assetId}/pantry
GET /api/v1/compositions/{assetId}/hierarchy
POST /api/v1/compositions/analyze
GET /api/v1/assets/{documentId}/compositions
GET /api/v1/assets/{documentId}/usages
POST /api/v1/graph/query
GET /api/v1/search/compositions?ingredient={documentId}
```

## Implementation Phases

### Phase 1: Core Extraction (8 weeks)
- XMP parsing library integration
- Basic timeline metadata extraction
- File system scanning and indexing
- Core data model implementation

**Deliverables:**
- Command-line XMP extraction tool
- Basic graph database schema
- Unit tests for XMP parsing

### Phase 2: Graph Construction (6 weeks)
- Relationship mapping algorithms
- Graph database integration
- Data validation and consistency checks
- API development

**Deliverables:**
- REST API for graph queries
- Graph construction pipeline
- Relationship resolution engine

### Phase 3: Visualization UI (8 weeks)
- Interactive graph visualization component
- Node/edge styling and layouts
- Search and filtering interface
- Detail panels and metadata views

**Deliverables:**
- Web-based knowledge graph viewer
- Responsive UI supporting desktop/tablet
- User documentation and tutorials

### Phase 4: Advanced Features (4 weeks)
- Alternative view modes (timeline, tree)
- Export functionality
- Integration APIs
- Performance optimizations

**Deliverables:**
- Multi-view interface
- Export/import capabilities
- Integration documentation

## Technical Requirements

### Performance
- Handle datasets up to 50,000 media assets
- Sub-second response for graph queries
- Efficient memory usage during XMP parsing
- Incremental updates for new assets

### Compatibility
- Support Adobe Premiere Pro 2020+ XMP formats
- Cross-platform deployment (Windows, macOS, Linux)
- Modern web browsers for UI (Chrome 90+, Firefox 88+, Safari 14+)
- Integration with common DAM systems

### Security
- Read-only access to source media files
- Secure API authentication
- Data encryption for sensitive project information
- Audit logging for asset access

## Risk Assessment

### Technical Risks
- **XMP Format Changes**: Adobe may modify XMP schemas in future versions
  - *Mitigation*: Version detection and backward compatibility
- **Performance at Scale**: Graph queries may slow with large datasets  
  - *Mitigation*: Database indexing and query optimization
- **Incomplete Metadata**: Some files may have partial/corrupted XMP data
  - *Mitigation*: Graceful error handling and partial data support

### User Experience Risks
- **Complexity**: Knowledge graphs can overwhelm non-technical users
  - *Mitigation*: Progressive disclosure and guided tutorials
- **Information Overload**: Large projects create cluttered visualizations
  - *Mitigation*: Smart filtering and hierarchical navigation

## Success Criteria

### MVP Requirements
- Successfully extract timeline metadata from 90% of test Premiere Pro files
- Generate accurate knowledge graph with < 5% false relationships
- Functional web UI supporting basic graph navigation and search
- Sub-5-second loading time for projects with < 1000 assets

### Full Product Success
- Integration with major DAM platforms (Adobe Experience Manager, Avid)
- Support for additional NLE formats beyond Premiere Pro
- Advanced analytics (usage patterns, dependency analysis)
- Enterprise deployment capabilities

## Future Enhancements

- **Multi-NLE Support**: Extend to Final Cut Pro, Avid Media Composer XMP formats
- **Real-time Updates**: Watch file system for new assets and auto-update graph
- **AI-Powered Insights**: Suggest optimal project organization based on usage patterns
- **Collaborative Features**: Multi-user access with role-based permissions
- **Mobile Interface**: Tablet/phone optimized views for field usage
- **Workflow Integration**: Hooks for render farm and asset management systems

This PRD provides a comprehensive blueprint for extracting XMP timeline metadata and creating an intuitive knowledge graph interface for content creators and asset managers.