@ws
@requires: 'WS_Todo'
@path: 'todo-ws'
service TodoWSService {

    event refresh {
        ID: String
    }
}