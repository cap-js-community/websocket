---
description: Add Fiori Event-Driven Side Effects via WebSocket to a CAP Node.js OData service
argument-hint: Service name and entity to add side effects to (e.g. "CatalogService Books stock")
---

# Add Event-Driven Side Effects to a CAP Node.js Service

You are helping a developer add Fiori Event-Driven Side Effects to an existing CAP Node.js OData service using the `@cap-js-community/websocket` package. Side effects allow the Fiori Elements UI to automatically refresh specific properties when server-side events are emitted via WebSocket.

## Input

The user provides: $ARGUMENTS

Parse the arguments to identify:
- **Service name**: The CDS service to enhance (e.g. `CatalogService`)
- **Entity name**: The entity whose properties should refresh (e.g. `Books`)
- **Target properties**: Which properties to refresh on the UI (e.g. `stock`)

If any of these are unclear or missing, ask the user before proceeding.

---

## Phase 1: Discovery — Understand the Existing Service

**Actions**:
1. Find the CDS service definition file (`.cds`) for the named service
2. Find the corresponding service implementation file (`.js`)
3. Find the `package.json` to check dependencies
4. Identify the entity definition and its key fields
5. Identify existing actions or event handlers that modify the target properties

Present a summary of what you found and confirm with the user before proceeding.

---

## Phase 2: Add the WebSocket Dependency

Check if `@cap-js-community/websocket` is already in `package.json` dependencies. If not, add it:

```json
"dependencies": {
  "@cap-js-community/websocket": "^1"
}
```

Do NOT run `npm install` — let the user handle that.

---

## Phase 3: Annotate the CDS Service for WebSocket Side Effects

Apply the following changes to the CDS service definition file, in this exact order:

### 3a. Add WebSocket and OData protocol annotations to the service

Add `@ws`, `@odata`, and `@Common` annotations before the `service` keyword:

```cds
@ws
@odata
@Common: {
  WebSocketBaseURL: 'ws/<service-path>',
  WebSocketChannel #sideEffects: 'sideeffects',
}
service <ServiceName> {
  ...
}
```

Where `<service-path>` is the lowercase service path segment (e.g. `catalog` for `CatalogService`). The `WebSocketBaseURL` path must be relative (no leading slash) so it resolves correctly in Fiori Elements, especially in SAP Build Work Zone context.

### 3b. Add `@Common.SideEffects` annotation to the target entity

Add the side effects annotation directly before the entity definition, specifying which event triggers a refresh and which properties are affected:

```cds
@Common.SideEffects #<qualifierName>: {
  SourceEvents    : ['<eventName>'],
  TargetProperties: ['<property1>', '<property2>']
}
entity <EntityName> as projection on ...
```

Choose a meaningful qualifier name (e.g. `#stockUpdated`, `#nameChanged`) and event name (e.g. `stockChanged`, `nameUpdated`).

### 3c. Define the WebSocket event

Add a CDS event definition inside the service, annotated for PCP side effects via the `@ws` mixin shorthand:

```cds
@ws: { $value, format: 'pcp', pcp: { sideEffect } }
event <eventName> {
  sideEffectSource : String;
};
```

The `sideEffectSource` element carries the entity path (e.g. `/Books(42)`) so Fiori Elements knows which instance changed.

**Mixin annotation explained**:
- `$value`: Expose the event value
- `format: 'pcp'`: Use Push Channel Protocol format
- `pcp: { sideEffect }`: Mark this event as a Fiori side effect in PCP messages

---

## Phase 4: Emit the Event in the Service Implementation

In the `.js` service implementation file, find the handler that modifies the target property and add an `emit` call after the modification:

```js
this.emit("<eventName>", {
  sideEffectSource: `/<EntityName>(${keyValue})`,
});
```

**Key rules**:
- The `sideEffectSource` value must be a valid OData entity path relative to the service, e.g. `/Books(42)` or `/Header(ID='some-guid')`
- The entity key format must match the OData key format (integer keys without quotes, UUID/string keys with quotes)
- Place the `emit` in an `after` handler or after the data modification completes, so the UI refreshes with the latest data
- The emit can be fire-and-forget (no `await` needed) since it is a notification, not a data operation

---

## Phase 5: Summary

Present the changes made:

1. **package.json** — Added `@cap-js-community/websocket` dependency (if not already present)
2. **CDS service definition** — Added:
   - `@ws`, `@odata`, `@Common` service-level annotations for WebSocket connectivity
   - `@Common.SideEffects` annotation on the entity linking the event to target properties
   - WebSocket event definition with PCP side effect format
3. **JS service implementation** — Added `emit` call to broadcast the side effect event

Remind the user to:
- Run `npm install` to install the WebSocket dependency
- The Fiori Elements V4 app will automatically pick up the side effects via the OData V4 metadata annotations
- The WebSocket connection is established automatically by Fiori Elements when the `@Common.WebSocketBaseURL` annotation is detected
- Reference: [Fiori Elements Event-Driven Side Effects](https://ui5.sap.com/#/topic/27c9c3bad6eb4d99bc18a661fdb5e246)

---

## Example: Complete Transformation

**Before** (plain OData service):
```cds
service CatalogService {
  entity Books as projection on my.Books { * }
    actions {
      action submitOrder(quantity : Books:stock);
    };
}
```

```js
this.after(Books.actions.submitOrder, async (_, req) => {
  const { ID: book } = req.params[0];
  await this.emit("OrderedBook", { book, buyer: req.user.id });
});
```

**After** (with WebSocket side effects):
```cds
@ws
@odata
@Common: {
  WebSocketBaseURL: 'ws/catalog',
  WebSocketChannel #sideEffects: 'sideeffects',
}
service CatalogService {
  @Common.SideEffects #stockUpdated: {
    SourceEvents    : ['stockChanged'],
    TargetProperties: ['stock']
  }
  entity Books as projection on my.Books { * }
    actions {
      action submitOrder(quantity : Books:stock);
    };

  @ws: { $value, format: 'pcp', pcp: { sideEffect } }
  event stockChanged {
    sideEffectSource : String;
  };
}
```

```js
this.after(Books.actions.submitOrder, async (_, req) => {
  const { ID: book } = req.params[0];
  await this.emit("OrderedBook", { book, buyer: req.user.id });

  this.emit("stockChanged", {
    sideEffectSource: `/Books(${book})`,
  });
});
```

This results in a PCP message sent via WebSocket:
```
pcp-action:MESSAGE
pcp-channel:sideeffects
sideEffectSource:/Books(42)
sideEffectEventName:stockChanged
serverAction:RaiseSideEffect
```

Fiori Elements V4 apps listening on the service and channel will automatically refresh the `stock` property for the affected `Books` entity instance.
