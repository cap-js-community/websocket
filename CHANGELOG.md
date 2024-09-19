# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## Version 1.2.1 - 2024-10-xx

### Added

- Include or exclude defined list of users

### Fixed

- Allow empty PCP message in event definition
- Ignore not modeled pcp fields in payload serialization
- Correct annotation `wsCurrentUserInclude`/`currentUserInclude`
- Correct annotation `wsCurrentUserExclude`/`currentUserExclude`
- Fix documentations on some annotations

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
