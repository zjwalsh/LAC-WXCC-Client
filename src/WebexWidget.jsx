import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

class WebexTSFormsWidget extends HTMLElement {
  constructor() {
    super();
    this.root = null;
    this.container = null;
    this._taskId = null;
    this._store = null;
    this._shadow = null; // ShadowRoot where we will mount
    console.log('[WebexTSFormsWidget] Constructor called');
  }

  // observe attribute variants (HTML lowercases attribute names)
  static get observedAttributes() {
    return ['taskid', 'task-id'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'taskid' || name === 'task-id') {
      console.log('[WebexTSFormsWidget] attributeChangedCallback', name, oldValue, newValue);
      this._setTaskIdFromValue(newValue);
    }
  }

  // Accept host-injected property (property assignment)
  set taskId(val) {
    console.log('[WebexTSFormsWidget] taskId property set', val);
    this._setTaskIdFromValue(val);
  }

  // helper to normalise incoming taskId values
  _setTaskIdFromValue(val) {
    // handle property set as number/string/"null"/undefined
    if (val === undefined || val === null || val === 'null' || val === 'undefined' || val === '') {
      this._taskId = null;

      
    } else {
      // if it's an object with id property, allow that too
      if (typeof val === 'object' && val !== null) {
        this._taskId = val.selectedTaskId ?? val.taskId ?? String(val);
      } else {
        this._taskId = String(val);
      }
    }
    console.log('[WebexTSFormsWidget] internal _taskId updated ->', this._taskId);
    if (this.root) this._renderApp();
  }

  get taskId() {
    // explicit property preferred, fallback to store path
    return this._taskId || (this.store && this.store.agentContact && this.store.agentContact.selectedTaskId) || null;
  }

  // expose a store setter so host can set property.store = ...
  set store(val) {
    console.log('[WebexTSFormsWidget] store property set', val);
    this._store = val;
    // if taskId not explicitly provided, pick it up from store
    const storeTaskId = val && val.agentContact && val.agentContact.selectedTaskId;
    if (!this._taskId && storeTaskId) {
      this._taskId = storeTaskId;
      console.log('[WebexTSFormsWidget] taskId set from store ->', this._taskId);
    }
    if (this.root) this._renderApp();
  }

  get store() {
    return this._store || (typeof window !== 'undefined' && window.STORE) || null;
  }

  _injectStylesheet(href = null) {
    // Inject CSS into shadow root when available, otherwise into document
    const cssHref = href || 'https://ubuntu-vmware-virtual-platform.tail4794a2.ts.net/tsforms-widget.styles.css';

    // If we have a shadow root, try to fetch CSS and inject into the shadow root
    if (this._shadow) {
      // avoid duplicate injection
      if (this._shadow.querySelector && this._shadow.querySelector('style[data-tsforms-shadow]')) {
        console.log('[WebexTSFormsWidget] stylesheet already injected into shadow root');
        this._injectScopedFallback(this._shadow);
        return;
      }
      fetch(cssHref, { mode: 'cors' }).then(r => {
        if (!r.ok) throw new Error('fetch failed: ' + r.status);
        return r.text();
      }).then(cssText => {
        try {
          const style = document.createElement('style');
          style.dataset.tsformsShadow = '1';
          style.appendChild(document.createTextNode(cssText));
          this._shadow.appendChild(style);
          console.log('[WebexTSFormsWidget] Injected CSS into shadow root');
          this._injectScopedFallback(this._shadow);
        } catch (e) {
          console.warn('[WebexTSFormsWidget] Failed to append style to shadow root', e);
          this._injectScopedFallback(this._shadow);
        }
      }).catch(err => {
        console.warn('[WebexTSFormsWidget] Failed to fetch CSS for shadow root, injecting scoped fallback', err);
        this._injectScopedFallback(this._shadow);
      });
      return;
    }

    // Fallback: no shadow - inject into document (existing behavior)
    // already present?
    if (document.querySelector(`link[data-tsforms-styles-href="${cssHref}"]`) || document.querySelector(`style[data-tsforms-href="${cssHref}"]`)) {
      console.log('[WebexTSFormsWidget] Stylesheet already injected:', cssHref);
      this._injectScopedFallback();
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssHref;
    link.crossOrigin = 'anonymous';
    link.dataset.tsformsStylesHref = cssHref;
    link.onload = () => {
      console.log('[WebexTSFormsWidget] Stylesheet loaded via <link>:', cssHref);
      this._injectScopedFallback();
    };
    link.onerror = (e) => {
      console.warn('[WebexTSFormsWidget] <link> failed to load (will try inline fallback):', cssHref, e);
      this._injectStylesheetFallback(cssHref);
      this._injectScopedFallback();
    };
    try {
      document.head.appendChild(link);
      setTimeout(() => {
        const applied = Array.from(document.styleSheets).some(s => s.href && s.href.includes('tsforms-widget.styles.css'));
        console.log('[WebexTSFormsWidget] stylesheet present in document.styleSheets?', applied);
        if (!applied) {
          console.warn('[WebexTSFormsWidget] stylesheet not present in document.styleSheets — attempting fallback injection');
          this._injectStylesheetFallback(cssHref);
          this._injectScopedFallback();
        }
      }, 300);
    } catch (err) {
      console.warn('[WebexTSFormsWidget] failed to append <link>, trying fallback:', err);
      this._injectStylesheetFallback(cssHref);
      this._injectScopedFallback();
    }
  }

  _injectScopedFallback(target = null) {
    // target may be a ShadowRoot or document
    const root = target || document;
    // avoid duplicates
    try {
      if (root.querySelector && root.querySelector('style[data-tsforms-scoped-fallback]')) return;
    } catch (e) { /* ignore */ }

    const css = `
      /* Scoped fallback styles to ensure widget visuals when host overrides global CSS */
      .tsforms-root { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial !important; color: #1f2937 !important; background: transparent !important; box-sizing: border-box !important; padding: 24px !important; }
      .tsforms-root h2.text-2xl { font-size: 1.5rem !important; line-height: 2rem !important; font-weight: 700 !important; margin-bottom: 1.5rem !important; }
      .tsforms-root .mb-4 { margin-bottom: 1rem !important; }
      .tsforms-root .mb-6 { margin-bottom: 1.5rem !important; }
      .tsforms-root .w-full { width: 100% !important; }
      .tsforms-root input, .tsforms-root select { padding: .5rem .75rem !important; border: 1px solid #d1d5db !important; border-radius: .375rem !important; background: #fff !important; box-shadow: none !important; color: inherit !important; font: inherit !important; }
      .tsforms-root .px-4 { padding-left:1rem !important; padding-right:1rem !important; }
      .tsforms-root .py-2 { padding-top:.5rem !important; padding-bottom:.5rem !important; }
      .tsforms-root .rounded-md { border-radius:.375rem !important; }
      .tsforms-root .bg-blue-600 { background-color: #2563eb !important; color: #fff !important; }
      .tsforms-root .bg-gray-500 { background-color: #6b7280 !important; color: #fff !important; }
      .tsforms-root .text-sm { font-size: .875rem !important; line-height: 1.25rem !important; }
      .tsforms-root .shadow-md { box-shadow: 0 4px 12px rgba(0,0,0,0.06) !important; }
    `;
    try {
      const style = (root.createElement ? root.createElement('style') : document.createElement('style'));
      style.dataset.tsformsScopedFallback = '1';
      style.appendChild((root.createTextNode ? root.createTextNode(css) : document.createTextNode(css)));
      // append to appropriate head (shadow root has no head; append to root itself)
      if (root instanceof ShadowRoot) {
        root.appendChild(style);
        console.log('[WebexTSFormsWidget] Injected scoped fallback CSS into shadow root');
      } else {
        document.head.appendChild(style);
        console.log('[WebexTSFormsWidget] Injected scoped fallback CSS into document');
      }
    } catch (e) {
      console.warn('[WebexTSFormsWidget] Failed to inject scoped fallback', e);
    }
  }

  async _injectStylesheetFallback(href, target = null) {
    const root = target || document;
    try {
      const resp = await fetch(href, { mode: 'cors' });
      if (!resp.ok) throw new Error('fetch failed: ' + resp.status);
      const cssText = await resp.text();
      const style = (root.createElement ? root.createElement('style') : document.createElement('style'));
      style.type = 'text/css';
      style.dataset.tsformsHref = href;
      style.appendChild((root.createTextNode ? root.createTextNode(cssText) : document.createTextNode(cssText)));
      if (root instanceof ShadowRoot) root.appendChild(style); else document.head.appendChild(style);
      console.log('[WebexTSFormsWidget] Fallback: injected stylesheet text into target');
      const hasRule = Array.from((root instanceof ShadowRoot ? root.styleSheets || [] : document.styleSheets)).some(s => {
        try { return Array.from(s.cssRules || []).some(r => r.cssText && r.cssText.includes('.text-2xl')); }
        catch (e) { return false; }
      });
      console.log('[WebexTSFormsWidget] Has tailwind rule after fallback?', hasRule);
    } catch (err) {
      console.warn('[WebexTSFormsWidget] Fallback stylesheet injection failed:', err);
    }
  }

  connectedCallback() {
    console.log('[WebexTSFormsWidget] ✅ Connected to DOM');

    // --- Pick up properties that host may have set before element was upgraded ---
    try {
      const possibleTaskProps = ['taskId', 'TaskId', 'TaskID', 'taskid', 'task-id'];
      for (const pn of possibleTaskProps) {
        // host may have assigned a plain property (not attribute) before customElements.define
        if (Object.prototype.hasOwnProperty.call(this, pn) || typeof this[pn] !== 'undefined') {
          const v = this[pn];
          if (v != null) {
            console.log('[WebexTSFormsWidget] detected host-set property before upgrade:', pn, v);
            this._setTaskIdFromValue(v);
            break;
          }
        }
      }

      const possibleStoreProps = ['store', 'STORE', '$STORE'];
      for (const sp of possibleStoreProps) {
        if (Object.prototype.hasOwnProperty.call(this, sp) || typeof this[sp] !== 'undefined') {
          const sv = this[sp];
          if (sv != null) {
            console.log('[WebexTSFormsWidget] detected host-set store before upgrade:', sp);
            this._store = sv;
            break;
          }
        }
      }
    } catch (e) {
      console.warn('[WebexTSFormsWidget] error checking pre-set properties', e);
    }

    // create/open shadow root and mount inside it to isolate styling from host
    try {
      if (!this._shadow) {
        this._shadow = this.attachShadow({ mode: 'open' });
        // small wrapper inside shadow to host the React root
        this.container = document.createElement('div');
        this.container.className = 'tsforms-root';
        this._shadow.appendChild(this.container);
      }
    } catch (e) {
      console.warn('[WebexTSFormsWidget] Shadow DOM not available, falling back to light DOM', e);
      // fallback to previous behavior: create container in light DOM
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.className = 'tsforms-root';
        this.appendChild(this.container);
      }
    }

    // ensure sizing and fallback minHeight
    this.style.display = this.style.display || 'block';
    this.style.width = this.style.width || '100%';
    this.style.height = this.style.height || '100%';
    this.style.boxSizing = 'border-box';
    this.style.minHeight = this.style.minHeight || '0';

    // inject stylesheet into the shadow root (or document if shadow not used)
    this._injectStylesheet();

    // Attempt to relocate widget into the host's TS_FORMS tab panel if it's placed elsewhere
    try {
      // if already in correct panel nothing to do
      if (!this._isInTSFormsPanel()) {
        if (this._relocateToTSForms()) {
          // relocated synchronously
        } else {
          // watch for the panel to be created/inserted later
          this._relocateObserver = new MutationObserver(() => {
            if (this._relocateToTSForms()) {
              if (this._relocateObserver) { this._relocateObserver.disconnect(); this._relocateObserver = null; }
            }
          });
          this._relocateObserver.observe((this.ownerDocument || document).documentElement || (this.ownerDocument || document).body, { childList: true, subtree: true });
        }
      }
    } catch (e) { /* best-effort relocation; ignore errors */ }

    if (!this.root) {
      this.root = ReactDOM.createRoot(this.container);
    }
    this._renderApp();
  }

  _isInTSFormsPanel() {
    try {
      const panel = (this.ownerDocument || document).querySelector('md-tab-panel[visibility="TS_FORMS"]');
      if (!panel) return false;
      return panel.contains(this);
    } catch (e) { return false; }
  }

  _relocateToTSForms() {
    try {
      const doc = this.ownerDocument || document;
      // prefer explicit md-tab-panel with visibility attribute
      let target = doc.querySelector('md-tab-panel[visibility="TS_FORMS"]');
      // fallback: slot or named container
      if (!target) {
        const slotEl = doc.querySelector('[name="TS_FORMS"], [slot="TS_FORMS"]');
        if (slotEl) target = slotEl.closest('md-tab-panel') || slotEl.parentElement;
      }
      if (target && target !== this.parentElement) {
        // remove other instances to avoid duplicates
        Array.from(doc.querySelectorAll('webex-tsforms-widget')).forEach(w => { if (w !== this) w.remove(); });
        target.appendChild(this);
        return true;
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  _ensureFallbackStore() {
    if (typeof window === 'undefined') return;
    if (!window.STORE || typeof window.STORE !== 'object') {
      window.STORE = {};
    }
    if (!window.STORE.agentContact || typeof window.STORE.agentContact !== 'object') {
      window.STORE.agentContact = {};
    }
    // if we already have a resolved taskId prefer that
    if (this._taskId != null) {
      window.STORE.agentContact.selectedTaskId = this._taskId;
    } else if (this._store && this._store.agentContact && this._store.agentContact.selectedTaskId) {
      window.STORE.agentContact.selectedTaskId = this._store.agentContact.selectedTaskId;
    }
    console.log('[WebexTSFormsWidget] window.STORE after ensure:', window.STORE);
  }

  _notifyApp() {
    try {
      const store = this.store || window.STORE || null;
      const taskId = this.taskId;
      const taskInfo = (this._store && this._store.taskInfo) || {};
      const agentInfo = (this._store && this._store.agent) || null;

      // keep custom event for other listeners (always ok to emit)
      const detailPayload = { store, taskId, source: 'tsforms-widget' };
      this.dispatchEvent(new CustomEvent('store-ready', { detail: detailPayload }));
      window.dispatchEvent(new CustomEvent('store-ready', { detail: detailPayload }));

      // Only send TASK_DATA message if we have a real taskId (avoid overwriting App with null)
      if (taskId) {
        const messagePayload = {
          type: 'TASK_DATA',
          payload: {
            taskId,
            taskInfo,
            agentInfo
          }
        };
        // dispatch after render (caller ensures order) — this line sends the message
        window.dispatchEvent(new MessageEvent('message', { data: messagePayload }));
        console.log('[WebexTSFormsWidget] Dispatched TASK_DATA message', messagePayload);
      } else {
        console.log('[WebexTSFormsWidget] Skipping TASK_DATA message because taskId is null');
      }
    } catch (e) {
      console.warn('[WebexTSFormsWidget] Failed to dispatch events', e);
    }
  }

  _renderApp() {
    try {
      // ensure the app can read a store if it expects window.STORE
      this._ensureFallbackStore();

      // Render first so App mounts and attaches message listeners before we send TASK_DATA
      this.root.render(
        <React.StrictMode>
          <App store={window.STORE} taskId={this.taskId} />
        </React.StrictMode>
      );
      // Now notify listeners; _notifyApp will only send TASK_DATA when a taskId exists
      this._notifyApp();

      console.log('[WebexTSFormsWidget] Rendered App with taskId:', this.taskId, 'store:', window.STORE);
    } catch (err) {
      console.error('[WebexTSFormsWidget] ❌ Error rendering React app:', err);
      if (this.container) {
        this.container.innerHTML = `<div style="padding: 20px; color: red; font-family: monospace;">Error: ${err.message}</div>`;
      }
    }
  }

  disconnectedCallback() {
    console.log('[WebexTSFormsWidget] ❌ Disconnected from DOM');
    // cleanup React root if mounted
    if (this.root) {
      this.root.unmount();
      this.root = null;
      console.log('[WebexTSFormsWidget] ✅ React app unmounted');
    }
    // remove container element
    if (this.container) {
      if (this._shadow) {
        this._shadow.removeChild(this.container);
      } else {
        this.removeChild(this.container);
      }
      this.container = null;
      console.log('[WebexTSFormsWidget] ✅ Container element removed');
    }
    // cleanup shadow root
    if (this._shadow) {
      try {
        this._shadow.innerHTML = '';
        console.log('[WebexTSFormsWidget] ✅ Shadow root cleaned up');
      } catch (e) {
        console.warn('[WebexTSFormsWidget] Failed to clean up shadow root', e);
      }
    }
    if (this._relocateObserver) { try { this._relocateObserver.disconnect(); } catch(e){} this._relocateObserver = null; }
  }
}

customElements.define('webex-tsforms-widget', WebexTSFormsWidget);