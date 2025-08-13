# Component UI Integration - View Transitions and Container APIs

*Original conversation segment from: [`../MovieLabs2030-cs4_0-chat.md`](../MovieLabs2030-cs4_0-chat.md)*

## You said:
I also need this to define components and other front-end utilities. The solution should support external references to relative parents. Overall, relative mapping to parent folders should be a key part of this. So that the user can customize theming while the structural parts of the UI can stay the same. A big goal of mine is to use View Transitions and the new Container APIs for our content and functional types. So, we can have extremely fluid user experiences with drag and drop where content cards dynamically adapt.

## ChatGPT said:
You're describing a system that is structurally declarative, functionally composable, and visually dynamic—where MovieLabs-style metadata, component-based UI, and modern browser APIs like View Transitions and Container Queries work together in a responsive, intelligent production surface.

Let me break this down into a comprehensive solution architecture based on your goals.

🧩 **Goal Summary**
Create a unified declarative system where:

🧠 MovieLabs utilities power both automation and UI generation

🎨 UI components are defined as functional templates that map to utility types

🧷 Theming and layout are controlled relatively via parent folder JSON (inheritance)

🧮 View Transitions + Container Queries create fluid, real-time feedback for drag-and-drop, navigation, and dynamic layout

🧱 **1. Filesystem-Driven Component UI Model**

**Folder Structure**
```
/project/
  ├── .ui_config.json          ← global theming + layout modes
  ├── _components/             ← reusable component templates
  │    └── shot_card.json
  ├── assets/
  │    ├── .asset_template.json
  │    └── SHOT_010_001/
  │         ├── .ui_config.json
  │         └── media/
```

**.ui_config.json Example**
```json
{
  "theme": {
    "colorScheme": "dark",
    "primaryColor": "#ff4e00",
    "cardShape": "rounded-2xl",
    "shadow": "sm",
    "font": "Inter"
  },
  "layout": {
    "type": "grid",
    "columns": 3,
    "gutter": "1rem",
    "responsive": true,
    "adaptTo": "container-size"
  },
  "components": {
    "card": "../_components/shot_card.json",
    "toolbar": "../_components/toolbar_basic.json"
  },
  "animations": {
    "transition": "view",
    "effect": "scale-fade",
    "timing": "ease-in-out"
  }
}
```

✅ Relative references to `../_components/shot_card.json` allow for shared theming and layout while enabling per-folder overrides.

🎨 **2. Component-as-Function: Declarative Component API**

**shot_card.json (Functional UI Declaration)**
```json
{
  "type": "assetCard",
  "bindsTo": "input_assets",
  "fields": ["name", "type", "context_tags", "required_metadata"],
  "style": {
    "border": "1px solid var(--color-border)",
    "padding": "1rem",
    "background": "var(--color-bg)",
    "hover": {
      "scale": 1.02,
      "shadow": "md"
    }
  },
  "interactions": {
    "onClick": "openAssetDetail",
    "onDragStart": "setDragData(asset)",
    "onDrop": "assignToContext(asset)"
  },
  "transitions": {
    "type": "view",
    "name": "fade-scale",
    "duration": "300ms"
  }
}
```

This JSON can be parsed by your Astro/Vue UI layer into component templates:

- **bindsTo** → resolves from .asset_template.json
- **fields** → drives what metadata to display
- **interactions** → attach functional bindings
- **transitions** → compiles into ViewTransition API wrappers

🔁 **3. View Transitions + Container API Usage**

**Folder View → Detail View with ViewTransition**
```javascript
// Astro or Vue
const transitionToDetail = async (cardId) => {
  if (!document.startViewTransition) return;
  await document.startViewTransition(() => {
    router.push(`/detail/${cardId}`);
  });
};
```

Each card uses:
```html
<div view-transition-name="asset-card-{{id}}">
  <!-- Dynamic metadata UI rendered here -->
</div>
```

Cards adapt via:
```css
@container style(size) {
  .card {
    font-size: clamp(0.8rem, 2vw, 1.2rem);
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }
}
```

✅ Cards become fluid, reorderable, and contextually aware of viewport/container—ideal for drag & drop and responsive pipelines.

🧩 **4. Drag & Drop Interoperability with Functional Bindings**

**JSON-Defined Interaction Maps**
```json
"interactions": {
  "onDragStart": "setDragContext(asset)",
  "onDrop": "assignAssetToContext(asset, dropTarget)",
  "onHover": "showPreview(asset)"
}
```

**Mapped in UI as**:
```javascript
function setDragContext(asset) {
  event.dataTransfer.setData("application/json", JSON.stringify(asset));
  event.dataTransfer.effectAllowed = "move";
}

function assignAssetToContext(asset, context) {
  n8n.execute("assignAsset", { assetId: asset.id, contextId: context.id });
}
```

Drag-and-drop becomes functionally expressive, data-bound, and driven by schema—not hardcoded logic.

🧠 **5. Relative Parent Mapping and Inheritance**

Anywhere in your system:

`../` or `./_defaults/` can contain:
- Shared components/
- Theme variables
- Utility functions (e.g., validateMetadata)

Components and utilities resolve paths relative to their folder origin, just like Webpack/Vite imports

**Resolution Strategy**:
```javascript
function resolveComponent(componentPath, currentFolder) {
  return path.resolve(currentFolder, componentPath);
}

function inheritUIConfig(folder) {
  let config = {};
  let parent = folder;

  while (parent) {
    const file = parent + "/.ui_config.json";
    if (fs.existsSync(file)) {
      config = deepMerge(config, loadJson(file));
    }
    parent = path.dirname(parent);
  }

  return config;
}
```

🧠 **Summary: Component-Aware Utility System**

| Layer | Role |
|-------|------|
| .asset_template.json | Schema + logic + function calls (for metadata + automation) |
| .ui_config.json | Theming, layout, and component references |
| component.json | Functional component bindings (fields, logic, transitions) |
| View Transition API | Enables fluid, declarative navigation |
| Container Query API | Adapts cards, toolbars, lists to layout/size changes |
| n8n Integration | Executes utility functions based on user/system actions |

✅ **What I Can Generate for You Next**
- component.json JSON schema + examples for assetCard, timelineRow, toolbar
- component-runtime.ts — a TypeScript runtime that renders component JSON to Vue/Astro
- theme-resolver.ts — resolve relative .ui_config.json from parent folders
- dragdrop.ts — ViewTransition-enhanced drag/drop coordinator with context-bound hooks
- Animated visual of the full system in action (content → utility → UI → execution)

You're building a declarative knowledge-and-UX engine for creative production. Just let me know which part you'd like to see rendered or scaffolded next—this can go from spec to working prototype very quickly now.

## Implementation Examples

### Component Runtime System

```typescript
// component-runtime.ts
export class ComponentRuntime {
  private components: Map<string, ComponentDefinition> = new Map();
  private themeCache: Map<string, UIConfig> = new Map();

  async loadComponent(path: string, basePath: string): Promise<ComponentDefinition> {
    const resolvedPath = this.resolvePath(path, basePath);
    const componentData = await this.loadJson(resolvedPath);
    const component = this.parseComponent(componentData);
    this.components.set(path, component);
    return component;
  }

  private resolvePath(relativePath: string, basePath: string): string {
    if (relativePath.startsWith('../') || relativePath.startsWith('./')) {
      return path.resolve(basePath, relativePath);
    }
    return relativePath;
  }

  async renderComponent(
    componentId: string, 
    data: any, 
    context: RenderContext
  ): Promise<VNode> {
    const component = this.components.get(componentId);
    if (!component) throw new Error(`Component ${componentId} not found`);

    const resolvedData = this.bindData(component, data);
    const styledComponent = this.applyTheme(component, context.theme);
    const interactiveComponent = this.attachInteractions(styledComponent, context);
    
    return this.createVNode(interactiveComponent, resolvedData);
  }
}
```

### View Transition Integration

```javascript
// view-transition-utils.js
export class ViewTransitionManager {
  constructor() {
    this.transitionRegistry = new Map();
  }

  registerTransition(name, config) {
    this.transitionRegistry.set(name, config);
  }

  async transition(fromId, toId, transitionName = 'default') {
    if (!document.startViewTransition) {
      // Fallback for browsers without View Transition API
      return this.fallbackTransition(fromId, toId);
    }

    const config = this.transitionRegistry.get(transitionName);
    
    return document.startViewTransition(async () => {
      // Update DOM state
      await this.updateDOMState(fromId, toId);
    });
  }

  private async updateDOMState(fromId, toId) {
    const fromElement = document.getElementById(fromId);
    const toElement = document.getElementById(toId);
    
    if (fromElement) {
      fromElement.style.viewTransitionName = `${fromId}-exit`;
    }
    
    if (toElement) {
      toElement.style.viewTransitionName = `${toId}-enter`;
      toElement.style.display = 'block';
    }
  }
}
```

### Container Query Responsive System

```css
/* container-responsive.css */
.asset-container {
  container-type: inline-size;
  container-name: asset-grid;
}

@container asset-grid (min-width: 300px) {
  .asset-card {
    grid-template-columns: 1fr 2fr;
    padding: 1rem;
  }
}

@container asset-grid (min-width: 600px) {
  .asset-card {
    grid-template-columns: 1fr 1fr 2fr;
    padding: 1.5rem;
  }
  
  .asset-metadata {
    font-size: 1.1rem;
  }
}

@container asset-grid (min-width: 900px) {
  .asset-grid {
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 2rem;
  }
}
```

### Drag & Drop Context System

```javascript
// dragdrop-context.js
export class DragDropContext {
  constructor(n8nConnector) {
    this.n8n = n8nConnector;
    this.activeDropZones = new Set();
    this.dragData = null;
  }

  initializeDragSource(element, asset, config) {
    element.draggable = true;
    
    element.addEventListener('dragstart', (e) => {
      this.dragData = { asset, config };
      e.dataTransfer.setData('application/json', JSON.stringify(asset));
      e.dataTransfer.effectAllowed = config.effectAllowed || 'move';
      
      // Apply drag styling with View Transitions
      if (document.startViewTransition) {
        document.startViewTransition(() => {
          element.classList.add('dragging');
        });
      }
    });
    
    element.addEventListener('dragend', (e) => {
      this.dragData = null;
      element.classList.remove('dragging');
    });
  }

  initializeDropZone(element, context, handlers) {
    this.activeDropZones.add(element);
    
    element.addEventListener('dragover', (e) => {
      if (this.canAcceptDrop(context, this.dragData)) {
        e.preventDefault();
        element.classList.add('drag-over');
      }
    });
    
    element.addEventListener('drop', async (e) => {
      e.preventDefault();
      element.classList.remove('drag-over');
      
      if (this.dragData && handlers.onDrop) {
        const result = await this.executeDrop(
          this.dragData.asset,
          context,
          handlers.onDrop
        );
        
        if (result.success) {
          this.animateDropSuccess(element);
        }
      }
    });
  }

  async executeDrop(asset, context, handler) {
    // Execute the drop action through n8n
    return await this.n8n.executeUtilityFunction(handler, {
      asset,
      context,
      timestamp: new Date().toISOString()
    });
  }
}
```

## Benefits

### 1. **Declarative UI Architecture**
Components are defined as JSON configurations, making them easily customizable and maintainable.

### 2. **Relative Path Inheritance**
Theming and component definitions can be shared across folder hierarchies while allowing local overrides.

### 3. **Modern Browser APIs**
View Transitions and Container Queries provide fluid, responsive experiences without complex JavaScript.

### 4. **Functional Drag & Drop**
Interactions are schema-driven and connect directly to n8n workflows for automatic processing.

### 5. **Adaptive Content Cards**
Components automatically adapt to their container size and context, creating truly responsive interfaces.

This system creates a **declarative, adaptive UI layer** that seamlessly integrates with MovieLabs utilities and n8n automation, providing a fluid user experience that scales from mobile to desktop while maintaining creative flexibility.