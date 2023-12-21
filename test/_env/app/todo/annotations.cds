using { sap } from '@sap/cds/common';
using TodoService from '../../srv';

annotate TodoService.Todo with @(

    // Filter Bar
    UI.SelectionFields: [ name, status_code ],

    // Head of List
    UI.HeaderInfo: {
        Title: {
            Label: 'Name',
            Value: name
        },
        TypeName: '{i18n>Todo}',
        TypeNamePlural: '{i18n>Todos}'
    },

    // List
    UI.LineItem: [
        {$Type: 'UI.DataField', Value: name},
        {$Type: 'UI.DataField', Value: status_code}
    ],

    //Object Page (details)
    UI.Identification: [
        {$Type: 'UI.DataField', Value: name},
        {$Type: 'UI.DataField', Value: status_code}
    ],

    UI.Facets: [
        {$Type: 'UI.ReferenceFacet', Label: '{@i18n>General}', Target: '@UI.Identification'},
        {$Type: 'UI.ReferenceFacet', Label: '{@i18n>Translations}', Target: 'texts/@UI.LineItem'}
    ]
);

annotate TodoService.Todo {
	ID @UI.Hidden;
};

annotate TodoService.Todo {
	status @ValueList: { entity: 'Status', type: #fixed } @Common.Text: status.name @Common.TextArrangement: #TextFirst;
};

annotate TodoService.Todo.texts with @(
	UI: {
		SelectionFields: [ locale, description ],

		Identification: [
		    {$Type: 'UI.DataField', Value: description}
		],

		LineItem: [
			{$Type: 'UI.DataField', Label: '{@i18n>Locale}', Value: locale},
			{$Type: 'UI.DataField', Value: description},
		]
	}
);

annotate TodoService.Todo.texts {
	ID_texts @UI.Hidden
};

annotate TodoService.Todo.texts {
	ID @UI.Hidden @Core.Computed: false
};

annotate TodoService.Todo.texts {
	locale @ValueList: { entity: 'Languages', type: #fixed }
};

extend service TodoService {
	entity Languages as projection on sap.common.Languages excluding {
        localized
    }
    entity Languages.texts as projection on sap.common.Languages.texts;
};