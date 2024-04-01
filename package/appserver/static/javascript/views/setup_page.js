"use strict";

import * as Splunk from './splunk_helpers.js';
import * as Config from './setup_configuration.js';
import * as StoragePasswords from './storage_passwords.js';

const app_name = "bitwarden_event_logs_beta";

export async function getIndexes(splunk_js_sdk) {
    // Create the Splunk JS SDK Service object
    // Use a wildcard namespace to get all the indexes
    const splunk_js_sdk_service = Config.create_splunk_js_sdk_service(
        splunk_js_sdk,
        {
            owner: "-",
            app: "-",
            sharing: "app",
        }
    );
    const indexes = await Config.get_indexes(splunk_js_sdk_service);
    return indexes;
}

export async function perform(splunk_js_sdk, setup_options) {
    var application_name_space = {
        owner: "nobody",
        app: app_name,
        sharing: "app",
    };

    try {
        // Setup
        const service = Config.create_splunk_js_sdk_service(
            splunk_js_sdk,
            application_name_space,
        );

        let { clientId, clientSecret, index, serverUrl, startDate, ...properties } = setup_options;

        // Store secrets
        await StoragePasswords.write_secret(
            service,
            app_name + "_realm",
            "api_key",
            clientId + "_" + clientSecret
        );

        // Update inputs.conf
        await Splunk.update_configuration_file(
            service,
            "inputs",
            "script://$SPLUNK_HOME/etc/apps/" + app_name + "/bin/bitwarden_event_logs.py",
            { index: index },
        );

        // Update script.conf
        const isBitwardenCloud = serverUrl === "https://bitwarden.com" || serverUrl === "bitwarden.com";
        const apiUrl = isBitwardenCloud ? "https://api.bitwarden.com" : serverUrl + "/api/";
        const identityUrl = isBitwardenCloud ? "https://identity.bitwarden.com" : serverUrl + "/identity/";
        await Splunk.update_configuration_file(
            service,
            "script",
            "config",
            {
                apiUrl: apiUrl,
                identityUrl: identityUrl,
                startDate: startDate
            },
        );
        
        // Complete setup
        await Config.complete_setup(service);
        await Config.reload_splunk_app(service, app_name);
        Config.redirect_to_splunk_app_homepage(app_name);
    } catch (error) {
        console.log('Error:', error);
        alert('Error:' + error);
    }
}
