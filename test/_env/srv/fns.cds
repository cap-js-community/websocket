@ws
@ws.format: 'pcp'
@path: 'fns-websocket'
service FnsService {

    action markAllAsRead();

    @ws.pcp.event
    @ws.pcp.message: ''
    event notify {
        text: String;
    }
}
