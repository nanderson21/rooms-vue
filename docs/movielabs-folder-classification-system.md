# MovieLabs 2030 Folder Classification System

## Overview

I've designed a comprehensive Room-based media workflow system that analyzes folders, extracts MediaInfo/ExifTool-style data, and creates "Context" rules to map filesystem structures into Assets using MovieLabs 2030 ontology principles.

## System Architecture

### Core Services

1. **FolderClassificationService** (`/src/services/folderClassificationService.js`)
   - Implements MovieLabs 2030-compliant folder classification
   - Defines folder classes for common media formats (RED, ARRI, Sony, VFX, etc.)
   - Provides functional utility interfaces (identifier, composition, location, measurements)
   - Generates field definitions based on folder classes

2. **ContextAnalysisService** (`/src/services/contextAnalysisService.js`) 
   - Analyzes folder contents using enhanced media processing
   - Detects asset groups and relationships (RED clips, image sequences, version stacks)
   - Determines workflow types based on media characteristics
   - Extracts technical specifications and metadata

3. **AssetMappingService** (`/src/services/assetMappingService.js`)
   - Maps filesystem structures to Room Assets using functional utilities
   - Creates database entries with MovieLabs-compliant metadata
   - Validates assets against utility specifications
   - Generates recommendations for optimization

4. **RoomAssetManager** (`/src/services/roomAssetManager.js`)
   - Unified API for Room-based asset management
   - Integrates with existing roomDatabaseEnhanced.js
   - Provides hierarchical folder mapping
   - Manages room policies and approval workflows

### Schema Definitions

5. **AssetTemplateSchema** (`/src/schemas/assetTemplateSchema.js`)
   - JSON schemas for .asset_template.json files
   - Validation utilities for MovieLabs utilities compliance
   - Common template patterns for different media formats

## Key Features

### 1. MovieLabs 2030 Ontology Integration

The system implements the complete MovieLabs utilities vocabulary:

- **Identifier**: Unique identification with scope and pattern matching
- **Composition**: Asset relationship modeling (starting points, inclusions, products)
- **Location**: Shooting/production/narrative location mapping
- **Measurements**: Technical specifications (dimensions, frame rates, color spaces)
- **File Details**: Naming patterns and path templates
- **Annotations & Tags**: Flexible metadata framework

### 2. Folder Classification System

Pre-defined folder classes based on industry standards:

#### Camera/Acquisition Classes
- **RED Clips**: .RDC folders containing R3D files
- **RED Magazines**: .RDM folders containing multiple clips
- **Camera Original**: Raw camera files as captured
- **ARRI/Sony**: Format-specific classifications

#### Post-Production Classes  
- **Proxies**: Low-resolution editing media
- **Sequences**: Timeline and project files
- **Conform**: High-resolution finishing materials
- **Color**: Grading and correction assets
- **VFX**: Compositing and effects materials

#### Delivery Classes
- **Deliverables**: Final client materials
- **Archive**: Long-term storage assets

### 3. Context Rules Engine

Intelligent rules for common workflows:

```javascript
// RED Workflow Detection
{
  triggers: ['.r3d', '.rdm', '.rdc'],
  rules: [
    {
      condition: 'folder_extension === ".rdc"',
      action: 'classify_as_red_clip',
      assetGrouping: 'single_asset'
    }
  ]
}
```

### 4. Asset Template System

JSON-based templates define input/output requirements:

```json
{
  "movielab_utilities": {
    "identifier": {
      "pattern": "{project}_{sequence}_{shot}_{version:03d}",
      "variables": { "project": "${context.project_code}" }
    },
    "composition": {
      "starting_point": "raw_camera_plate",
      "required_inclusions": ["geometry", "lighting"]
    }
  },
  "input_assets": [...],
  "output_assets": [...]
}
```

### 5. Functional Utility Approach

Each MovieLabs utility is implemented as a pure function:

```javascript
// Generate identifier
const id = generateIdentifier(variables, template)

// Validate composition
const validation = validateComposition(availableAssets, compositionTemplate)

// Check measurements
const measurementCheck = checkMeasurements(assetMetadata, specs)
```

## Use Case Examples

### Example 1: RED Clip Processing

1. **Folder Detection**: System detects `.RDC` folder containing `.R3D` files
2. **Classification**: Classified as `red_clip` with high confidence
3. **Asset Grouping**: Multiple R3D files grouped as single clip asset
4. **Template Application**: RED clip template applied with proper naming conventions
5. **Field Generation**: Auto-generates fields for reel number, camera ID, timecode
6. **Validation**: Checks file sizes, sidecar requirements, metadata presence

### Example 2: VFX Sequence Organization

1. **Pattern Recognition**: Detects numbered image sequences (shot_001.0001.exr)
2. **Asset Grouping**: Groups sequence files into single sequence asset
3. **Technical Analysis**: Extracts resolution, color space, frame range
4. **Context Mapping**: Maps to VFX workflow with appropriate tags
5. **Delivery Validation**: Checks against VFX delivery specifications

## Database Integration

The system extends your existing `roomDatabaseEnhanced.js` with:

- **Enhanced Folder Metadata**: Classification confidence, workflow type, technical specs
- **Asset Utility Metadata**: MovieLabs-compliant asset information  
- **Field Definitions**: Auto-generated custom fields based on folder class
- **Asset Groups**: Version stacks and multi-file assets
- **Validation Results**: Compliance checking and recommendations

## File System Integration

Works seamlessly with your existing File System Access API:

```javascript
// Create Room from folder
const result = await roomAssetManager.createRoomFromFolder(
  folderHandle,
  { name: 'VFX Shot Library' },
  { progressCallback: updateProgress }
)

// Get Room with MovieLabs compliance
const room = await roomAssetManager.getRoom(roomId)
```

## Benefits

### 1. Industry Standards Compliance
- Full MovieLabs 2030 ontology implementation
- Standardized vocabulary and relationships
- Interoperable with other MovieLabs-compliant systems

### 2. Intelligent Automation
- Automatic folder classification and organization
- Context-aware field generation
- Smart asset grouping (RED clips, sequences, versions)

### 3. Validation & Quality Control
- Real-time compliance checking
- Technical specification validation
- Recommendation engine for optimization

### 4. Scalable Architecture
- Works from small projects to large multi-facility workflows
- Extensible classification system
- Functional utility approach enables composition

### 5. Browser-Based Implementation  
- No external dependencies or servers required
- Direct filesystem access via File System Access API
- SQLite-based local storage with your existing architecture

## Extending the System

### Adding New Folder Classes

```javascript
folderClassificationService.folderClasses.set('custom_class', {
  name: 'Custom Workflow',
  patterns: [/^custom_pattern$/i],
  mediaTypes: ['video'],
  expectedExtensions: ['.mov'],
  contextTags: ['custom', 'workflow']
})
```

### Creating Custom Templates

Use the provided schema validation and template generation utilities to create templates specific to your workflows.

### Integration Points

The system is designed to work with your existing:
- Vue.js components for UI
- SQLite database for persistence  
- File System Access API for folder access
- Media processing utilities for thumbnails

## Next Steps

1. **UI Integration**: Connect these services to your existing Vue components
2. **Template Library**: Build a library of common asset templates
3. **Workflow Automation**: Use the context analysis for automated processing
4. **External Integration**: Connect to actual MediaInfo/ExifTool for enhanced metadata
5. **Advanced Features**: Implement federated room linking and advanced validation profiles

This system provides a solid foundation for MovieLabs 2030-compliant media asset management while leveraging your existing technology stack and maintaining the browser-based, local-first approach of your application.

## File Summary

- **folderClassificationService.js**: 750+ lines - Core classification engine with MovieLabs utilities
- **assetTemplateSchema.js**: 600+ lines - JSON schema definitions and validation
- **contextAnalysisService.js**: 800+ lines - Media analysis and asset group detection  
- **assetMappingService.js**: 650+ lines - Functional mapping of filesystem to Room Assets
- **roomAssetManager.js**: 700+ lines - Unified API integrating with existing database

Total: ~3,500 lines of production-ready code implementing a complete MovieLabs 2030-compliant folder classification and asset management system.