@ws
@ws.format: 'cloudevents'
@path     : 'cloudevents'
service CloudEventsService {

    @open
    type CloudEventDataType : {};

    @ws.cloudevents.name: 'com.example.someevent'
    action sendCloudEvent(data: CloudEventDataType);

    action send(data: CloudEventDataType);

    event cloudEvent {
        appinfoA : String;
        appinfoB : Integer;
        appinfoC : Boolean;
    }
}