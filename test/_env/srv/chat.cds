@protocol: 'websocket'
@requires: 'WS_Chat'
service ChatService {

    @requires: 'WS_Chat'
    function message(text: String) returns String;

    event received {
        text: String;
    }
}
