@ws
@ws.format: 'cloudevent'
@path     : 'cloudevent'
service CloudEventService {

    type CloudEventDataType : {
        appinfoA : String;
        appinfoB : Integer;
        appinfoC : Boolean;
        @ws.ignore
        appinfoD : String;
    };

    @ws.cloudevent.name: 'com.example.someevent.model'
    action sendCloudEventModel( specversion : String, type : String, source : String, subject : String, id : String, time : String, comexampleextension1 : String, comexampleothervalue : Integer, datacontenttype : String, data: CloudEventDataType) returns Boolean;

    @ws.cloudevent.name: 'com.example.someevent.map'
    @ws.cloudevent.subject: 'cloud-example'
    action sendCloudEventMap(
    @ws.cloudevent.specversion _specversion : String,
                          @ws.cloudevent.type _type : String,
                          @ws.cloudevent.source _source : String,
                          @ws.cloudevent.subject _subject : String,
                          @ws.cloudevent.id _id : String,
                          @ws.cloudevent.time _time : String,
                          @ws.cloudevent.comexampleextension1 _comexampleextension1 : String,
                          @ws.cloudevent.comexampleothervalue _comexampleothervalue : Integer,
                          @ws.cloudevent.datacontenttype _datacontenttype : String,
                          appinfoA : String,
                          appinfoB : Integer,
                          appinfoC : Boolean,
                          @ws.ignore appinfoD : String) returns Boolean;

    event cloudEvent1 {
        appinfoA : String;
        appinfoB : Integer;
        appinfoC : Boolean;
    }

    @websocket.cloudevent.specversion         : '1.1'
    @ws.cloudevent.type                : 'com.example.someevent.cloudEvent2'
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
        @websocket.ignore
        skipValue        : String;
        @websocket.cloudevent.specversion
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
        othervalue      : Integer;

        @ws.cloudevent.datacontenttype
        datacontenttype : String;
        appinfoA        : String;
        appinfoB        : Integer;
        appinfoC        : Boolean;
    }

    event cloudEvent4 {
        appinfoA : String;
        appinfoB : Integer;
        appinfoC : Boolean;
    }

    event cloudEvent5 {
        specversion : String;
        type : String;
        source : String;
        subject : String;
        id : String;
        time : String;
        comexampleextension1 : String;
        comexampleothervalue : Integer;
        datacontenttype : String;
        data: {
            appinfoA : String;
            appinfoB : Integer;
            appinfoC : Boolean;
        }
    }
}