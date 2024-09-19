using test from '../db/model';

@protocol: 'websocket'
service MainService {

    @websocket.broadcast: 'key'
    entity Header as projection on test.Header actions {
        action boundAction(num: Integer, text: String) returns String;
        function boundFunction(num: Integer, text: String) returns String;
    };
    entity HeaderItem as projection on test.HeaderItem;

    action unboundAction(num: Integer, text: String) returns String;
    function unboundFunction(num: Integer, text: String) returns String;

    function triggerCustomEvent(num: Integer, text: String) returns String;
    event customEvent {
        num: Integer;
        text: String;
    }

    function triggerCustomContextEvent(ID: UUID, num: Integer, text: String) returns String;
    function triggerCustomContextStaticEvent(ID: UUID, num: Integer, text: String) returns String;
    function triggerCustomContextMassEvent(ID1: UUID, ID2: UUID, num: Integer, text: String) returns String;
    function triggerCustomContextUserEvent(ID: UUID, num: Integer, text: String) returns String;
    function triggerCustomContextUserDynamicEvent(ID: UUID, num: Integer, text: String) returns String;
    function triggerCustomDefinedUserEvent(ID: UUID, num: Integer, text: String) returns String;
    function triggerCustomDefinedUserDynamicEvent(ID: UUID, num: Integer, text: String) returns String;
    function triggerCustomContextHeaderEvent(ID: UUID, num: Integer, text: String) returns String;

    function eventException() returns String;

    event customContextEvent {
        @websocket.context
        ID: UUID;
        num: Integer;
        text: String;
    }

    @websocket.context: ['context']
    event customContextStaticEvent {
        ID: UUID;
        num: Integer;
        text: String;
    }

    @websocket.context: 'context'
    event customContextStaticEvent2 {
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

    @websocket.user: 'includeCurrent'
    @websocket.currentUser.include
    event customContextUserIncludeEvent {
        @websocket.context
        ID: UUID;
        num: Integer;
        text: String;
        user: String;
    }

    event customContextUserIncludeDynamicEvent {
        @websocket.context
        ID: UUID;
        num: Integer;
        text: String;
        user: String;
        @websocket.user: 'includeCurrent'
        flag: Boolean;
    }

    @websocket.user: 'excludeCurrent'
    @websocket.currentUser.exclude
    event customContextUserExcludeEvent {
        @websocket.context
        ID: UUID;
        num: Integer;
        text: String;
        user: String;
    }

    event customContextUserExcludeDynamicEvent {
        @websocket.context
        ID: UUID;
        num: Integer;
        text: String;
        user: String;
        @websocket.user: 'excludeCurrent'
        flag: Boolean;
    }

    @websocket.user.include: ['alice']
    event customDefinedUserIncludeEvent {
        @websocket.context
        ID: UUID;
        num: Integer;
        text: String;
        user: String;
    }

    event customDefinedUserIncludeDynamicEvent {
        @websocket.context
        ID: UUID;
        num: Integer;
        text: String;
        user: String;
        @websocket.user.include
        flag: String;
    }

    @websocket.user.exclude: 'alice'
    event customDefinedUserExcludeEvent {
        @websocket.context
        ID: UUID;
        num: Integer;
        text: String;
        user: String;
    }

    event customDefinedUserExcludeDynamicEvent {
        @websocket.context
        ID: UUID;
        num: Integer;
        text: String;
        user: String;
        @websocket.user.exclude
        flag: array of String;
    }

    event customContextHeaderEvent {
        num: Integer;
        text: String;
    }

    event Header.created {
        ID: UUID;
        stock: Integer;
    }

    action wsConnect();
    action wsDisconnect(reason: String);
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