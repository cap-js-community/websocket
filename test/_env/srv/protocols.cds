@protocol: 'websocket'
@path    : 'protocol-websocket'
service ProtocolServiceWebsocket {
    function trigger(text : String) returns String;

    event test {
        text : String;
    }
}

@protocol: 'ws'
@path    : 'protocol-ws'
service ProtocolServiceWS {
    function trigger(text : String) returns String;

    event test {
        text : String;
    }
}

@websocket
@path: 'protocol-annotation-websocket'
service ProtocolServiceAnnotationWebsocket {
    function trigger(text : String) returns String;

    event test {
        text : String;
    }
}

@ws
@path: 'protocol-annotation-ws'
service ProtocolServiceAnnotationWS {
    function trigger(text : String) returns String;

    event test {
        text : String;
    }
}


@protocol: [{
    kind: 'websocket',
    path: 'protocol-path'
}]
service ProtocolServiceWebsocketPath {
    function trigger(text : String) returns String;

    event test {
        text : String;
    }
}

@protocol: [{
    kind: 'ws',
    path: '/protocol-absolute-path'
}]
service ProtocolServiceWebsocketAbsolutePath {
    function trigger(text : String) returns String;

    event test {
        text : String;
    }
}

@protocol: [
    {
        kind: 'websocket',
        path: 'protocol-multiple-websocket'
    },
    {
        kind: 'ws',
        path: '/protocol-multiple-ws-absolute'
    }
]
service ProtocolServiceWebsocketMultiple {
    function trigger(text : String) returns String;

    event test {
        text : String;
    }
}
