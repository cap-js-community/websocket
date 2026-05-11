using {sap.capire.bookshop as my} from '../db/schema';

@ws
@odata
service CatalogService {

  /** For displaying lists of Books */
  @readonly
  entity ListOfBooks as
    projection on Books {
      *,
      genre.name      as genre,
      currency.symbol as currency,
    }
    excluding {
      descr
    };

  /** For display in details pages */
  @readonly
  @Common.SideEffects #stockUpdated: {
    SourceEvents    : ['stockChanged'],
    TargetProperties: ['stock']
  }
  entity Books       as
    projection on my.Books {
      *,
      author.name as author
    }
    excluding {
      createdBy,
      modifiedBy
    }
    actions {
      @requires: 'authenticated-user'
      action submitOrder(quantity : Books:stock @mandatory);
    };

  event stockChanged {
    sideEffectSource : String;
  };
}
