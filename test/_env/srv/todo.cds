using test from '../db';

@requires: 'WS_Todo'
@sap.message.scope.supported
@path: 'todo'
service TodoService {

    @odata.draft.enabled
    entity Todo as projection on test.Todo;
    entity Todo.texts as projection on test.Todo.texts;

    entity Status as projection on test.Status excluding {
        localized
    }
    entity Status.texts as projection on test.Status.texts
}