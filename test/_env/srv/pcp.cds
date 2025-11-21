@ws
@ws.format: 'pcp'
@path: 'pcp'
service PCPService {

    @ws.pcp.action: 'MESSAGE'
    action sendNotification(@ws.pcp.message message: String, field1: String, field2: String, @ws.ignore field3: String, ![pcp-action]: String) returns Boolean;

    @ws.pcp.action: 'MESSAGE_CONTEXT'
    action sendNotificationWithContext() returns Boolean;

    @ws.pcp.action: 'triggerSideEffects'
    action triggerSideEffects();

    @ws.pcp.action: 'wsContext'
    action wsContext(context: String, exit: Boolean, reset: Boolean);

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

    @ws.pcp.event
    @ws.pcp.message: ''
    event notification3 {
        @ws.pcp.action
        action: String;
        field1: String;
        field2: String;
    }

    @ws.pcp.event
    event notification4 {
        action: String;
        field1: String;
        field2: String;
        @ws.ignore
        field3: String;
    }

    @ws.pcp.sideEffect
    @ws.pcp.event: 'sideEffect1'
    @ws.pcp.channel: 'amc\://notification/notify'
    event sideEffect1 {
        sideEffectSource: String;
    }
}