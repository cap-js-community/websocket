using test from '../db';

@protocol: 'ws'
@requires: 'WS_Todo'
@path: 'todo'
service TodoWSService {

    event refresh {
        ID: String
    }
}