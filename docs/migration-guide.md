# Migration Guide: Event Polling to Push Delivery

This guide outlines how a Splunk admin can migrate the [Bitwarden Event Logs](https://splunkbase.splunk.com/app/6592) Splunk application from polling events to pushed events from their Bitwarden Organizations.

Past versions of the Splunk application exclusively used a polling model, where the application used repeated calls to the Bitwarden API to retrieve event data. New versions of the application include the ability to retrieve events pushed from the Bitwarden platform into a HTTP Event Collector exposed on the Splunk instance ([see docs](https://help.splunk.com/en/splunk-enterprise/get-started/get-data-in/9.3/get-data-with-http-event-collector/set-up-and-use-http-event-collector-in-splunk-web)).

## Migration Steps

In order migrate Bitwarden Organization logs from a polling configuration to a push based configuration, admins will complete the following (each step detailed below):

1. Update the Bitwarden Splunk application
2. Complete set up for event push delivery

### Update the Bitwarden Splunk application

Splunk admins need to update to any version after [TODO: add version number here] through Splunkbase. The download happens in place on their instance and does not require uninstalling their existing version of the Bitwarden Splunk application.

Updating the application will not effect existing event polling configurations, events will continue to be polled just as before the update.

### Complete set up for event push delivery

In the application, a new form for configuring event push delivery is present. This set up will ensure that the Splunk instance has HEC enabled, a token has been generated for use, and proper set up in the Bitwarden Admin Console has been completed.

The admin will complete this form, and the Bitwarden platform will begin to push event logs for the Organization into Splunk.

**Note that completing the setup form for event push delivery (push or poll) will automatically disable any existing polling configuration.** For example, if your existing configuration uses polling to retrieve events, completing the setup form for event push delivery will overwrite the old polling configuration.


