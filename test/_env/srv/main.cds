using test from '../db/model';

@protocol: 'websocket'
service MainService {

    type Result {
        name: String;
        code: String;
    }

    @websocket.broadcast: 'key'
    entity Header as projection on test.Header actions {
        action boundAction(num: Integer, text: String) returns Result;
        function boundFunction(num: Integer, text: String) returns Result;
    };
    entity HeaderItem as projection on test.HeaderItem;

    action unboundAction(num: Integer, text: String) returns Result;
    function unboundFunction(num: Integer, text: String) returns Result;

    function triggerCustomEvent(num: Integer, text: String) returns Result;
    event customEvent {
        num: Integer;
        text: String;
    }

    function triggerCustomContextEvent(ID: UUID, num: Integer, text: String) returns Result;
    function triggerCustomContextMassEvent(ID1: UUID, ID2: UUID, num: Integer, text: String) returns Result;

    event customContextEvent {
        @websocket.context
        ID: UUID;
        num: Integer;
        text: String;
    }

    event customContextMassEvent {
        @websocket.context
        IDs: array of UUID;
        num: Integer;
        text: String;
    }

    action wsConnect();
    action wsDisconnect();
    action wsContext(context: String, exit: Boolean);
}

@websocket
service MainService2 {
    entity Header as projection on test.Header;
}

@protocol: 'ws'
service MainService3 {
    entity Header as projection on test.Header;
}

@ws
service MainService4 {
    entity Header as projection on test.Header;
}

@protocol: [{ kind: 'websocket', path: 'xyz' }]
service MainService5 {
    entity Header as projection on test.Header;
}

@protocol: [{ kind: 'ws', path: '/xyz' }]
service MainService6 {
    entity Header as projection on test.Header;
}