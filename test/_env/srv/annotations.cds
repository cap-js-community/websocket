using test from '../db/model';

@ws
@odata
@path: 'annotations'
service AnnotationService {
    @Common.SideEffects #nameUpdated: {
        SourceEvents    : ['nameChanged'],
        TargetProperties: ['name']
    }
    @Common.SideEffects #stockUpdated: {
        SourceEvents    : ['stockChanged'],
        TargetProperties: ['stock']
    }
    entity Header as projection on test.Header;

    event nameChanged {
        sideEffectSource : String;
    };

    event stockChanged {
        sideEffectSource : String;
    };

    event otherEvent {
        text : String;
    };
}
