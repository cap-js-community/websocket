using test from '../db/model';

@path: 'odata'
service ODataService {

    entity Header as projection on test.Header;

    function message(text: String) returns String;
}

