using test from '../db/model';

@path: 'odata'
service ODataService {

    entity Header as projection on test.Header;
    entity HeaderItem as projection on test.HeaderItem;

    function message(text: String) returns String;

    @ws
    event received {
        text: String;
    }

    @websocket
    event receivedToo {
        text: String;
    }

    @websocket
    @websocket.identifier: []
    @websocket.identifier.include: []
    event identifierIncludeEvent {
        ID: UUID;
        @websocket.identifier
        @websocket.identifier.include
        identifier: String;
        text: String;
    }

    @websocket
    @websocket.identifier: []
    @websocket.identifier.include: []
    event identifierIncludeContextEvent {
        ID: UUID;
        @websocket.identifier
        @websocket.identifier.include
        identifier: String;
        @websocket.context
        text: String;
    }

    @websocket
    @websocket.identifier.exclude: []
    event identifierExcludeEvent {
        ID: UUID;
        @websocket.identifier.exclude
        identifier: String;
        text: String;
    }

    @websocket
    @websocket.identifier.exclude: []
    event identifierExcludeContextEvent {
        ID: UUID;
        @websocket.identifier.exclude
        identifier: String;
        @websocket.context
        text: String;
    }
}

