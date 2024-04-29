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
    event identifierEvent {
        ID: UUID;
        @websocket.identifier
        identifier: String;
        text: String;
    }
}

