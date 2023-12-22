# @cap-js-community/websocket

[![npm version](https://img.shields.io/npm/v/@cap-js-community/websocket)](https://www.npmjs.com/package/@cap-js-community/websocket)
[![monthly downloads](https://img.shields.io/npm/dm/@cap-js-community/websocket)](https://www.npmjs.com/package/@cap-js-community/websocket)
[![REUSE status](https://api.reuse.software/badge/github.com/cap-js-community/websocket)](https://api.reuse.software/info/github.com/cap-js-community/websocket)
[![Main CI](https://github.com/cap-js-community/websocket/actions/workflows/main-ci.yml/badge.svg)](https://github.com/cap-js-community/websocket/commits/main)

### [WebSocket adapter for CDS](https://www.npmjs.com/package/@cap-js-community/websocket)

> Exposes a WebSocket protocol via WebSocket standard or Socket.IO for CDS services.
> Runs in context of the [SAP Cloud Application Programming Model (CAP)](https://cap.cloud.sap/docs/)
> using [@sap/cds](https://www.npmjs.com/package/@sap/cds) (CDS Node.js).

## Getting Started

- Run `npm add @cap-js-community/websocket` in `@sap/cds` project
- Annotate a service, that shall be exposed via WebSocket using one of the following annotations:
  ```cds
  @ws
  @websocket
  @protocol: 'ws'
  @protocol: 'websocket'
  @protocol: [{ kind: 'websocket', path: 'chat' }]
  @protocol: [{ kind: 'ws', path: 'chat' }]
  ```
- Execute `cds-serve` to start server
- Access the service endpoint via WebSocket

## Usage

- Run `npm add @cap-js-community/websocket` in `@sap/cds` project
- Create a service to be exposed as websocket protocol
  ```cds
  @protocol: 'websocket'
  service ChatService {
    function message(text: String) returns String;
    event received {
      text: String;
    }
  }
  ```
- Connect with socket client
  ```js
  const socket = io("/chat", { path: "/ws" });
  ```
- Emit event
  ```js
  socket.emit("message", { text: "Hello World" });
  ```
- Listen to event
  ```js
  socket.on("received", (message) => {
    /* ... message.text */
  });
  ```

## Documentation

## WebSocket Server

The websocket server is exposed on `cds` object implementation-independent at `cds.ws` and implementation-specific at
`cds.io` or `cds.wss`. Additional listeners can be registered bypassing CDS definitions and runtime.
WebSocket server options can be provided via `cds.requires.websocket.options`.

Default protocol path is `/ws` and can be overwritten via `cds.env.protocols.websocket.path` resp. `cds.env.protocols.ws.path`;

#### WebSocket Service

Annotated services with websocket protocol are exposed at endpoint: `/ws/<service-path>`:

**Examples:**

- **WS**: `const socket = new WebSocket("ws://localhost:4004/ws/chat");`
- **Socket.IO**: `const socket = io("/chat", { path: "/ws" })`

#### WebSocket Event

Non-websocket services can contain events that are exposed as websocket events:

```cds
  @protocol: 'odata'
  @path: 'chat'
  service ChatService {
    entity Chat as projection on chat.Chat;
    function message(text: String) returns String;
    @websocket
    event received {
      text: String;
    }
  }
```

Although the service is exposed as an OData protocol at `/odata/v4/chat`, the service events annotated with `@websocket` or
`@ws` are exposed as websocket events under the websocket protocol path as follows: `/ws/chat`. Entities and operations
are not exposed, as the service itself is not marked as websocket protocol.

> Non-websocket service events are only active when at least one websocket enabled service is available (=> websocket protocol adapter active).

## Server Socket

Each CDS handler request context is extended to hold the current server `socket` instance of the event.
It can be accessed via `req.context.socket` or `cds.context.socket`.
Events can be directly emitted via the `socket` bypassing CDS runtime.

### Authentication & Authorization

Authentication only works via AppRouter using a UAA configuration, as the auth token is forwarded
via authorization header bearer token by AppRouter to backend instance. CDS middlewares process the auth token and
set the auth info accordingly. Authorization scopes are checked as defined in the CDS services `@requires` annotations and
authorization restrictions are checked as defined in the CDS services `@restrict` annotations.

#### Approuter

Authorization in provided in production by approuter component vis XSUAA auth.
Valid UAA bindings for approuter and backend are necessary, so that the authorization flow is working.
Locally, the following default environment files need to exist:

- `test/\_env/default-env.json`
  ```
  {
    "VCAP_SERVICES": {
      "xsuaa": [
        {
          ...
        }
      ]
    }
  }
  ```
- `test/\_env/approuter/default-services.json`
  ```
  {
    "uaa": {
      ...
    }
  }
  ```

Approuter is configured to support websockets in `xs-app.json` according to [@sap/approuter - websockets property](https://www.npmjs.com/package/@sap/approuter#websockets-property):

```
"websockets": {
  "enabled": true
}
```

#### Local

For local testing a mocked basic authorization is hardcoded in `flp.html/index.html`.

### Operations

Operations comprise actions and function in the CDS service that are
exposed by CDS service either unbound (static level) or bound (entity instance level).
Operations are exposed as part of the websocket protocol as described below.
Operation results will be provided via optional websocket acknowledgement callback.

> Operation results are only supported with Socket.IO (kind: `socket.io`) using acknowledgement callbacks.

#### Unbound

Each unbound function and action is exposed as websocket event.
The signature (parameters and return type) is passed through without additional modification.
Operation result will be provided as part of acknowledgment callback.

##### Special operations

The websocket adapter tries to call the following special operations on the service, if available in service:

- `wsConnect`: Callback to notify that a socket was connected
- `wsDisconnect`: Callback to notify that a socket was disconnected

#### Bound

Each service entity is exposed as CRUD interface via as special events as proposed [here](https://socket.io/get-started/basic-crud-application/).
The event is prefixed with the entity name and has the CRUD operation as suffix, e.g. `Books:create`.
In addition, also bound functions and actions are included into these schema, e.g. `Books:sell`.
The signature (parameters and return type) is passed through without additional modification.
It is expected, that the event payload contains the primary key information.
CRUD/action/function result will be provided as part of acknowledgment callback.

#### CRUD

Create, Read, Update and Delete (CRUD) actions are mapped to websocket events as follows:

- `<entity>:create`: Create an entity instance
- `<entity>:read`: Read an entity instance by key
- `<entity>:readDeep`: Read an entity instance deep (incl. deep compositions) by key
- `<entity>:update`: Update an entity instance by key
- `<entity>:delete`: Delete an entity instance by key
- `<entity>:list`: List all entity instances
- `<entity>:<operation>`: Call a bound entity operation (action/function)

Events can be emitted and the response can be retrieved via acknowledgment callback.

#### CRUD Broadcast Events

CRUD events that modify entities automatically emit another event after successful processing:

- `<entity>:create` -> `<entity>:created`: Entity instance has been updated
- `<entity>:update` -> `<entity>:updated`: Entity instance has been created
- `<entity>:delete` -> `<entity>:deleted`: Entity instance has been deleted

Because of security concerns, it can be controlled which data of those events is broadcast,
via annotations `@websocket.broadcast` or `@ws.broadcast`.

- Propagate only key (default): `@websocket.broadcast = 'key'`, `@ws.broadcast = 'key'`
- Propagate complete entity data: `@websocket.broadcast = 'data'`, `@ws.broadcast = 'data'`

### Examples

#### Todo (UI5)

The example UI5 `todo` application using Socket.IO can be found at `test/_env/app/todo`.

Example application can be started by:

- Basic Auth
  - Starting backend: `npm start`
  - Open in browser: http://localhost:4004/flp.html#Todo-manage
- XSUAA Auth:
  - Starting approuter: `npm run start:approuter`
  - Starting backend: `npm run start:uaa`
  - Open in browser: http://localhost:5001/flp.html#Todo-manage

#### Chat (HTML)

An example `chat` application using Socket.IO can be found at `test/_env/app/chat`.

Example application can be started by:

- Basic Auth:
  - WebSocket Standard: `npm start`
    - Browser: http://localhost:4004/chat_ws/index.html
  - Socket.IO: `npm run start:socketio`
    - Browser: http://localhost:4004/chat_socketio/index.html
- XSUAA Auth:
  - Approuter: `npm run start:approuter`
  - WebSocket Standard: `npm run start:uaa`
    - Browser: http://localhost:5001/chat_ws/index.html
  - Socket.IO: `npm run start:socketio:uaa`
    - Browser: http://localhost:5001/chat_socketio/index.html

### Unit-Tests

Unit-test can be found in folder `test` and can be executed via `npm test`;
The basic unit-test setup for WebSockets in CDS context looks as follows:

### WS

```
"use strict";

const cds = require("@sap/cds");
const WebSocket = require("ws");

cds.test(__dirname + "/..");

const authorization = `Basic ${Buffer.from("alice:alice").toString("base64")}`;

describe("WebSocket", () => {
  let socket;

  beforeAll((done) => {
    const port = cds.app.server.address().port;
    socket = new WebSocket(`ws://localhost:${ port }/ws/chat`, {
      headers: {
        authorization
      }
    });
  });

  afterAll(() => {
    cds.ws.close();
    socket.close();
  });

  test("Test", (done) => {
    socket.send(JSON.stringify({
      event: "event",
      data: {},
    }));
  });
});
```

#### Socket.io

```javascript
"use strict";

const cds = require("@sap/cds");
const ioc = require("socket.io-client");

cds.test(__dirname + "/..");

const authorization = `Basic ${Buffer.from("alice:alice").toString("base64")}`;

describe("WebSocket", () => {
  let socket;

  beforeAll((done) => {
    const port = cds.app.server.address().port;
    socket = ioc(`http://localhost:${port}/chat`, {
      path: "/ws",
      extraHeaders: {
        authorization,
      },
    });
    socket.on("connect", done);
  });

  afterAll(() => {
    cds.ws.close();
    socket.disconnect();
  });

  test("Test", (done) => {
    socket.emit("event", {}, (result) => {
      expect(result).toBeDefined();
      done();
    });
  });
});
```

### Adapters (Socket.IO)

An Adapter is a server-side component which is responsible for broadcasting events to all or a subset of clients.

#### Redis

Every event that is sent to multiple clients is sent to all matching clients connected to the current server
and published in a Redis channel, and received by the other Socket.IO servers of the cluster.

Redis adapter can be disabled by setting `cds.requires.websocket.adapter: false`.

##### WS

Per default a basic publish/subscribe redis adapter is active, if the app is bound to a Redis service.
The Redis channel key can be specified via `cds.requires.websocket.adapter.options.key`. Default value is `websocket`.

##### Socket.IO

The following Redis adapters for Socket.IO are supported out-of-the-box.

###### Redis Adapter

To use the Redis Adapter, the following steps have to be performed:

- Install Redis Adapter dependency:
  `npm install @socket.io/redis-adapter`
- Set `cds.requires.websocket.adapter.impl: "@socket.io/redis-adapter"`
- Application needs to be bound to a Redis instance
  - Locally a `default-env.json` file need to exist with redis configuration
- Redis Adapter options can be specified via `cds.requires.websocket.adapter.options`

Details:
https://socket.io/docs/v4/redis-adapter/

###### Redis Streams Adapter

To use the Redis Stream Adapter, the following steps have to be performed:

- Install Redis Streams Adapter dependency:
  `npm install @socket.io/redis-streams-adapter`
- Set `cds.requires.websocket.adapter.impl: "@socket.io/redis-streams-adapter"`
- Application needs to be bound to a Redis instance
  - Locally a `default-env.json` file need to exist with redis configuration
- Redis Streams Adapter options can be specified via `cds.requires.websocket.adapter.options`

Details:
https://socket.io/docs/v4/redis-streams-adapter/

### Deployment

This module also works on a deployed infrastructure like Cloud Foundry (CF) or Kubernetes (K8s).

An example Cloud Foundry deployment can be found in `test/_env`:

- `cd test/_env`
  - [manifest.yml](test/_env/manifest.yml)
- `npm run cf:push`
  - Prepares modules `approuter` and `backend` in `test/_env` and pushes to Cloud Foundry
    - Approuter performs authentication flow with XSUAA and forwards to backend
    - Backend serves endpoints (websocket, odata) and UI apps (runs on an in-memory SQlite3 database)

In deployed infrastructure, websocket protocol is exposed via Web Socket Secure (WSS) at `wss://` over an encrypted TLS connection.
For WebSocket standard the following setup in browser environment is recommended to cover deployed and local use-case:

```
const protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
const socket = new WebSocket(protocol + window.location.host + "/ws/chat")
```

## Support, Feedback, Contributing

This project is open to feature requests/suggestions, bug reports etc. via [GitHub issues](https://github.com/cap-js-community/websocket/issues). Contribution and feedback are encouraged and always welcome. For more information about how to contribute, the project structure, as well as additional contribution information, see our [Contribution Guidelines](CONTRIBUTING.md).

## Code of Conduct

We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone. By participating in this project, you agree to abide by its [Code of Conduct](CODE_OF_CONDUCT.md) at all times.

## Licensing

Copyright 2023 SAP SE or an SAP affiliate company and websocket contributors. Please see our [LICENSE](LICENSE) for copyright and license information. Detailed information including third-party components and their licensing/copyright information is available [via the REUSE tool](https://api.reuse.software/info/github.com/cap-js-community/websocket).
