using test from '../db';

@requires: 'WS_Todo'
@path    : 'todo'
@sap.message.scope.supported
@ws.path : 'fns-websocket'
service TodoService {

    @odata.draft.enabled
    entity Todo         as projection on test.Todo;

    entity Todo.texts   as projection on test.Todo.texts;

    entity Status       as
        projection on test.Status
        excluding {
            localized
        };

    entity Status.texts as projection on test.Status.texts;

    @ws
    @ws.pcp.action: 'MESSAGE'
    action chat(text: String) returns String;

    @ws
    @ws.path       : 'todo'
    event refresh {
        ID : String;
    };

    @ws
    @ws.pcp.event
    @ws.pcp.message: ''
    @ws.format     : 'pcp'
    @ws.path       : 'fns-websocket'
    event notify {
        text : String;
    };

    @ws
    event notifyOp {
        text : String;
    }
}
