using {sap.capire.bookshop as my} from '../db/bookshop';

@Common: {
    WebSocketBaseURL: '/ws/fiori',
    WebSocketChannel: 'sideeffects',
}
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

    @ws
    @ws.format: 'pcp'
    @ws.pcp.sideEffect
    event stockChanged {
        sideEffectSource : String;
    };
}
