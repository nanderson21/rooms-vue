/**
 * Asset Template JSON Schema Definitions
 * Defines the structure and validation rules for .asset_template.json files
 * Based on MovieLabs 2030 ontology utilities
 */

/**
 * Complete Asset Template Schema
 * This is the root schema for .asset_template.json files
 */
export const AssetTemplateSchema = {
  type: 'object',
  required: ['movielab_utilities', 'input_assets', 'output_assets'],
  properties: {
    movielab_utilities: {
      $ref: '#/definitions/MovieLabsUtilities'
    },
    input_assets: {
      type: 'array',
      items: { $ref: '#/definitions/InputAsset' },
      minItems: 1
    },
    output_assets: {
      type: 'array',
      items: { $ref: '#/definitions/OutputAsset' },
      minItems: 1
    },
    context_variables: {
      type: 'object',
      additionalProperties: true,
      description: 'Variables available for template resolution'
    },
    n8n_workflows: {
      $ref: '#/definitions/N8nWorkflows'
    },
    validation_profile: {
      $ref: '#/definitions/ValidationProfile'
    },
    manifest_stack: {
      type: 'array',
      items: { $ref: '#/definitions/ManifestEntry' },
      description: 'Provenance and update history'
    },
    context_links: {
      type: 'array',
      items: { $ref: '#/definitions/ContextLink' },
      description: 'Links to external or parent contexts'
    }
  },
  definitions: {
    // MovieLabs Utilities Definition
    MovieLabsUtilities: {
      type: 'object',
      required: ['identifier', 'file_details'],
      properties: {
        identifier: { $ref: '#/definitions/IdentifierUtility' },
        location: { $ref: '#/definitions/LocationUtility' },
        composition: { $ref: '#/definitions/CompositionUtility' },
        measurements: { $ref: '#/definitions/MeasurementUtility' },
        file_details: { $ref: '#/definitions/FileDetailsUtility' },
        annotations: {
          type: 'array',
          items: { $ref: '#/definitions/Annotation' }
        },
        tags: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    },

    // Identifier Utility
    IdentifierUtility: {
      type: 'object',
      required: ['pattern'],
      properties: {
        scope: {
          type: 'string',
          pattern: '^[A-Z_][A-Z0-9_.]*$',
          description: 'Hierarchical scope (e.g., PROJECT.SEQUENCE.SHOT)'
        },
        pattern: {
          type: 'string',
          description: 'Template pattern with variable placeholders'
        },
        variables: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'Variable definitions with default values or expressions'
        },
        resolved_identifier: {
          type: 'string',
          format: 'uri',
          description: 'URI that resolves to the identifier referent'
        }
      }
    },

    // Location Utility
    LocationUtility: {
      type: 'object',
      properties: {
        shooting_location: { type: 'string' },
        production_location: { type: 'string' },
        narrative_location: { type: 'string' }
      }
    },

    // Composition Utility
    CompositionUtility: {
      type: 'object',
      required: ['starting_point'],
      properties: {
        starting_point: { type: 'string' },
        required_inclusions: {
          type: 'array',
          items: { type: 'string' }
        },
        optional_inclusions: {
          type: 'array',
          items: { type: 'string' }
        },
        output_product: { type: 'string' }
      }
    },

    // Measurement Utility
    MeasurementUtility: {
      type: 'object',
      properties: {
        dimensions: {
          type: 'object',
          properties: {
            width: { 
              oneOf: [
                { type: 'string', pattern: '^\\d+px$|^\\${.*}$' },
                { type: 'number' }
              ]
            },
            height: { 
              oneOf: [
                { type: 'string', pattern: '^\\d+px$|^\\${.*}$' },
                { type: 'number' }
              ]
            },
            depth: { 
              oneOf: [
                { type: 'string', pattern: '^\\d+px$|^\\${.*}$' },
                { type: 'number' },
                { type: 'null' }
              ]
            }
          }
        },
        frame_rate: {
          oneOf: [
            { type: 'string', pattern: '^\\d+(\\.\\d+)?fps$|^\\${.*}$' },
            { type: 'number' }
          ]
        },
        color_space: { type: 'string' },
        bit_depth: { type: 'string' },
        sample_rate: { type: 'string' }
      }
    },

    // File Details Utility
    FileDetailsUtility: {
      type: 'object',
      required: ['naming_pattern'],
      properties: {
        naming_pattern: { type: 'string' },
        path_template: { type: 'string' },
        required_extensions: {
          type: 'array',
          items: { type: 'string', pattern: '^\\.[a-z0-9]+$' }
        },
        media_types: {
          type: 'array',
          items: { type: 'string', pattern: '^[a-z]+/[a-z0-9-+.]+$' }
        },
        forbidden_patterns: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    },

    // Input Asset Definition
    InputAsset: {
      type: 'object',
      required: ['name', 'type'],
      properties: {
        name: { type: 'string' },
        type: { type: 'string' },
        context_tags: {
          type: 'array',
          items: { type: 'string' }
        },
        required_metadata: {
          type: 'object',
          additionalProperties: true
        },
        validation_rules: {
          $ref: '#/definitions/AssetValidationRules'
        },
        processing_hints: {
          type: 'object',
          properties: {
            thumbnail_priority: { type: 'string', enum: ['low', 'medium', 'high'] },
            metadata_extraction: {
              type: 'array',
              items: { type: 'string' }
            },
            auto_transcode: { type: 'boolean' }
          }
        }
      }
    },

    // Output Asset Definition
    OutputAsset: {
      type: 'object',
      required: ['name', 'type'],
      properties: {
        name: { type: 'string' },
        type: { type: 'string' },
        context_tags: {
          type: 'array',
          items: { type: 'string' }
        },
        export_metadata: {
          type: 'object',
          additionalProperties: true
        },
        delivery_requirements: {
          $ref: '#/definitions/DeliveryRequirements'
        },
        approval_workflow: {
          $ref: '#/definitions/ApprovalWorkflow'
        }
      }
    },

    // Asset Validation Rules
    AssetValidationRules: {
      type: 'object',
      properties: {
        file_size_min: { type: 'string', pattern: '^\\d+[KMGT]?B$' },
        file_size_max: { type: 'string', pattern: '^\\d+[KMGT]?B$' },
        required_channels: {
          type: 'array',
          items: { type: 'string' }
        },
        required_sidecar: { type: 'boolean' },
        metadata_validation: {
          type: 'array',
          items: { type: 'string' }
        },
        checksum_validation: { type: 'boolean' },
        virus_scan: { type: 'boolean' }
      }
    },

    // Delivery Requirements
    DeliveryRequirements: {
      type: 'object',
      properties: {
        file_naming: { type: 'string' },
        folder_structure: { type: 'string' },
        metadata_sidecar: { type: 'boolean' },
        delivery_format: { type: 'string' },
        quality_check: { type: 'boolean' },
        client_approval: { type: 'boolean' }
      }
    },

    // Approval Workflow
    ApprovalWorkflow: {
      type: 'object',
      properties: {
        required_approvers: {
          type: 'array',
          items: { type: 'string' }
        },
        approval_order: { type: 'string', enum: ['sequential', 'parallel', 'any'] },
        auto_approve_conditions: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    },

    // N8N Workflows
    N8nWorkflows: {
      type: 'object',
      properties: {
        on_file_add: { type: 'string' },
        on_file_complete: { type: 'string' },
        on_export: { type: 'string' },
        on_approval: { type: 'string' },
        validation_workflow: { type: 'string' }
      }
    },

    // Validation Profile
    ValidationProfile: {
      type: 'object',
      properties: {
        required_tags: {
          type: 'array',
          items: { type: 'string' }
        },
        allowed_extensions: {
          type: 'array',
          items: { type: 'string', pattern: '^\\.[a-z0-9]+$' }
        },
        forbidden_filenames: {
          type: 'array',
          items: { type: 'string' }
        },
        mandatory_workflows: {
          type: 'array',
          items: { type: 'string' }
        },
        compliance_level: { type: 'string', enum: ['strict', 'moderate', 'flexible'] }
      }
    },

    // Manifest Entry for Provenance
    ManifestEntry: {
      type: 'object',
      required: ['source', 'timestamp'],
      properties: {
        source: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
        author: { type: 'string' },
        merged: { type: 'boolean' },
        notes: { type: 'string' },
        changes: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    },

    // Context Link for Federated References
    ContextLink: {
      type: 'object',
      required: ['type', 'target'],
      properties: {
        type: { type: 'string', enum: ['symlink', 'reference', 'inherit'] },
        target: { type: 'string' },
        inherit_utilities: { type: 'boolean' },
        remap_variables: {
          type: 'object',
          additionalProperties: { type: 'string' }
        }
      }
    },

    // Annotation
    Annotation: {
      type: 'object',
      required: ['text'],
      properties: {
        author: { type: 'string' },
        text: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
        type: { type: 'string', enum: ['note', 'warning', 'error', 'info'] }
      }
    }
  }
};

/**
 * Context Configuration Schema
 * For .context.json files at parent folder levels
 */
export const ContextConfigSchema = {
  type: 'object',
  required: ['name', 'type'],
  properties: {
    name: { type: 'string' },
    type: { type: 'string', enum: ['room', 'sequence', 'shot', 'task', 'generic'] },
    description: { type: 'string' },
    participants: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          role: { type: 'string' },
          ldap_group: { type: 'string' },
          permissions: {
            type: 'array',
            items: { type: 'string', enum: ['read', 'write', 'approve', 'admin'] }
          }
        }
      }
    },
    default_tags: {
      type: 'array',
      items: { type: 'string' }
    },
    inheritance_rules: {
      type: 'object',
      properties: {
        propagate_tags: { type: 'boolean' },
        propagate_participants: { type: 'boolean' },
        propagate_workflows: { type: 'boolean' }
      }
    },
    infrastructure_links: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['storage', 'compute', 'network', 'service'] },
          name: { type: 'string' },
          endpoint: { type: 'string' },
          credentials: { type: 'string' }
        }
      }
    }
  }
};

/**
 * Validation utility functions
 */
export class AssetTemplateValidator {
  constructor() {
    this.schemas = {
      assetTemplate: AssetTemplateSchema,
      contextConfig: ContextConfigSchema
    };
  }

  /**
   * Validate an asset template object against the schema
   * @param {Object} template - Asset template to validate
   * @param {string} schemaType - Type of schema to validate against
   * @returns {Object} Validation result
   */
  validate(template, schemaType = 'assetTemplate') {
    try {
      const schema = this.schemas[schemaType];
      if (!schema) {
        throw new Error(`Unknown schema type: ${schemaType}`);
      }

      // Basic validation - in production, use a proper JSON schema validator like Ajv
      const errors = this.validateObject(template, schema);
      
      return {
        valid: errors.length === 0,
        errors,
        warnings: this.generateWarnings(template)
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error.message],
        warnings: []
      };
    }
  }

  /**
   * Basic object validation against schema
   * @param {Object} obj - Object to validate
   * @param {Object} schema - Schema definition
   * @param {string} path - Current path in object (for error reporting)
   * @returns {Array} Array of validation errors
   */
  validateObject(obj, schema, path = '') {
    const errors = [];

    // Check required properties
    if (schema.required) {
      for (const required of schema.required) {
        if (!obj.hasOwnProperty(required)) {
          errors.push(`Missing required property: ${path}${required}`);
        }
      }
    }

    // Check property types
    if (schema.properties) {
      for (const [key, value] of Object.entries(obj)) {
        const propSchema = schema.properties[key];
        if (propSchema) {
          const propPath = path ? `${path}.${key}` : key;
          errors.push(...this.validateProperty(value, propSchema, propPath));
        }
      }
    }

    return errors;
  }

  /**
   * Validate a property against its schema
   * @param {*} value - Property value
   * @param {Object} schema - Property schema
   * @param {string} path - Property path
   * @returns {Array} Validation errors
   */
  validateProperty(value, schema, path) {
    const errors = [];

    // Type validation
    if (schema.type) {
      const expectedType = schema.type;
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      
      if (expectedType === 'object' && value === null) {
        // null is acceptable for object type in some cases
      } else if (actualType !== expectedType) {
        errors.push(`${path}: expected ${expectedType}, got ${actualType}`);
      }
    }

    // Pattern validation for strings
    if (schema.pattern && typeof value === 'string') {
      const pattern = new RegExp(schema.pattern);
      if (!pattern.test(value)) {
        errors.push(`${path}: value does not match pattern ${schema.pattern}`);
      }
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`${path}: value must be one of ${schema.enum.join(', ')}`);
    }

    // Array validation
    if (schema.type === 'array' && Array.isArray(value)) {
      if (schema.minItems && value.length < schema.minItems) {
        errors.push(`${path}: array must have at least ${schema.minItems} items`);
      }
      
      if (schema.items) {
        value.forEach((item, index) => {
          errors.push(...this.validateProperty(item, schema.items, `${path}[${index}]`));
        });
      }
    }

    // Object validation
    if (schema.type === 'object' && typeof value === 'object' && value !== null) {
      errors.push(...this.validateObject(value, schema, `${path}.`));
    }

    return errors;
  }

  /**
   * Generate warnings for common issues
   * @param {Object} template - Asset template
   * @returns {Array} Array of warning messages
   */
  generateWarnings(template) {
    const warnings = [];

    // Check for unresolved variables
    const jsonString = JSON.stringify(template);
    const unresolvedVars = jsonString.match(/\$\{[^}]+\}/g);
    if (unresolvedVars) {
      const uniqueVars = [...new Set(unresolvedVars)];
      warnings.push(`Found unresolved variables: ${uniqueVars.join(', ')}`);
    }

    // Check for empty arrays
    if (template.input_assets && template.input_assets.length === 0) {
      warnings.push('input_assets array is empty');
    }
    
    if (template.output_assets && template.output_assets.length === 0) {
      warnings.push('output_assets array is empty');
    }

    // Check for missing n8n workflows
    if (!template.n8n_workflows) {
      warnings.push('No n8n workflows defined');
    }

    // Check for missing validation profile
    if (!template.validation_profile) {
      warnings.push('No validation profile defined - folder will accept any files');
    }

    return warnings;
  }

  /**
   * Create a default asset template structure
   * @param {string} folderClass - Type of folder
   * @returns {Object} Default template structure
   */
  createDefaultTemplate(folderClass = 'generic') {
    const timestamp = new Date().toISOString();
    
    return {
      movielab_utilities: {
        identifier: {
          scope: "PROJECT.FOLDER",
          pattern: "{project}_{folder}_{version:03d}",
          variables: {
            project: "${context.project_code}",
            folder: "${context.folder_name}",
            version: "${increment}"
          }
        },
        file_details: {
          naming_pattern: "{identifier}_{frame:04d}.{extension}",
          path_template: "/{project}/{folder}/",
          required_extensions: [],
          media_types: []
        }
      },
      input_assets: [
        {
          name: "Input Files",
          type: "generic_input",
          context_tags: ["input"],
          required_metadata: {},
          validation_rules: {}
        }
      ],
      output_assets: [
        {
          name: "Processed Files",
          type: "generic_output", 
          context_tags: ["output", "processed"],
          export_metadata: {},
          delivery_requirements: {}
        }
      ],
      context_variables: {},
      n8n_workflows: {
        on_file_add: "validate_input_asset",
        on_file_complete: "process_asset"
      },
      manifest_stack: [
        {
          source: "auto_generated",
          timestamp: timestamp,
          author: "system",
          merged: false,
          notes: `Auto-generated template for ${folderClass} folder`
        }
      ]
    };
  }
}

// Export validator instance
export const assetTemplateValidator = new AssetTemplateValidator();

/**
 * Common template patterns for different media formats
 */
export const CommonTemplatePatterns = {
  // RED Camera patterns
  red: {
    identifier_pattern: "{project}_{reel}_{clip}_{take:03d}",
    naming_pattern: "{project}_{reel}_{clip}_{frame:06d}.r3d",
    required_extensions: [".r3d"],
    media_types: ["video/x-red"]
  },

  // ARRI patterns  
  arri: {
    identifier_pattern: "{project}_{camera}_{roll}_{clip:03d}",
    naming_pattern: "{project}_{camera}_{roll}_{clip:06d}.ari",
    required_extensions: [".ari", ".arri"],
    media_types: ["video/x-arri"]
  },

  // VFX sequence patterns
  vfx_sequence: {
    identifier_pattern: "{project}_{shot}_{element}_{version:03d}",
    naming_pattern: "{shot}_{element}_{frame:04d}.exr",
    required_extensions: [".exr", ".dpx"],
    media_types: ["image/x-exr", "image/x-dpx"]
  },

  // ProRes proxy patterns
  proxy: {
    identifier_pattern: "{project}_{sequence}_{shot}_proxy_{version:03d}",
    naming_pattern: "{shot}_proxy.mov",
    required_extensions: [".mov", ".mp4"],
    media_types: ["video/quicktime", "video/mp4"]
  }
};

export default {
  AssetTemplateSchema,
  ContextConfigSchema,
  AssetTemplateValidator,
  assetTemplateValidator,
  CommonTemplatePatterns
};