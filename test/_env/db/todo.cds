namespace test;

using { managed, cuid } from '@sap/cds/common';
using test.Status from './enum';

@fiori.draft.enabled
@assert.unique.semanticKey: [name]
@title: '{i18n>Todo}'
entity Todo: cuid, managed {

    @mandatory
    @Search.defaultSearchElement: true
    @title: '{i18n>Todo.name}'
    name: String(255) not null;

    @title: '{i18n>Todo.description}'
    description: localized String(5000);

    @Common.ValueListWithFixedValues
    @Search.defaultSearchElement: true
    @title: '{i18n>Todo.status}'
    status: Association to Status;
}


