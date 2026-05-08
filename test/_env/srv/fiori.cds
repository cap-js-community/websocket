using {sap.capire.bookshop as my} from '../db/bookshop';

@ws
@odata
service FioriService {
    @readonly
    @Common.SideEffects #stockUpdated: {
        SourceEvents    : ['stockChanged'],
        TargetProperties: ['stock']
    }
    entity Books as
        projection on my.Books {
            *,
            author.name as author
        }
        excluding {
            createdBy,
            modifiedBy
        }
        actions {
            action submitOrder(quantity : Books:stock @mandatory );
        };

    @ws: { currentUser, format: 'pcp', pcp: { sideEffect } }
    event stockChanged {
        sideEffectSource : String;
    };
}
