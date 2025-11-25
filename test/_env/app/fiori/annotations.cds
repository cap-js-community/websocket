using {
  sap.common,
  sap.common.Currencies
} from '@sap/cds/common';

using {FioriService} from '../../srv/fiori.cds';
using {sap.capire.bookshop} from '../../db/bookshop';

annotate FioriService.Books with @(UI: {
    HeaderInfo       : {
        TypeName      : '{i18n>Book}',
        TypeNamePlural: '{i18n>Books}',
        Title         : {Value: title},
        Description   : {Value: author}
    },
    HeaderFacets     : [{
        $Type : 'UI.ReferenceFacet',
        Label : '{i18n>Description}',
        Target: '@UI.FieldGroup#Descr'
    }, ],
    Identification   : [{
        $Type : 'UI.DataFieldForAction',
        Label : '{i18n>Order}',
        Action: 'FioriService.submitOrder(FioriService.Books)',
    }, ],
    Facets           : [{
        $Type : 'UI.ReferenceFacet',
        Label : '{i18n>Details}',
        Target: '@UI.FieldGroup#Price'
    }, ],
    FieldGroup #Descr: {Data: [{Value: descr}, ]},
    FieldGroup #Price: {Data: [
        {Value: price},
        {Value: stock},
    ]},
});

annotate FioriService.Books with @(UI: {
    SelectionFields: [
        ID,
        price,
        currency_code
    ],
    LineItem       : [
        {
            Value: ID,
            Label: '{i18n>Title}'
        },
        {
            Value: author,
            Label: '{i18n>Author}'
        },
        {Value: genre.name},
        {Value: price},
        {Value: currency.symbol},
        {
            Value         : stock,
            @UI.Importance: #High,
        },
        {
            $Type         : 'UI.DataFieldForAction',
            Label         : '{i18n>Order}',
            Action        : 'FioriService.submitOrder(FioriService.Books)',
            Inline        : true,
            @UI.Importance: #High,
        },
    ]
});

annotate bookshop.Books with @(
  Common.SemanticKey: [ID],
  UI                : {
    Identification : [{Value: title}],
    SelectionFields: [
      ID,
      author_ID,
      price,
      currency_code
    ],
    LineItem       : [
      {
        Value: ID,
        Label: '{i18n>Title}'
      },
      {
        Value: author.ID,
        Label: '{i18n>Author}'
      },
      {Value: genre.name},
      {Value: stock},
      {Value: price},
      {Value: currency.symbol},
    ]
  }
) {
  ID     @Common          : {
    SemanticObject : 'Books',
    Text           : title,
    TextArrangement: #TextOnly
  };
  author @ValueList.entity: 'Authors';
};

annotate Currencies with {
  symbol @Common.Label: '{i18n>Currency}';
}

annotate bookshop.Books with {
  ID      @title: '{i18n>ID}';
  title   @title: '{i18n>Title}';
  genre   @title: '{i18n>Genre}'        @Common              : {
    Text           : genre.name,
    TextArrangement: #TextOnly
  };
  author  @title: '{i18n>Author}'       @Common              : {
    Text           : author.name,
    TextArrangement: #TextOnly
  };
  price   @title: '{i18n>Price}'        @Measures.ISOCurrency: currency_code;
  stock   @title: '{i18n>Stock}';
  descr   @title: '{i18n>Description}'  @UI.MultiLineText;
}

annotate bookshop.Genres with @(
  Common.SemanticKey: [name],
  UI                : {
    SelectionFields: [name],
    LineItem       : [
      {Value: name},
      {
        Value: parent.name,
        Label: '{i18n>MainGenre}'
      },
    ],
  }
);

annotate bookshop.Genres with {
  ID  @Common.Text: name  @Common.TextArrangement: #TextOnly;
}

annotate bookshop.Genres with @(UI: {
  Identification: [{Value: name}],
  HeaderInfo    : {
    TypeName      : '{i18n>Genre}',
    TypeNamePlural: '{i18n>Genres}',
    Title         : {Value: name},
    Description   : {Value: ID}
  },
  Facets        : [{
    $Type : 'UI.ReferenceFacet',
    Label : '{i18n>SubGenres}',
    Target: 'children/@UI.LineItem'
  }, ],
});

annotate bookshop.Genres with {
  ID   @title: '{i18n>ID}';
  name @title: '{i18n>Genre}';
}

annotate bookshop.Authors with @(
  Common.SemanticKey: [ID],
  UI                : {
    Identification : [{Value: name}],
    SelectionFields: [name],
    LineItem       : [
      {Value: ID},
      {Value: dateOfBirth},
      {Value: dateOfDeath},
      {Value: placeOfBirth},
      {Value: placeOfDeath},
    ],
  }
) {
  ID @Common: {
    SemanticObject : 'Authors',
    Text           : name,
    TextArrangement: #TextOnly,
  };
};

annotate bookshop.Authors with @(UI: {
  HeaderInfo: {
    TypeName      : '{i18n>Author}',
    TypeNamePlural: '{i18n>Authors}',
    Title         : {Value: name},
    Description   : {Value: dateOfBirth}
  },
  Facets    : [{
    $Type : 'UI.ReferenceFacet',
    Target: 'books/@UI.LineItem'
  }],
});


annotate bookshop.Authors with {
  ID           @title: '{i18n>ID}';
  name         @title: '{i18n>Name}';
  dateOfBirth  @title: '{i18n>DateOfBirth}';
  dateOfDeath  @title: '{i18n>DateOfDeath}';
  placeOfBirth @title: '{i18n>PlaceOfBirth}';
  placeOfDeath @title: '{i18n>PlaceOfDeath}';
}

annotate common.Languages with @(
  Common.SemanticKey: [code],
  Identification    : [{Value: code}],
  UI                : {
    SelectionFields: [
      name,
      descr
    ],
    LineItem       : [
      {Value: code},
      {Value: name},
    ],
  }
);

annotate common.Languages with @(UI: {
  HeaderInfo         : {
    TypeName      : '{i18n>Language}',
    TypeNamePlural: '{i18n>Languages}',
    Title         : {Value: name},
    Description   : {Value: descr}
  },
  Facets             : [{
    $Type : 'UI.ReferenceFacet',
    Label : '{i18n>Details}',
    Target: '@UI.FieldGroup#Details'
  }, ],
  FieldGroup #Details: {Data: [
    {Value: code},
    {Value: name},
    {Value: descr}
  ]},
});

annotate common.Currencies with @(
  Common.SemanticKey: [code],
  Identification    : [{Value: code}],
  UI                : {
    SelectionFields: [
      name,
      descr
    ],
    LineItem       : [
      {Value: descr},
      {Value: symbol},
      {Value: code},
    ],
  }
);

annotate common.Currencies with @(UI: {
  HeaderInfo         : {
    TypeName      : '{i18n>Currency}',
    TypeNamePlural: '{i18n>Currencies}',
    Title         : {Value: descr},
    Description   : {Value: code}
  },
  Facets             : [{
    $Type : 'UI.ReferenceFacet',
    Label : '{i18n>Details}',
    Target: '@UI.FieldGroup#Details'
  }],
  FieldGroup #Details: {Data: [
    {Value: name},
    {Value: symbol},
    {Value: code},
    {Value: descr}
  ]}
});

