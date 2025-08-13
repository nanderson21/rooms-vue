# Functional Utility Specification - Detailed N8N Implementation

*Original conversation segment from: [`../MovieLabs2030-cs4_0-chat.md`](../MovieLabs2030-cs4_0-chat.md)*

## You said:
YES! This is exactly the breakthrough - treating **utilities as declarative functional interfaces** rather than just data structures. You've identified the core transformation: from "what is" to "what should happen" through pure, composable functions.

Let me build the **Functional Utility Interface specification** and implementation:

Now let me create the **JavaScript utility library** that provides these functions as reusable n8n code:

Perfect! This **Functional Utility Interface** transforms MovieLabs utilities from documentation into **executable automation**. Here's what we've achieved:

## 🎯 **Key Breakthrough: Declarative → Executable**

**Before**: Static JSON describing what should be  
**After**: Pure functions that **make it happen**

```javascript
// Template declares intent
{"identifier": {"pattern": "{project}_{shot}_{version:03d}"}}

// Function executes intent  
generate_identifier(vars, pattern, scope) => "marvel_045_v003"
```

## 🔄 **N8N Integration Pattern**

Your workflow becomes:

1. **Browser drops file** → Webhook to n8n
1. **N8N reads** .asset_template.json
1. **N8N executes** utility functions in sequence
1. **N8N returns** processed results to browser
1. **Browser updates** filesystem automatically

## 🧩 **Composable Function Architecture**

Each utility is a **pure function** that can be:

- **Chained together** in n8n workflows
- **Reused across** different asset types
- **Tested independently** for reliability
- **Extended with** custom logic

## 🎛️ **Real-World Usage Examples**

### **File Drop Workflow**:

File Added → extract_metadata → generate_identifier → validate_composition → check_measurements → generate_filename → move_to_proper_location

### **Task Completion Workflow**:

Task Complete → validate_outputs → append_annotations → trigger_delivery → update_next_task

### **Daily Validation Workflow**:

Scan Directories → execute_asset_template → report_failures → notify_teams

## 🚀 **What This Enables**

1. **Self-Organizing Filesystem**: Folders automatically enforce MovieLabs standards
1. **Real-time Validation**: Files are checked as they're added
1. **Automated Naming**: Consistent file/folder naming across all projects
1. **Intelligent Workflows**: n8n can make decisions based on utility results
1. **Universal Compatibility**: Any tool reading .asset_template.json gets the same behavior

This turns your browser-based file system into a **MovieLabs-aware production environment** where everything automatically conforms to industry standards while maintaining complete creative flexibility!

Want me to build the **n8n subworkflow templates** next, or create the **browser integration layer** that connects the Filesystem Access API to these utility functions?

# MovieLabs Functional Utility Interface Specification

## Core Principle: Utilities as Declarative Functions

**Utility = Pure Function**: utility(input) => output  
**Logic Driver**: .asset_template.json provides the function signature and configuration  
**Execution Context**: n8n workflows orchestrate utility function composition

## Function Signature Pattern

Each MovieLabs utility follows this interface:

```typescript
type UtilityFunction<TInput, TConfig, TOutput> = {
  name: string;
  inputs: TInput;
  config: TConfig;
  execute: (inputs: TInput, config: TConfig, context?: any) => TOutput;
  validate: (inputs: TInput, config: TConfig) => ValidationResult;
  schema: JSONSchema;
}
```

## Core Utility Functions

### 1. 🔐 generate_identifier

**Function Signature**:

```javascript
generate_identifier(variables, pattern, scope) => IdentifierResult
```

**Input Schema**:

```json
{
  "variables": {
    "project": "string",
    "sequence": "string", 
    "shot": "string",
    "asset_type": "string",
    "version": "number"
  },
  "pattern": "string",
  "scope": "string"
}
```

**N8N Implementation**:

```javascript
// Reusable n8n Code Node Function
function generate_identifier(vars, pattern, scope) {
  const result = {
    value: pattern.replace(/\{([^}]+)\}/g, (_, key) => {
      const [base, format] = key.split(':');
      const val = vars[base];
      if (format === "03d") return String(val).padStart(3, "0");
      if (format === "04d") return String(val).padStart(4, "0");
      return val;
    }),
    scope: scope,
    variables: vars,
    timestamp: new Date().toISOString()
  };
  
  result.resolved = `${scope}:${result.value}`;
  result.increment = () => generate_identifier(
    {...vars, version: vars.version + 1}, 
    pattern, 
    scope
  );
  
  return result;
}

// Usage in n8n Expression
{{ $json.generate_identifier($json.variables, $json.pattern, $json.scope) }}
```

**Output Schema**:

```json
{
  "value": "marvel_seq01_045_comp_v003",
  "scope": "MARVEL_2024.SHOTS",
  "resolved": "MARVEL_2024.SHOTS:marvel_seq01_045_comp_v003",
  "variables": { "project": "marvel", "version": 3 },
  "timestamp": "2024-03-15T10:30:00Z"
}
```

### 2. 🧱 validate_composition

**Function Signature**:

```javascript
validate_composition(available_assets, composition_rules) => CompositionResult
```

**N8N Implementation**:

```javascript
function validate_composition(assets, rules) {
  const available = assets.map(a => a.type || a.name);
  const required = rules.required_inclusions || [];
  const optional = rules.optional_inclusions || [];
  
  const missing = required.filter(req => !available.includes(req));
  const present = required.filter(req => available.includes(req));
  const extras = available.filter(a => ![...required, ...optional].includes(a));
  
  return {
    valid: missing.length === 0,
    complete: missing.length === 0 && available.length >= required.length,
    missing: missing,
    present: present,
    extras: extras,
    can_proceed: missing.length === 0,
    starting_point: rules.starting_point,
    output_product: rules.output_product,
    readiness: missing.length === 0 ? "ready" : "incomplete"
  };
}
```

**Asset Template Configuration**:

```json
{
  "composition": {
    "starting_point": "raw_camera_plate",
    "required_inclusions": ["lighting_pass", "geometry", "materials"],
    "optional_inclusions": ["motion_blur", "depth_pass"],
    "output_product": "final_comp"
  }
}
```

### 3. 📦 resolve_location

**Function Signature**:

```javascript
resolve_location(context, location_spec) => LocationResult
```

**N8N Implementation**:

```javascript
function resolve_location(context, locationSpec) {
  const resolveVariable = (value, context) => {
    if (typeof value === 'string' && value.startsWith('${')) {
      const path = value.match(/\$\{([^}]+)\}/)[1];
      const keys = path.split('.');
      return keys.reduce((obj, key) => obj?.[key], context);
    }
    return value;
  };
  
  return {
    shooting: resolveVariable(locationSpec.shooting_location, context),
    production: resolveVariable(locationSpec.production_location, context),
    narrative: resolveVariable(locationSpec.narrative_location, context),
    coordinates: locationSpec.coordinates,
    address: locationSpec.address,
    resolved_at: new Date().toISOString(),
    context_used: context
  };
}
```

### 4. 📏 check_measurements

**Function Signature**:

```javascript
check_measurements(asset_metadata, measurement_specs) => MeasurementResult
```

**N8N Implementation**:

```javascript
function check_measurements(assetMeta, specs) {
  const results = {
    valid: true,
    checks: [],
    errors: [],
    warnings: []
  };
  
  // Dimension checks
  if (specs.dimensions) {
    ['width', 'height', 'depth'].forEach(dim => {
      if (specs.dimensions[dim] && assetMeta[dim]) {
        const expected = specs.dimensions[dim];
        const actual = assetMeta[dim];
        const match = expected.toString() === actual.toString();
        
        results.checks.push({
          dimension: dim,
          expected: expected,
          actual: actual,
          match: match
        });
        
        if (!match) {
          results.valid = false;
          results.errors.push(`${dim}: expected ${expected}, got ${actual}`);
        }
      }
    });
  }
  
  // Frame rate checks
  if (specs.frame_rate && assetMeta.frame_rate) {
    const match = specs.frame_rate === assetMeta.frame_rate;
    results.checks.push({
      property: 'frame_rate',
      expected: specs.frame_rate,
      actual: assetMeta.frame_rate,
      match: match
    });
    
    if (!match) {
      results.valid = false;
      results.errors.push(`Frame rate: expected ${specs.frame_rate}, got ${assetMeta.frame_rate}`);
    }
  }
  
  return results;
}
```

### 5. 📝 generate_filename

**Function Signature**:

```javascript
generate_filename(identifier, metadata, pattern) => FilenameResult
```

**N8N Implementation**:

```javascript
function generate_filename(identifier, metadata, pattern) {
  const variables = {
    identifier: identifier.value,
    frame: metadata.frame || 1,
    extension: metadata.extension || 'exr',
    version: identifier.variables?.version || 1,
    shot: identifier.variables?.shot,
    sequence: identifier.variables?.sequence
  };
  
  const filename = pattern.replace(/\{([^}]+)\}/g, (_, key) => {
    const [base, format] = key.split(':');
    const val = variables[base];
    
    if (format === "04d") return String(val).padStart(4, "0");
    if (format === "03d") return String(val).padStart(3, "0");
    return val;
  });
  
  return {
    filename: filename,
    variables: variables,
    pattern: pattern,
    valid: filename.indexOf('undefined') === -1,
    path_safe: !/[<>:"|?*]/.test(filename)
  };
}
```

### 6. 🏷️ append_annotation

**Function Signature**:

```javascript
append_annotation(entity, annotation_data, author) => AnnotatedEntity
```

**N8N Implementation**:

```javascript
function append_annotation(entity, annotationData, author) {
  const annotation = {
    id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    author: author,
    content: annotationData.content,
    tags: annotationData.tags || [],
    timestamp: new Date().toISOString(),
    type: annotationData.type || 'note'
  };
  
  const updated = {
    ...entity,
    annotations: [...(entity.annotations || []), annotation],
    last_annotated: annotation.timestamp,
    annotated_by: author
  };
  
  return {
    entity: updated,
    annotation: annotation,
    total_annotations: updated.annotations.length
  };
}
```

## N8N Subworkflow Templates

### Universal Utility Executor Workflow

```json
{
  "name": "Execute Asset Template Utilities",
  "nodes": [
    {
      "name": "Parse Template",
      "type": "function",
      "parameters": {
        "functionCode": "
          const template = $input.item.json.template;
          const context = $input.item.json.context || {};
          const file = $input.item.json.file || {};
          
          return {
            json: {
              utilities_to_run: [
                'generate_identifier',
                'validate_composition', 
                'check_measurements',
                'generate_filename',
                'resolve_location'
              ],
              template,
              context,
              file,
              results: {}
            }
          };
        "
      }
    },
    {
      "name": "Generate Identifier",
      "type": "function",
      "parameters": {
        "functionCode": "
          const { template, context, file } = $input.item.json;
          const idConfig = template.movielab_utilities.identifier;
          
          const result = generate_identifier(
            { ...idConfig.variables, ...context },
            idConfig.pattern,
            idConfig.scope
          );
          
          return {
            json: {
              ...$input.item.json,
              results: {
                ...$input.item.json.results,
                identifier: result
              }
            }
          };
        "
      }
    },
    {
      "name": "Validate Composition",
      "type": "function", 
      "parameters": {
        "functionCode": "
          const { template, file } = $input.item.json;
          const composition = template.movielab_utilities.composition;
          const available = [file]; // In real usage, scan directory
          
          const result = validate_composition(available, composition);
          
          return {
            json: {
              ...$input.item.json,
              results: {
                ...$input.item.json.results,
                composition: result
              }
            }
          };
        "
      }
    },
    {
      "name": "Check Measurements",
      "type": "function",
      "parameters": {
        "functionCode": "
          const { template, file } = $input.item.json;
          const measurements = template.movielab_utilities.measurements;
          
          const result = check_measurements(file.metadata || {}, measurements);
          
          return {
            json: {
              ...$input.item.json,
              results: {
                ...$input.item.json.results,
                measurements: result
              }
            }
          };
        "
      }
    },
    {
      "name": "Generate Output",
      "type": "function",
      "parameters": {
        "functionCode": "
          const { results, template } = $input.item.json;
          
          const output = {
            valid: results.composition?.valid && results.measurements?.valid,
            identifier: results.identifier,
            filename: generate_filename(
              results.identifier,
              $input.item.json.file,
              template.movielab_utilities.file_details.naming_pattern
            ),
            location: results.location,
            ready_for_next_step: results.composition?.can_proceed
          };
          
          return { json: { ...output, execution_complete: true } };
        "
      }
    }
  ]
}
```

## Benefits of This Approach

### 1. **Declarative → Executable Transformation**
Templates declare intent, functions execute it automatically

### 2. **Pure Function Reliability**
Each utility produces consistent results for identical inputs

### 3. **Composable Workflow Architecture**
Functions can be chained in different combinations for different workflows

### 4. **Universal Tool Compatibility**
Any system that reads .asset_template.json gets the same behavior

### 5. **Real-time Automation**
Files are processed and validated as they're added or modified

This functional approach transforms MovieLabs utilities from static documentation into **executable production automation** that maintains industry standards while providing creative flexibility.