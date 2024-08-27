@ws
@ws.format: 'pcp'
@path: 'pcp'
service PCPService {

    @ws.pcp.action: 'MESSAGE'
    action sendNotification(@ws.pcp.message message: String, field1: String, field2: String, ![pcp-action]: String) returns Boolean;

    @ws.pcp.event
    @ws.pcp.message: 'this is the body!'
    event notification1 {
        field1: String;
        field2: String;
    }

    @ws.pcp.event
    @ws.pcp.action: 'MESSAGE2'
    event notification2 {
        @ws.pcp.message
        message: String;
        field1: String;
        field2: String;
    }
}