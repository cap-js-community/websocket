@ws
@ws.format: 'pcp'
@path: 'fns-websocket'
service FnsService {

    @ws.pcp.event
    @ws.pcp.message: ''
    event notify {
        text: String;
    }
}
