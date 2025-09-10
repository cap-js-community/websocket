# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## Version 1.7.4 - 2025-10-xx

### Fixed

- Adjust logging component name

## Version 1.7.3 - 2025-09-08

### Fixed

- Fix `ias` auth strategy, set `req.hostname`

## Version 1.7.2 - 2025-08-04

### Fixed

- Propagate headers to all places

### Added

- Server websocket client CDS service

## Version 1.7.1 - 2025-07-03

### Fixed

- Adapter loading for Socket.IO

## Version 1.7.0 - 2025-06-03

### Fixed

- CDS 9 compatibility
- Fix typing definition file

## Version 1.6.4 - 2025-05-05

### Fixed

- Security: Dynamic method call

## Version 1.6.3 - 2025-04-10

### Added

- Adopt common module

## Version 1.6.2 - 2025-04-02

### Fixed

- Compatibility for `wsContext` to map array value of `context` to `contexts`
- Housekeeping

## Version 1.6.1 - 2025-03-04

### Fixed

- Split variadic parameter `context` of `wsContext` into `context` for single and `contexts` for multiple contexts
- Register `ws` protocols in CDS env instead of `cds-plugin.js`
- Fix `wsDisconnect` operation without reason parameter
- Document `wsDisconnect` with reason parameter
- Improve Redis connection check logging

## Version 1.6.0 - 2025-02-03

### Fixed

- Check authorization and service path before websocket upgrade
- Reject connection to non-websocket protocol paths
- Support unauthenticated requests via option `cds.requires.auth.restrict_all_services: false`
- Support privileged user, e.g. via `dummy` auth strategy
- Fix call to `wsDisconnect` operation without reason parameter
- Cast reason parameter for `wsDisconnect` operation to string
- Fill `baseUrl` for websocket requests (necessary for request context specific model in toggle/extensibility scenario)
- Clean websocket context from internal read-only attributes
- Normalize client identifier on upgrade request `request.id`
- Return 404 when url cannot be associated with a service in upgrade request
- Parse string values according to operation parameter type in custom formats (e.g. `pcp`)

### Added

- `reset` all contexts via `wsContext` flag `reset: true`
- Support multiple contexts in `wsContext` with array value for `context`
- Document usage of `srv.tx(req).emit` for tenant and user propagation in WS broadcasting
- Document usage of `wsContext` for format `pcp` and `cloudevents`

## Version 1.5.2 - 2025-01-10

### Fixed

- Fix fallback to redis configuration `cds.requires.redis`
- Check for authenticated user during websocket connection (no anonymous)
- Improve start log `using websocket` including adapter information
- Improve server shutdown redis client handling

## Version 1.5.1 - 2025-01-09

### Fixed

- Improve redis connection check
- Improve connection error handling (e.g. unauthorized)
- Consolidate dependencies

## Version 1.5.0 - 2025-01-08

### Fixed

- Redis lookup for websocket via CDS env `cds.requires.redis-websocket`
- Reworked redis client connection logic
- Document options

## Version 1.4.1 - 2024-12-02

### Fixed

- Redis adapter error handling

## Version 1.4.0 - 2024-11-04

### Changed

- Socket.IO implementation does not use server `path` option anymore, in alignment with kind `ws`
- Use `io("/ws/chat")` instead of `io("/chat", { path: "/ws" })`

### Fixed

- Support for http conform headers (`x-ws` and `x-websocket`)
- Revise error handling for websocket events
- Fix for operations without parameters
- Fix support for absolute service paths
- Update documentation

## Version 1.3.0 - 2024-10-07

### Added

- Provide event headers to formatter
- Support exclusion of event contexts
- Include or exclude defined list of users
- Add support for Cloud Events with format `cloudevent` resp. `cloudevents`
- Overrule path of websocket event via `@websocket.path` or `@ws.path` for non-websocket services
- Overrule format of websocket event via `@websocket.format` or `@ws.format` for non-websocket services
- Ignore event elements or operation parameters with `@websocket.ignore` or `@ws.ignore`

### Fixed

- Improve documentation and examples
- Allow empty PCP message in event definition
- Optimization of client determination for kind `ws`
- Ignore not modeled PCP fields in payload serialization
- Fix annotations value derivation for non-websocket service events
- Fix annotations `wsCurrentUserInclude`, `currentUserInclude`, `wsCurrentUserExclude`, `currentUserExclude`

## Version 1.2.0 - 2024-09-04

### Added

- Support SAP Push Channel Protocol (PCP)
- Option to include or exclude identifiers
- Option to include or exclude current user
- Better CDS context handling
- CDS 8.2 compatibility

## Version 1.1.1 - 2024-08-01

### Fixed

- CDS 8.1 compatibility

## Version 1.1.0 - 2024-07-16

### Added

- CDS 8 compatibility
- CI Matrix Test Node 22

## Version 1.0.2 - 2024-06-24

### Fixed

- Use `cds.context` instead of `ws.request` to derive user and tenant
- Add `cds.requires.kinds` for websockets and merge config
- Pass all `cds.env.websocket` config to adapter and redis implementation
- Streamline `cds.env` access in socket and redis implementation
- Refactor unit-tests to be grouped by implementation

## Version 1.0.1 - 2024-06-03

### Fixed

- Fix access to undefined request user for unauthenticated requests
- Redis lookup via custom `vcap` environment configuration

## Version 1.0.0 - 2024-05-03

### Added

- First major release
- Exclude a client socket instance via a consumer-defined identifier

### Fixed

- Clear existing redis clients before shutdown
- Call unknown adapter implementations for Socket.IO
- Normalize logging layer

## Version 0.9.0 - 2024-04-02

### Fixed

- Add option to activate Redis adapter in other (non-local) environments (e.g. Kyma)
- Fix Redis re-connect behavior to prevent Redis overload
- Pass adapter configurations to Redis client creation

## Version 0.8.1 - 2024-03-04

### Added

- Allows to provide event emit headers to dynamically control websocket processing without annotations

### Fixed

- Describe the usage of CDS persistent outbox for websocket events

## Version 0.8.0 - 2024-02-15

### Added

- Introduce optional `user` concept to broadcast event, except to current context user via annotation `@websocket.user` or `@ws.user`
- Allow to suppress CRUD event broadcast via `@websocket.broadcast = 'none'` or `@ws.broadcast = 'none'`
- Match CRUD broadcast event with CDS service event to filter broadcast data

### Fixed

- Fix leakage of internal processing information to websocket clients

## Version 0.7.0 - 2024-02-09

### Added

- Allow custom server implementations via `cds.websocket.impl`
- Allow custom adapter implementations via `cds.websocket.adapter.impl` (kind `ws` only)
- Allow processing of multiple event contexts by annotating event type elements of `many` or `array of` type
- Support for type `date` event contexts as ISO string representation
- Support for type `object` event contexts as JSON stringified representation

## Version 0.6.1 - 2024-01-31

### Fixed

- Correct version confusion (0.5.1 uses 0.6.0 in package.json)

## Version 0.5.1 - 2024-01-31

### Fixed

- Fix message wrapping for Redis distribution (`kind: ws`)

## Version 0.5.0 - 2024-01-29

### Added

- Provide user context in examples and tests, to verify authorization flow
- Introduce optional `context` concept to broadcast to a client subset via annotation `@websocket.context` or `@ws.context`

### Fixed

- Respect tenant isolation for event broadcasting
- Fix maxListeners issue for `ws` implementation
- Refactor middlewares and authorization check
- Change `cds.ws` to point to CDS websocket server (not the native implementation, use `cds.wss` or `cds.io` for that)

## Version 0.4.0 - 2024-01-26

### Added

- Option to disable websockets via env configuration `cds.websocket: false`
- Add configuration schema for websocket environment via `cds.schema` for CDS plugin

### Fixed

- Change `cds` websocket env from `cds.requires.websocket` to `cds.websocket` accessible via `cds.env.websocket`

## Version 0.3.0 - 2024-01-22

npm

### Added

- Add overview graphic
- Disable Redis per default locally, option to enable it
- Option to broadcast CRUD post-events to all sockets via `@websocket.broadcast.all` or `@ws.broadcast.all`

### Fixed

- Remove Redis broadcast for kind `ws` on message receiving

## Version 0.2.0 - 2024-01-11

### Fixed

- Broadcast service events without connected sockets via Redis
- Document base websocket server class

## Version 0.1.2 - 2024-01-08

### Fixed

- Set websocket default kind to `ws`
- Mock request response more complete
- More robust setup and error handling
- Redis off per default
- Refactoring

## Version 0.1.1 - 2023-12-22

### Added

- Websocket events in non-websocket services
- Support multiple endpoints

## Version 0.1.0 - 2023-12-21

### Added

- Initial release
