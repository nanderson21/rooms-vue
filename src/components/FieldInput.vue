<template>
  <div class="field-input" :class="{ 'has-error': hasError }">
    <!-- Text Input -->
    <input
      v-if="fieldDefinition.field_type === 'text'"
      type="text"
      :id="fieldId"
      v-model="localValue"
      :placeholder="placeholder"
      :required="fieldDefinition.is_required"
      @input="handleInput"
      @blur="handleBlur"
      class="form-control"
    />

    <!-- Textarea -->
    <textarea
      v-else-if="fieldDefinition.field_type === 'textarea'"
      :id="fieldId"
      v-model="localValue"
      :placeholder="placeholder"
      :required="fieldDefinition.is_required"
      @input="handleInput"
      @blur="handleBlur"
      rows="4"
      class="form-control"
    ></textarea>

    <!-- Number Input -->
    <input
      v-else-if="fieldDefinition.field_type === 'number'"
      type="number"
      :id="fieldId"
      v-model.number="localValue"
      :placeholder="placeholder"
      :required="fieldDefinition.is_required"
      :min="validationRules.min"
      :max="validationRules.max"
      :step="validationRules.step || 'any'"
      @input="handleInput"
      @blur="handleBlur"
      class="form-control"
    />

    <!-- Date Input -->
    <input
      v-else-if="fieldDefinition.field_type === 'date'"
      type="date"
      :id="fieldId"
      v-model="localValue"
      :required="fieldDefinition.is_required"
      @input="handleInput"
      @blur="handleBlur"
      class="form-control"
    />

    <!-- DateTime Input -->
    <input
      v-else-if="fieldDefinition.field_type === 'datetime'"
      type="datetime-local"
      :id="fieldId"
      v-model="localValue"
      :required="fieldDefinition.is_required"
      @input="handleInput"
      @blur="handleBlur"
      class="form-control"
    />

    <!-- Select Dropdown -->
    <select
      v-else-if="fieldDefinition.field_type === 'select'"
      :id="fieldId"
      v-model="localValue"
      :required="fieldDefinition.is_required"
      @change="handleInput"
      @blur="handleBlur"
      class="form-control"
    >
      <option value="">Choose...</option>
      <option
        v-for="option in fieldConfig.options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>

    <!-- Multi-select -->
    <div
      v-else-if="fieldDefinition.field_type === 'multiselect'"
      class="multiselect-container"
    >
      <div class="multiselect-options">
        <label
          v-for="option in fieldConfig.options"
          :key="option.value"
          class="checkbox-label"
        >
          <input
            type="checkbox"
            :value="option.value"
            :checked="isOptionSelected(option.value)"
            @change="handleMultiselectChange(option.value)"
          />
          {{ option.label }}
        </label>
      </div>
    </div>

    <!-- Boolean Checkbox -->
    <div
      v-else-if="fieldDefinition.field_type === 'boolean'"
      class="checkbox-container"
    >
      <label class="checkbox-label">
        <input
          type="checkbox"
          :id="fieldId"
          v-model="localValue"
          @change="handleInput"
        />
        {{ fieldConfig.checkboxLabel || fieldDefinition.field_label }}
      </label>
    </div>

    <!-- URL Input -->
    <input
      v-else-if="fieldDefinition.field_type === 'url'"
      type="url"
      :id="fieldId"
      v-model="localValue"
      :placeholder="placeholder || 'https://example.com'"
      :required="fieldDefinition.is_required"
      @input="handleInput"
      @blur="handleBlur"
      class="form-control"
    />

    <!-- Email Input -->
    <input
      v-else-if="fieldDefinition.field_type === 'email'"
      type="email"
      :id="fieldId"
      v-model="localValue"
      :placeholder="placeholder || 'email@example.com'"
      :required="fieldDefinition.is_required"
      @input="handleInput"
      @blur="handleBlur"
      class="form-control"
    />

    <!-- File Reference -->
    <div
      v-else-if="fieldDefinition.field_type === 'file_reference'"
      class="file-reference-container"
    >
      <input
        type="text"
        :id="fieldId"
        v-model="localValue"
        :placeholder="placeholder || 'File path or ID'"
        :required="fieldDefinition.is_required"
        @input="handleInput"
        @blur="handleBlur"
        class="form-control"
      />
      <button
        @click="$emit('browse-files')"
        type="button"
        class="browse-btn"
      >
        <font-awesome-icon :icon="['fas', 'folder-open']" />
      </button>
    </div>

    <!-- Validation Error Messages -->
    <div v-if="hasError" class="field-errors">
      <span v-for="error in errors" :key="error" class="error-message">
        {{ error }}
      </span>
    </div>

    <!-- Helper Text -->
    <div v-if="fieldConfig.helperText && !hasError" class="helper-text">
      {{ fieldConfig.helperText }}
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue';

export default {
  name: 'FieldInput',
  
  props: {
    fieldDefinition: {
      type: Object,
      required: true
    },
    value: {
      default: null
    },
    errors: {
      type: Array,
      default: () => []
    },
    validateOnBlur: {
      type: Boolean,
      default: true
    }
  },

  emits: ['update:value', 'validate', 'browse-files'],

  setup(props, { emit }) {
    const localValue = ref(props.value);
    const touched = ref(false);

    // Parse field configuration
    const fieldConfig = computed(() => {
      try {
        return typeof props.fieldDefinition.field_config === 'string' 
          ? JSON.parse(props.fieldDefinition.field_config)
          : props.fieldDefinition.field_config || {};
      } catch {
        return {};
      }
    });

    // Parse validation rules
    const validationRules = computed(() => {
      try {
        return typeof props.fieldDefinition.validation_rules === 'string'
          ? JSON.parse(props.fieldDefinition.validation_rules)
          : props.fieldDefinition.validation_rules || {};
      } catch {
        return {};
      }
    });

    // Generate field ID
    const fieldId = computed(() => {
      return `field-${props.fieldDefinition.id || props.fieldDefinition.field_name}`;
    });

    // Placeholder text
    const placeholder = computed(() => {
      return fieldConfig.value.placeholder || 
             `Enter ${props.fieldDefinition.field_label.toLowerCase()}`;
    });

    // Error state
    const hasError = computed(() => {
      return touched.value && props.errors.length > 0;
    });

    // Handle input changes
    const handleInput = () => {
      emit('update:value', localValue.value);
      
      if (touched.value) {
        emit('validate');
      }
    };

    // Handle blur event
    const handleBlur = () => {
      touched.value = true;
      
      if (props.validateOnBlur) {
        emit('validate');
      }
    };

    // Handle multiselect changes
    const handleMultiselectChange = (optionValue) => {
      const currentValues = localValue.value 
        ? localValue.value.split(',').filter(v => v)
        : [];
      
      const index = currentValues.indexOf(optionValue);
      if (index > -1) {
        currentValues.splice(index, 1);
      } else {
        currentValues.push(optionValue);
      }
      
      localValue.value = currentValues.join(',');
      handleInput();
    };

    // Check if multiselect option is selected
    const isOptionSelected = (optionValue) => {
      if (!localValue.value) return false;
      const values = localValue.value.split(',');
      return values.includes(optionValue);
    };

    // Watch for external value changes
    watch(() => props.value, (newValue) => {
      localValue.value = newValue;
    });

    // Initialize with default value if provided
    onMounted(() => {
      if (!localValue.value && props.fieldDefinition.default_value) {
        localValue.value = props.fieldDefinition.default_value;
        emit('update:value', localValue.value);
      }
    });

    return {
      localValue,
      touched,
      fieldConfig,
      validationRules,
      fieldId,
      placeholder,
      hasError,
      handleInput,
      handleBlur,
      handleMultiselectChange,
      isOptionSelected
    };
  }
};
</script>

<style scoped>
.field-input {
  width: 100%;
}

.form-control {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: all 0.2s;
  background: white;
}

.form-control:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.has-error .form-control {
  border-color: #ef4444;
}

.has-error .form-control:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.checkbox-container {
  padding: 0.5rem 0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: #374151;
  user-select: none;
}

.checkbox-label input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

.multiselect-container {
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.5rem;
  background: white;
}

.multiselect-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.file-reference-container {
  display: flex;
  gap: 0.5rem;
}

.browse-btn {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: white;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.browse-btn:hover {
  background: #f9fafb;
  color: #374151;
}

.field-errors {
  margin-top: 0.25rem;
}

.error-message {
  display: block;
  font-size: 0.75rem;
  color: #dc2626;
  margin-top: 0.125rem;
}

.helper-text {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #6b7280;
}

/* Disabled state */
.form-control:disabled {
  background: #f9fafb;
  color: #9ca3af;
  cursor: not-allowed;
}

/* Select dropdown styling */
select.form-control {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 1.5em 1.5em;
  padding-right: 2.5rem;
}

/* Number input - hide spinners in some browsers */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
}
</style>