"use strict";

import * as AppConst from './app_const.js'

require.config({
    paths: {
        myApp: "../app/" + AppConst.app_name + "/javascript/views/app",
        react: "../app/" + AppConst.app_name + "/javascript/vendor/react.production.min",
        ReactDOM: "../app/" + AppConst.app_name + "/javascript/vendor/react-dom.production.min",
    },
    scriptType: "module",
});

require([
    "react", 
    "ReactDOM",
    "myApp",
], function(react, ReactDOM, myApp) {
    ReactDOM.render(myApp, document.getElementById('main_container'));
});
