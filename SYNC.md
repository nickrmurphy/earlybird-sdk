# Synchronization Strategy

## Overview

Early Bird SDK uses a hybrid approach combining HTTP-based data sync with WebSocket notifications for efficient, real-time synchronization across devices.

## Architecture

### Core Principle
- **Data flows through HTTP** - All actual sync operations use REST endpoints
- **Notifications flow through WebSocket** - Lightweight messages to trigger sync
- **Graceful degradation** - Falls back to polling if WebSocket fails

### Components

```
Client A ────HTTP POST───→ Server ────WebSocket───→ Client B
         (send changes)            (notify to sync)
                                        │
Client B ────HTTP GET────→ Server ←─────┘
         (fetch changes)
```

## Implementation Plan

### Phase 1: HTTP-Only Sync
Start with simple REST endpoints for data synchronization:

- `POST /api/stores/{storeId}/sync` - Push local changes, get remote changes
- `GET /api/stores/{storeId}/changes?since={version}` - Fetch incremental updates
- Standard HTTP status codes and JSON payloads

### Phase 2: WebSocket Notifications
Add real-time notification layer:

- `WS /api/sync/notifications` - Subscribe to store change notifications
- Clients subscribe to specific stores on connection
- Server broadcasts lightweight notifications when stores change
- Clients trigger HTTP sync when notified

### Phase 3: Optimization
- Batching multiple store notifications
- Exponential backoff for failed connections
- Adaptive polling intervals based on activity

## Message Formats

### HTTP Sync Request
```json
{
  "lastKnownVersion": 42,
  "changes": [
    {
      "id": "change-123",
      "timestamp": 1640995200000,
      "operation": "set",
      "path": ["users", "user-456", "name"],
      "value": "Alice"
    }
  ]
}
```

### HTTP Sync Response
```json
{
  "currentVersion": 45,
  "changes": [
    {
      "id": "change-124",
      "timestamp": 1640995300000,
      "operation": "set",
      "path": ["users", "user-789", "name"],
      "value": "Bob"
    }
  ]
}
```

### WebSocket Notification
```json
{
  "type": "store_changed",
  "storeId": "project-456",
  "version": 45,
  "timestamp": 1640995300000
}
```

## Fallback Strategy

### WebSocket Connection Loss
1. Detect connection failure
2. Fall back to periodic HTTP polling
3. Use exponential backoff (start at 30s, max 5min)
4. Attempt WebSocket reconnection every 2 minutes

### Polling Intervals
- **Active user**: 30 seconds
- **Idle user**: 5 minutes
- **Background tab**: 15 minutes
- **WebSocket connected**: No polling needed

## Benefits

### Development
- **Simple debugging** - All data operations use standard HTTP tools
- **Incremental adoption** - Can start HTTP-only, add WebSocket later
- **Stateless server** - HTTP endpoints remain cacheable and simple

### Performance
- **Low bandwidth** - WebSocket only sends tiny notifications
- **Selective sync** - Only fetch stores that actually changed
- **Efficient batching** - Multiple changes in single HTTP request

### Reliability
- **Graceful degradation** - Works even with poor connections
- **Conflict resolution** - CRDT ensures eventual consistency
- **Offline support** - Changes queue locally until connection restored

## Security Considerations

- WebSocket authentication via JWT tokens
- Store-level permissions enforced on HTTP endpoints
- Rate limiting on both HTTP and WebSocket connections
- Input validation on all sync payloads

## Testing Strategy

- **Unit tests** - Mock HTTP responses for sync logic
- **Integration tests** - Test WebSocket + HTTP combination
- **Offline tests** - Verify fallback behavior
- **Load tests** - Ensure WebSocket can handle many concurrent connections

---

*This strategy aligns with Early Bird's philosophy of simplicity and web-first design while providing efficient real-time synchronization.*
