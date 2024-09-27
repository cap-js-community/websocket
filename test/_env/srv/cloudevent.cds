@ws
@ws.format: 'cloudevent'
@path     : 'cloudevent'
service CloudEventService {

    @ws.cloudevent.type: 'com.example.someevent'
    action sendCloudEvent(
    @ws.cloudevent.specversion specversion : String,
                          @ws.cloudevent.type type : String,
                          @ws.cloudevent.source source : String,
                          @ws.cloudevent.subject subject : String,
                          @ws.cloudevent.id id : String,
                          @ws.cloudevent.time time : String,
                          @ws.cloudevent.comexampleextension1 comexampleextension1 : String,
                          @ws.cloudevent.comexampleothervalue comexampleothervalue : String,
                          @ws.cloudevent.datacontenttype datacontenttype : String,
                          appinfoA : String,
                          appinfoB : Integer,
                          appinfoC : Boolean) returns Boolean;

    event cloudEvent1 {
        appinfoA : String;
        appinfoB : Integer;
        appinfoC : Boolean;
    }

    @ws.cloudevent.specversion         : '1.1'
    @ws.cloudevent.type                : 'com.example.someevent'
    @ws.cloudevent.source              : '/mycontext'
    @ws.cloudevent.subject             : 'example'
    @ws.cloudevent.id                  : 'C234-1234-1234'
    @ws.cloudevent.time                : '2018-04-05T17:31:00Z'
    @ws.cloudevent.comexampleextension1: 'value'
    @ws.cloudevent.comexampleothervalue: 5
    @ws.cloudevent.datacontenttype     : 'application/cloudevents+json'
    event cloudEvent2 {
        appinfoA : String;
        appinfoB : Integer;
        appinfoC : Boolean;
    }

    event cloudEvent3 {
        @ws.cloudevent.specversion
        specversion     : String;

        @ws.cloudevent.type
        type            : String;

        @ws.cloudevent.source
        source          : String;

        @ws.cloudevent.subject
        subject         : String;

        @ws.cloudevent.id
        id              : String;

        @ws.cloudevent.time
        time            : String;

        @ws.cloudevent.comexampleextension1
        extension1      : String;

        @ws.cloudevent.comexampleothervalue
        othervalue      : String;

        @ws.cloudevent.datacontenttype
        datacontenttype : String;
        appinfoA        : String;
        appinfoB        : Integer;
        appinfoC        : Boolean;
    }
}
