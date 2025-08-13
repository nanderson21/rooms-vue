# Functional Utilities Approach - Pure Functions with N8N Integration

*Original conversation segment from: [`../MovieLabs2030-cs4_0-chat.md`](../MovieLabs2030-cs4_0-chat.md)*

## You said:
How would this connect to n8n? Can you take a functional approach to utilities the same way you did to objects?

## ChatGPT said:
Absolutely. Let's treat MovieLabs Utilities not just as static data structures (objects), but as declarative functional interfaces—each utility becomes a function signature that describes:

- Inputs (metadata, files, context)
- Processing logic (validation, transformation, resolution)
- Outputs (approved assets, paths, events)

This approach unlocks a composable, stateless functional model within tools like n8n, where each utility becomes a reusable node or subworkflow, and .asset_template.json becomes the schema for both data and function call intent.

🧠 **Core Principle: Utilities as Declarative Functions**
Instead of just describing what is, we describe what should happen.

**Utility as Function**:
A utility is a pure function:
`utility(input) => output`
...whose logic is driven by a .asset_template.json spec.

These are not imperative "do this" steps. Instead, n8n reacts to these declarative patterns.

🔧 **Example: Functional Mapping of Key Utilities**

| Utility Name | Functional Role (n8n context) |
|--------------|-------------------------------|
| Identifier | generate_identifier(inputVars, template) => identifier |
| Composition | validate_composition(inputs) => success/error |
| Location | resolve_location(context) => { narrative, production, shooting } |
| Measurement | check_measurements(assetMetadata, template) => valid/invalid |
| FileDetails | generate_filename(metadata, namingPattern) => filename |
| Annotation/Tag | append_annotation(entity, annotationData) => entityWithAnnotation |

⚙️ **n8n Implementation Patterns**
Let's walk through how each MovieLabs utility maps to n8n as a function—stateless, parameterized, and reusable.

**1. 🔐 generate_identifier**
JSON Spec
```json
"identifier": {
  "pattern": "{project}_{sequence}_{shot}_{asset_type}_{version:03d}",
  "variables": {
    "project": "marvel",
    "sequence": "seq01",
    "shot": "045",
    "asset_type": "comp",
    "version": 3
  }
}
```

n8n Node Logic
```javascript
function generate_identifier(vars, pattern) {
  return pattern.replace(/\{([^}]+)\}/g, (_, key) => {
    const [base, format] = key.split(':');
    const val = vars[base];
    return format === "03d" ? String(val).padStart(3, "0") : val;
  });
}
```
🟢 Use in expression nodes
🔁 Reusable for both filename generation and metadata

**2. 🧱 validate_composition**
JSON Spec
```json
"composition": {
  "starting_point": "raw_camera_plate",
  "required_inclusions": ["lighting", "geometry", "materials"],
  "output_product": "final_comp"
}
```

n8n Functional Node
```javascript
function validate_composition(files, compositionTemplate) {
  const missing = compositionTemplate.required_inclusions.filter(
    req => !files.includes(req)
  );
  return { valid: missing.length === 0, missing };
}
```
🔄 Use in a pre-delivery check
🚨 Fail the task if required inputs are missing

**3. 📦 resolve_location**
JSON Spec
```json
"location": {
  "shooting_location": "STAGE_3",
  "narrative_location": "${context.scene_location}"
}
```

n8n Function
```javascript
function resolve_location(context, locationSpec) {
  return {
    shooting: locationSpec.shooting_location,
    narrative: context.scene_location
  };
}
```
🧠 Useful for logging, dashboards, and story mapping

**4. 📏 check_measurements**
JSON Spec
```json
"measurements": {
  "dimensions": {
    "width": 4096,
    "height": 2160
  },
  "frame_rate": "24fps"
}
```

n8n Node Function
```javascript
function check_measurements(asset, specs) {
  return (
    asset.width === specs.width &&
    asset.height === specs.height &&
    asset.frame_rate === specs.frame_rate
  );
}
```
🎯 Trigger alerts or branch logic
✍️ Write pass/fail status to .snapshot.json

**5. 📝 generate_filename**
JSON Spec
```json
"file_details": {
  "naming_pattern": "{identifier}.{frame:04d}.{extension}"
}
```

n8n Node Function
```javascript
function generate_filename(identifier, frame, extension, pattern) {
  return pattern
    .replace("{identifier}", identifier)
    .replace("{frame:04d}", String(frame).padStart(4, "0"))
    .replace("{extension}", extension);
}
```
📄 Used in rename nodes
🪄 Could be bundled into a reusable custom n8n node

🔄 **Putting It All Together: The execute_asset_template Workflow**
In n8n, you'd build a generalized "executor" that reads .asset_template.json and sequentially runs:

- generate_identifier → store ID
- generate_filename → validate presence or rename file
- validate_composition → check all inputs present
- check_measurements → ensure resolution/frame rate
- annotate_output_asset → append any approvals/notes
- trigger_next_task → if valid, fire webhook or update status

Each utility becomes a pure function, driven by its schema, producing outputs that inform the next step.

🎛️ Want more modularity? Each utility becomes a reusable n8n Subworkflow, linked by data and context.

🧠 **The Functional Future: Declarative Automation**
By treating utilities this way, you unlock:
- **Declarative Pipelines**: You don't code workflows—you declare the structure and let the system assemble logic from reusable functions.
- **Composable Automations**: Multiple asset templates can reuse the same utility logic, with only variables changing.
- **Universal Compatibility**: All tools that understand the .asset_template.json spec can run logic consistently.

✅ **Want Me to Build?**
I can now generate:
- ✅ A library of JavaScript utility functions matching this model (for n8n code nodes)
- ✅ n8n subworkflow templates for each core MovieLabs utility
- ✅ A "utility executor" n8n meta-workflow that runs validation per folder
- ✅ A UI that visualizes utility function outputs live per folder

Let me know which of these you want next—or if you want me to generate a full developer-facing spec that documents the Functional Utility Interface for MovieLabs-style File Systems.

## You said:
# Functional Utilities with N8N Integration

## Functional Approach to MovieLabs Utilities

Instead of treating utilities as static data structures, we can implement them as **pure functions** that take inputs and produce consistent, predictable outputs. This enables direct integration with n8n's function-based workflow system.

## Core Functional Utilities

### 1. Identifier Functions

```javascript
// Pure function approach to identifiers
const createIdentifier = (scope, pattern, variables) => ({
  value: resolvePattern(pattern, variables),
  scope: scope,
  resolved: `${scope}:${resolvePattern(pattern, variables)}`,
  validate: (input) => validatePattern(input, pattern),
  increment: () => createIdentifier(scope, pattern, {...variables, version: variables.version + 1})
});

// Usage in n8n workflow
const shotIdentifier = createIdentifier(
  "MARVEL_2024.SHOTS",
  "{project}_{sequence}_{shot}_{version:03d}",
  { project: "marvel", sequence: "010", shot: "001", version: 1 }
);
// Result: { value: "marvel_010_001_v001", scope: "MARVEL_2024.SHOTS", ... }
```

### 2. Location Functions

```javascript
const createLocation = (locationData) => ({
  resolve: () => locationData,
  narrative: () => locationData.narrative_location,
  production: () => locationData.production_location,
  shooting: () => locationData.shooting_location,
  coordinates: () => locationData.coordinates,
  isMatch: (query) => matchLocation(locationData, query)
});

// Composable location resolution
const resolveLocationContext = (asset, roomLocation, taskLocation) => {
  return taskLocation || roomLocation || asset.defaultLocation;
};
```

### 3. Composition Functions

```javascript
const createComposition = (definition) => ({
  validate: (assets) => validateInclusions(assets, definition.required_inclusions),
  resolve: (assets) => resolveComposition(assets, definition),
  manifest: (assets) => generateManifest(assets, definition),
  missing: (assets) => findMissingInclusions(assets, definition.required_inclusions),
  canProduce: (assets) => canProduceOutput(assets, definition)
});

// Functional composition pipeline
const composeAssets = (startingAsset, inclusions, rules) => {
  return pipe(
    validateInputs,
    applyCompositionRules,
    generateOutput,
    attachMetadata
  )(startingAsset, inclusions, rules);
};
```

### 4. Measurement Functions

```javascript
const createMeasurement = (value, units) => ({
  value,
  units,
  convert: (newUnits) => convertUnits(value, units, newUnits),
  format: () => `${value}${units}`,
  validate: (input) => validateMeasurement(input, units),
  compare: (other) => compareMeasurements({value, units}, other)
});

// Functional measurement operations
const dimensions = {
  width: createMeasurement(4096, "px"),
  height: createMeasurement(2160, "px"),
  aspectRatio: () => dimensions.width.value / dimensions.height.value,
  scale: (factor) => ({
    width: createMeasurement(dimensions.width.value * factor, "px"),
    height: createMeasurement(dimensions.height.value * factor, "px")
  })
};
```

## N8N Integration Architecture

### 1. Webhook-Based Communication

```javascript
// Browser → N8N Communication
class N8NUtilityConnector {
  constructor(n8nWebhookUrl) {
    this.webhookUrl = n8nWebhookUrl;
  }

  async executeUtilityFunction(functionName, parameters) {
    const payload = {
      utility: functionName,
      parameters: parameters,
      timestamp: new Date().toISOString(),
      context: this.getCurrentContext()
    };

    const response = await fetch(`${this.webhookUrl}/utility-execution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return response.json();
  }

  // File system events → N8N
  async onFileAdded(file, assetTemplate) {
    return this.executeUtilityFunction('validateInputAsset', {
      file: await this.fileToMetadata(file),
      template: assetTemplate,
      action: 'file_added'
    });
  }

  async onTaskComplete(taskId, outputs) {
    return this.executeUtilityFunction('processOutputAssets', {
      taskId,
      outputs,
      action: 'task_complete'
    });
  }
}
```

### 2. N8N Utility Function Nodes

#### Identifier Resolution Node

```json
{
  "name": "MovieLabs Identifier",
  "type": "function",
  "typeVersion": 1,
  "position": [200, 300],
  "parameters": {
    "functionCode": "
      const { scope, pattern, variables } = $input.item.json;
      
      const resolvePattern = (pattern, vars) => {
        return pattern.replace(/{([^}]+)}/g, (match, key) => {
          if (key.includes(':')) {
            const [varName, format] = key.split(':');
            return formatVariable(vars[varName], format);
          }
          return vars[key] || match;
        });
      };
      
      const identifier = {
        value: resolvePattern(pattern, variables),
        scope: scope,
        resolved: `${scope}:${resolvePattern(pattern, variables)}`,
        timestamp: new Date().toISOString()
      };
      
      return { json: { identifier } };
    "
  }
}
```

#### Asset Validation Node

```json
{
  "name": "Validate Asset",
  "type": "function",
  "parameters": {
    "functionCode": "
      const { file, template } = $input.item.json;
      const { input_assets } = template;
      
      const validateAsset = (file, assetDef) => {
        const results = {
          valid: true,
          errors: [],
          warnings: [],
          metadata: {}
        };
        
        // Validate file size
        if (assetDef.validation_rules?.file_size_min) {
          const minSize = parseSize(assetDef.validation_rules.file_size_min);
          if (file.size < minSize) {
            results.valid = false;
            results.errors.push(`File size ${file.size} below minimum ${minSize}`);
          }
        }
        
        // Validate required metadata
        if (assetDef.required_metadata) {
          const missingMetadata = checkRequiredMetadata(file, assetDef.required_metadata);
          if (missingMetadata.length > 0) {
            results.warnings.push(`Missing metadata: ${missingMetadata.join(', ')}`);
          }
        }
        
        return results;
      };
      
      const matchingAsset = input_assets.find(asset => 
        asset.context_tags.some(tag => file.name.includes(tag))
      );
      
      const validation = matchingAsset ? 
        validateAsset(file, matchingAsset) : 
        { valid: false, errors: ['No matching asset template found'] };
      
      return { json: { validation, matchingAsset } };
    "
  }
}
```

### 3. Functional Workflow Composition

#### File Processing Pipeline

```json
{
  "name": "Asset Processing Pipeline",
  "nodes": [
    {
      "name": "Webhook Trigger",
      "type": "webhook",
      "parameters": {
        "path": "asset-added",
        "httpMethod": "POST"
      }
    },
    {
      "name": "Extract File Metadata",
      "type": "function",
      "parameters": {
        "functionCode": "
          const extractMetadata = (file) => ({
            name: file.name,
            size: file.size,
            extension: file.name.split('.').pop(),
            lastModified: file.lastModified,
            path: file.webkitRelativePath || file.name
          });
          
          return { json: { 
            fileMetadata: extractMetadata($input.item.json.file),
            template: $input.item.json.template 
          }};
        "
      }
    },
    {
      "name": "Apply Identifier Function",
      "type": "function",
      "parameters": {
        "functionCode": "
          const { fileMetadata, template } = $input.item.json;
          const { identifier: idConfig } = template.movielab_utilities;
          
          // Extract context from filename or metadata
          const context = extractContextFromFile(fileMetadata, template);
          
          // Generate identifier using functional approach
          const identifier = createIdentifier(
            idConfig.scope,
            idConfig.pattern,
            { ...idConfig.variables, ...context }
          );
          
          return { json: { fileMetadata, template, identifier } };
        "
      }
    },
    {
      "name": "Validate Composition",
      "type": "function",
      "parameters": {
        "functionCode": "
          const { template, identifier } = $input.item.json;
          const { composition } = template.movielab_utilities;
          
          // Check if this asset fits the composition requirements
          const compositionCheck = validateCompositionFit(
            identifier,
            composition,
            template.input_assets
          );
          
          return { json: { ...($input.item.json), compositionCheck } };
        "
      }
    },
    {
      "name": "Generate File Structure",
      "type": "function",
      "parameters": {
        "functionCode": "
          const { identifier, template } = $input.item.json;
          const { file_details } = template.movielab_utilities;
          
          // Generate proper file path using template
          const targetPath = resolveTemplate(
            file_details.path_template,
            identifier
          );
          
          const targetName = resolveTemplate(
            file_details.naming_pattern,
            identifier
          );
          
          return { json: { 
            ...($input.item.json),
            targetPath,
            targetName,
            shouldMove: true
          }};
        "
      }
    },
    {
      "name": "Update Context Variables",
      "type": "function",
      "parameters": {
        "functionCode": "
          // Update the asset template with new context variables
          const updatedTemplate = updateTemplateVariables(
            $input.item.json.template,
            $input.item.json.identifier
          );
          
          // Trigger filesystem update
          return { 
            json: { 
              action: 'update_template',
              template: updatedTemplate,
              path: $input.item.json.targetPath
            }
          };
        "
      }
    }
  ]
}
```

## Functional Utility Library for N8N

### Core Functional Operations

```javascript
// Utility functions that can be imported into N8N nodes
const MovieLabsUtilities = {
  // Identifier functions
  identifier: {
    create: (scope, pattern, variables) => createIdentifier(scope, pattern, variables),
    resolve: (identifier) => resolveIdentifier(identifier),
    validate: (value, scope) => validateIdentifier(value, scope),
    increment: (identifier) => incrementIdentifier(identifier)
  },
  
  // Location functions
  location: {
    create: (locationData) => createLocation(locationData),
    resolve: (query, context) => resolveLocation(query, context),
    match: (location, criteria) => matchLocation(location, criteria)
  },
  
  // Composition functions
  composition: {
    validate: (assets, rules) => validateComposition(assets, rules),
    resolve: (components) => resolveComposition(components),
    missing: (current, required) => findMissingComponents(current, required),
    canProduce: (inputs, rules) => canProduceOutput(inputs, rules)
  },
  
  // Measurement functions
  measurement: {
    create: (value, units) => createMeasurement(value, units),
    convert: (measurement, newUnits) => convertMeasurement(measurement, newUnits),
    validate: (value, constraints) => validateMeasurement(value, constraints)
  },
  
  // File detail functions
  fileDetails: {
    parse: (filename) => parseFilename(filename),
    generate: (template, variables) => generateFilename(template, variables),
    validate: (file, rules) => validateFile(file, rules)
  }
};
```

### Browser ↔ N8N Communication Pattern

```javascript
// Browser-side utility executor
class UtilityExecutor {
  constructor(n8nConnector) {
    this.n8n = n8nConnector;
  }

  async processAssetTemplate(directory, template) {
    // Execute utility functions through n8n
    const processedTemplate = await this.n8n.executeUtilityFunction(
      'processTemplate',
      { template, context: this.getBrowserContext() }
    );
    
    // Update local state with processed template
    this.updateDirectoryTemplate(directory, processedTemplate);
    
    return processedTemplate;
  }

  async validateFile(file, assetTemplate) {
    const result = await this.n8n.executeUtilityFunction(
      'validateInputAsset',
      { 
        file: await this.fileToMetadata(file),
        template: assetTemplate
      }
    );
    
    this.displayValidationResults(result);
    return result;
  }

  async generateOutputStructure(taskResults, outputTemplate) {
    return await this.n8n.executeUtilityFunction(
      'generateOutputAssets',
      {
        results: taskResults,
        template: outputTemplate,
        context: this.getCurrentContext()
      }
    );
  }
}
```

## Benefits of Functional Approach

### 1. **Pure Functions = Predictable Results**

Each utility function produces the same output for the same input, making debugging and testing straightforward.

### 2. **Composable Workflows**

N8N nodes can chain utility functions together to create complex processing pipelines.

### 3. **Reusable Logic**

The same utility functions work across different contexts (rooms, tasks, assets).

### 4. **Stateless Processing**

Functions don't depend on external state, making them reliable in distributed n8n environments.

### 5. **Easy Testing**

Pure functions can be tested independently, ensuring reliability.

This functional approach transforms MovieLabs utilities from static definitions into **active, executable functions** that can be orchestrated through n8n workflows while maintaining consistency and predictability.

## ChatGPT said:
This is phenomenally well-structured. You're not just building a system—you're architecting a runtime ontology. By treating MovieLabs utilities as composable pure functions, you've reframed them as a logic layer that drives workflow execution, asset state validation, and output generation across a distributed production environment.

Below, I'll respond with:

🧩 **How This Functional Architecture Connects with n8n**
Your structure already defines a rich function registry—let's clarify how n8n becomes the execution engine for these functions and how they are declared, invoked, orchestrated, and observed.

🔁 **n8n as the Runtime for Declarative Utility Execution**
**1. Declarative Template → Executable Plan**
Your .asset_template.json functions like a declarative program.

```json
{
  "n8n_workflows": {
    "on_file_add": "validateInputAsset",
    "on_export": "processOutputAssets"
  },
  "movielab_utilities": {
    "identifier": { ... },
    "composition": { ... },
    "file_details": { ... }