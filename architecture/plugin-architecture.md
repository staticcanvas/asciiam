# Plugin extension architecture

Status: design complete; the public registration surface remains intentionally
uncommitted until the compatibility and security review is approved.

## Versioned contract

Plugins target a major API version and declare capabilities up front. Registration is
explicit and returns a disposable handle:

```js
asciiam.use({
  apiVersion: 1,
  name: 'example-mode',
  capabilities: ['mode'],
  setup(api) {
    return api.registerMode('example-mode', (cell) => cell.set('·', 0.8));
  },
});
```

The eventual TypeScript contract is equivalent to:

```ts
interface AsciiamPlugin {
  apiVersion: 1;
  name: string;
  capabilities: readonly ('mode'|'media'|'audio'|'renderer'|'toolbar'|'exporter')[];
  setup(api: AsciiamPluginApi): void | (() => void);
}
```

The API passed to `setup` is capability-scoped. A mode plugin cannot access DOM
elements, another instance's options, media URLs, or renderer internals unless its
declared capability explicitly grants that operation.

## Lifecycle and failure containment

Setup runs once, synchronously, and may return teardown. Teardown runs on explicit
unregister and before hot replacement. A plugin failure is isolated: registration
reports the error, removes partial registrations, and leaves the core instance usable.
Per-instance callbacks receive an abort signal and must not retain an instance after
`destroy()`.

Renderer plugins consume the backend-neutral cell/frame contract described in
`webgpu-feasibility.md`; they do not replace animation scheduling. Media and audio
providers own decode, permission, autoplay, and object-URL cleanup and expose only
normalized samples to the renderer.

## Serialization and security

Plugin options must provide a JSON-safe schema, defaults, validation, and a stable
serialization name. Functions, DOM nodes, streams, object URLs, and credentials are
never persisted or emitted by `renderUsage()`. Remote plugins are out of scope for
the first version: applications bundle and register trusted code under their own CSP.
No plugin may inject markup, fetch arbitrary URLs, or load executable decoder code
through the core API without an application-owned adapter.

## Compatibility rules

`apiVersion` is major-only for breaking changes; new optional methods are additive.
Plugin names and capability names are globally unique within an application. A plugin
must not depend on private fields or undocumented DOM IDs. The core maintains a small
compatibility adapter for one major version and rejects unsupported versions with a
diagnostic that includes the plugin name and supported range.

## Minimal reference plugin

The setup snippet above is the reference mode plugin. It is deliberately deterministic,
allocation-free in the cell callback, and has no browser dependencies. A future
reference media plugin must additionally demonstrate abortable loading and object-URL
revocation; an audio plugin must demonstrate user-gesture start, pause/resume, analyser
normalization, and teardown before either is shipped as a built-in.
