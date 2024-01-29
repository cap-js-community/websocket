# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## Version 0.6.0 - 2024-02-xx

### Fixed

- tbd

## Version 0.5.0 - 2024-01-29

### Added

- Provide user context in examples and tests, to verify authorization flow
- Introduce optional `context` concept to broadcast to a client subset via annotation `@websocket.context` or `@websocket.ws`

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
