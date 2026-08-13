# Asciiam - Development Notes and Workflow Instructions

## **Tasklist**

Honest gap list. Nothing here is required for the tool to work — it runs and degrades
safely — but these are the things standing between "solid prototype" and "ship to
strangers with confidence."

---

## **REPO INSTRUCTIONS**

**TASKS:** Work through task items in the **`devtracker-pending.md`** file. If a task is not in its proper category, move it to the correct section. If a task item is incomplete, relies on a temporary workaround rather than best practices, or represents a simple implementation instead of the ideal advanced method, add an inline comment block starting with `> **After Thought:**` or `> **Note!**` detailing alternatives, potential issues, or future design considerations.

**SKILL HARNESS:** Refer to the `fluent-ui-v1` skill for all UI/UX tasks. Refer to the `phellams-aa` skill for PowerShell automation, TUI design, and C# compilation tasks. Refer to the `phellams-htpine` skill for HTMX and Alpine.js dashboard development. Refer to the `context-source/` directory for extended project knowledge and architectural lessons learned.

**VERSIONING:** Refer to the `fluent-ui-v1` versioning strategy for SemVer tags and releases. **Git Workflow:** The build version can only be incremented by `major`, `minor`, or `patch` levels; otherwise, the validation process will fail.

**CHANGELOG:** Keep an active `CHANGELOG.md` file referring to `fluent-ui-v1` standards.

**CONTEXT DIRECTORY:** Use the `context-source/` folder to store AI-related PDRs, context files, and lessons learned. Maintain `extended-knowledge-lessons-learned-building-powershell-asciiam.md` as the active log of project insights, which will be compiled into the v1 knowledge base for future runs.

**DEV ENVIRONMENT AUTOMATION (`devt`):** Use the integrated `devt` utility module located at [tools/devt](file:///mnt/g/devspace/projects/web/_repo/staticcanvas/asciiam/tools/devt) to compile tasks, sync checkmarks/notes, generate changelogs, diff branches, and automate commit validation.

## **GIT WORKFLOW:**

**BRANCHES:** Create a new branch (e.g., `feat/`, `fix/`, etc.) from `develop` or spin up an agent worktree branch under `agent/`. Use descriptive names like `feat/component/icon-improve-hash`.

**MERGE REQUESTS:** Create a Draft Merge Request (MR) in GitLab targeting `develop`. Include details on the planned change, implementation strategy, and expected outcomes.

**LABELS & ASSIGNMENT:** Assign MRs and tasks to the user specified in the git configuration. Add appropriate workflow labels and delete the source branch after merging.

**BRANCH REMINDERS:** Run `git pull origin develop` before creating a new branch or worktree directory.

**OUTSTANDING COMMITS:** If a feature is complete, commit and push outstanding changes.

**_DIFFICULTY:_** 🔴 - `very-hard` | 🟠 - `moderate` | 🟡 - `easy` | 🟢 - `very-easy`
**_SCOPE:_** 💡 - `Concepts-skip-from-task-list-unless-asked` | 🌟 - `feature-appears-only-on-primary-tasks` | 🦀 - `bug-appears-only-on-primary-bug` | 🪲 - `bug-fixed-appears-only-on-primary-bugfix` | 🩹 - `fix-only-appears-on-primary-tasks`
**_COMPLETE:_** ⏳ - `pending/not-started` | 🌀 - `working-on` | ✔️ - `partially-complete` | ❓ - `working-but-with-issues` | ✅ - `complete`
**_PRIORITY:_** 0️⃣ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟 - `priority-of-tasks`

> Tasks should follow this convention:
>
> - [ ] {{DIFFICULTY}} {{SCOPE}} {{COMPLETE}} {{PRIORITY}} **TASK CATEGORY** - Description
>   - [ ] {{DIFFICULTY}} {{SCOPE}} {{COMPLETE}} {{PRIORITY}} **_SUB-TASK CATEGORY_** - Description
>     > **_NOTE!_** - Note content

---
### **Critical Path (priority-1)**

- [ ] 🟠💡⏳1️⃣ **Critical** - **Reduce repetitive web-utility navigation.** Continue the toolbar workflow audit
      using real repeated authoring sessions rather than changing control order by taste.
  - [x] 🟡🌟✅1️⃣ **Critical** - Removed Reset from the nested Advanced workflow.
  - [x] 🟡🌟✅1️⃣ **Critical** - Made Documentation, About, and FPS direct, consistently sized stage actions.
  - [ ] 🟡🌟⏳1️⃣ **Critical** - Validate whether lower-frequency controls need a persistent inspector or command
        surface; preserve mobile bounds, roving focus, and current status visibility.
### **Distribution Readiness (priority-2)**

- [ ] 🟠🌟⏳2️⃣ **Distribution** - **Real-browser verification.** Run a manual visual pass in current
      Chrome/Firefox/Safari; DOM emulation verifies lifecycle behavior but cannot
      validate browser canvas rasterization or font metrics.
- [ ] 🟠🌟⏳2️⃣ **Distribution** - **Safari-specific canvas text rendering unverified.** Font metrics and subpixel
      text positioning have known quirks in Safari; the quantized-font-level approach
      hasn't been visually checked there.
### **Engineering Backlog (priority-3)**

- [ ] 🟠🌟⏳3️⃣ **Backlog** - **`fadeIn` and `image` modes don't expose fine-grained timing controls** (sweep
      duration, per-character delay curve) — currently hardcoded constants
      (`totalDuration = 2.2`, etc.). Fine for the presets, limiting if someone wants a
      slower/faster intro without digging into source.
- [ ] 🟠🌟⏳3️⃣ **Backlog** - **No built-in way to composite multiple modes** (e.g. `current` texture plus a
      `wave` sweep on top). Currently one mode at a time; layering would mean running
      two instances on stacked canvases, which works but isn't documented as a
      pattern.
- [ ] 🟠🌟⏳3️⃣ **Backlog** - **Matrix mode column state doesn't survive a `setOption('density', …)` change**
      cleanly mid-run — it reinitializes via `_resize()`, so an in-progress rain
      column resets rather than continuing at the new density. Minor visual hitch,
      not a bug.

- [ ] 🟠💡⏳2️⃣ **Engineering Backlog** - WebGL2 3D feasibility gate. Build a private typed-array mesh prototype that projects points, edges, and flat triangles into cell-resolution depth and luminance buffers; benchmark each stage against the budgets in architecture/webgl2-3d-feasibility.md before exposing an API.
- [ ] 🔴🌟⏳3️⃣ **Engineering Backlog** - Dependency-free 3D-to-ASCII mesh mode. After the feasibility gate passes, add MeshData validation, camera and transform controls, points/wireframe/solid styles, procedural primitives, Canvas fallback parity, lifecycle cleanup, and TypeScript contracts.
- [ ] 🟠🌟⏳3️⃣ **Engineering Backlog** - 3D feature verification and documentation. Add allocation and bundle-size checks, browser benchmarks, regression coverage, README/API/architecture guidance, live docs examples, and a bounded web-utility control surface.
- [ ] 🔴🌟⏳3️⃣ **Engineering Backlog** - Core glTF 2.0 and GLB v2 loading. After MeshData stabilizes, add dependency-free parsing for scenes, nodes, transforms, buffers, accessors, sparse data, and point/line/triangle primitives; normalize them into MeshData with abortable URL, Blob, ArrayBuffer, external-buffer, progress, validation, cleanup, types, tests, and documentation support. Do not bundle or expose decoder hooks; reject assets requiring Draco, Meshopt, or another unsupported compression extension with a clear diagnostic before mesh allocation.
- [ ] 🟠💡⏳4️⃣ **Engineering Backlog** - Deferred mesh-compression research. After uncompressed glTF/GLB support has production measurements, benchmark Draco and Meshopt transfer size, decoder payload, initialization, decode time, peak memory, retained memory, and render-ready latency on desktop and mobile. Keep all codec code and dependencies out of released artifacts unless a later evidence-based architecture review explicitly approves a change.

### **Deferred Concepts (priority-4)**

- WebGPU backend. WebGL2 now provides the selectable GPU path with much broader browser
  coverage, while Canvas 2D remains the compatibility and explicitly selectable CPU
  backend. A separate WebGPU implementation would currently duplicate those paths.
- Server-side rendering / static ASCII export. This is a live animation engine, not an
  ASCII-art generation tool for static output.

### **Completed UI Audit (priority-5)**

**Visual polish**

**Layout and information hierarchy**
**Controls UX**
**Accessibility**
**Popover controls and image extensions (2026-08-11)**
If you hit a real bug in production use (as opposed to the theoretical gaps above),
that's higher priority than anything on this list — flag it and it jumps the queue.
