define([
    'app',
    'wikimod/adi/theme/theme',
    './adi_factory'
], function(app, theme) {
    'use strict';
    

    let params = {
        theme : {
            id : "classic"
        }
    }

    let component = "<adi-theme theme='params'></adi-theme>";

    return app.createModCommand(params, {}, component);
});