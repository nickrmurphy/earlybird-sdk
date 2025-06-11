# Early Bird SDK

A simple, type-safe storage solution for local-first apps that works natively in browsers. Built on CRDTs for conflict-free sync with zero external dependencies.

## Key Benefits
- 🌐 **Web-first** - Pure browser APIs, no compilation complexity
- 🔄 **Conflict-free sync** - Automatic resolution across devices using CRDTs
- 📝 **Type-safe** - Full TypeScript support with Standard Schema validation
- 🪶 **Zero dependencies** - No external runtime dependencies required
- 📁 **Human-readable** - Files stored as JSON for easy debugging

## Philosophy
- Minimal dependencies
- Simplicity through thoughtful design
- Unapologetically web-first
- Unapologetically client-first

## Architecture

Three simple layers:

1. **Storage Adapter** - Filesystem abstraction (i.e. Capacitor, NodeFS, etc.)
2. **CRDT Store** - Document store with conflict-free field updates
3. **Sync Client** - High-level operations and sync coordination

**See [the proof of concept branch](https://github.com/nickrmurphy/earlybird-sdk/tree/poc) for a working example of the full stack implementation.**
