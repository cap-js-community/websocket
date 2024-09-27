using test from '../db';

@requires: 'WS_Todo'
@path    : 'todo'
@sap.message.scope.supported
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
    event refresh {
        ID : String
    };

    @ws
    @ws.pcp.event
    @ws.pcp.message: ''
    @ws.format     : 'pcp'
    @ws.path       : 'fns-websocket'
    event notify {
        text : String
    };
}
