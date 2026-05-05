# Migration Guide: Splunk Application to Event Push Delivery

This guide will outline the process that the Splunk admin will need to follow to successfully upgrade the Bitwarden Splunk application to receive events from their Bitwarden Organizations using a push based model.

Past versions of the application used a polling based model, where the Splunk application used repeated calls to the Bitwarden API for ingesting event data. After application installation, this required the admin to complete a setup form to enable making authenticated HTTP requests to the Bitwarden API. This polling based model will be deprecated in the newest version of the application, in favor of the new push based model.

Users will be encouraged to complete setup for the new push based model, where the Bitwarden platform will send events into Splunk via the HTTP Event Collector ([see docs](https://help.splunk.com/en/splunk-enterprise/get-started/get-data-in/9.3/get-data-with-http-event-collector/set-up-and-use-http-event-collector-in-splunk-web)).

## Upgrading the Application

Splunk admins will be able to find the Bitwarden application through Splunkbase, where the latest version update will be available for download. This download happens in place on their instance and does not require uninstalling their existing version of the Bitwarden Splunk application.

Once the application has been updated, **no changes to existing polling setups for receiving events will occur on their own**. This means that when opening the upgraded application, any existing event polling setups will continue to run as they did on previous versions of the app.

## Complete the Setup for Push Delivery

While existing event polling setups will still work, the application admin will be prompted to set up push based event delivery. This process includes a new setup form, which will ensure that the Splunk instance has HEC enabled, a token has been generated for use, and the proper setup in the Bitwarden Admin Console has been completed.

After following this setup form and entering the HEC endpoint and token into Bitwarden's Admin Console, the user will be prompted to disable their old polling configuration. Upon confirmation, the application will stop polling for events. Note that duplicate events for the Bitwarden Organization will be received in Splunk for the entire timespan where both push and polling based event delivery models are enabled. **For this reason, it is strongly recommended that the admin disable the polling setup immediately after confirmation that events are being received with the push based model.**

### New Application Users

First time users of the Bitwarden Splunk application that install the newest version will have the option to configure either polling based or push based event collection.
