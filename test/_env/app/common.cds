using { cuid } from '@sap/cds/common';
using from './todo';

annotate cuid with {
    ID @(
        UI.Hidden,
        Core.Computed
    );
}