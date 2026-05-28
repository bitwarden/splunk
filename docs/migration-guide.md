# Migration Guide: Event Polling to Push Delivery

This guide outlines how a Splunk admin can migrate the [Bitwarden Event Logs](https://splunkbase.splunk.com/app/6592) Splunk application from polling events to pushed events from their Bitwarden Organizations.

Past versions of the Splunk application exclusively used a polling model, where the application used repeated calls to the Bitwarden API to retrieve event data. New versions of the application include the ability to retrieve events pushed from the Bitwarden platform into a HTTP Event Collector exposed on the Splunk instance ([see docs](https://help.splunk.com/en/splunk-enterprise/get-started/get-data-in/9.3/get-data-with-http-event-collector/set-up-and-use-http-event-collector-in-splunk-web)).

## Migration Steps

In order to migrate Bitwarden Organization logs from a polling configuration to a push based configuration, admins will complete the following (each step detailed below):

1. [Update the Bitwarden Splunk application](#update-the-bitwarden-splunk-application)
2. [Bitwarden Splunk application: Configure event push delivery (HEC setup)](#bitwarden-splunk-application-configure-event-push-delivery-hec-setup)
3. [Bitwarden Admin Console: Complete setup for event push delivery](#bitwarden-admin-console-complete-set-up-for-event-push-delivery)

### Update the Bitwarden Splunk application

Splunk admins need to update to any version after [TODO: add version number here] through Splunkbase. The download happens in place on their instance and does not require uninstalling their existing version of the Bitwarden Splunk application.

Updating the application will not affect existing event polling configurations, events will continue to be polled just as before the update.

### Bitwarden Splunk application: Configure event push delivery (HEC setup)

Once in the updated application, the admin should navigate to the setup form. The setup form includes an option for "push" event delivery. Select it, and the form will assist the admin in ensuring that their Splunk instance is properly configured to receive events using the Http Event Collector (HEC).

Take note of both the HEC endpoint and authentication token, and proceed to the next step where push delivery is configured in the Bitwarden Admin Console.

### Bitwarden Admin Console: Complete set up for event push delivery

Login to the Bitwarden Admin Console as a member of the Organization you wish to receive event data for. From there, navigate to the "Integrations" page, then to the "Event management" tab. Locate the Splunk option in the list, and click "Connect Splunk".

The configuration form requires the HEC endpoint and authentication token received from Splunk in the step before. Enter them and save the configuration.

You have now successfully configured Bitwarden to push Organization event data into your Splunk instance! 

Follow the Bitwarden Help Center [documentation](TODO) if necessary.

## Important Notes

### Event Availability in Splunk

For either configuration type, you will know event data is being properly delivered into Splunk once you see the Bitwarden Splunk application's included dashboards populate with data. See sections below about when event data should be delivered for each configuration type.

#### Poll Configurations

Upon completing the setup form for polling event data in the Bitwarden Splunk application, the application will begin polling Bitwarden endpoints for event data. 

#### Push Configurations

Upon completing the configuration in Bitwarden's Admin Console for the Organization of your choice, the Bitwarden platform will begin to push events into your Splunk instance. 

### Duplicate or Lost Events

#### Duplicate Events

Bitwarden event data may be received by Splunk multiple times, which can result in events appearing duplicated. This happens when push and poll configurations are enabled at the same time for the same Bitwarden Organization. This should only happen momentarily, while transitioning between the event delivery configuration types.

#### Missing Events

Bitwarden event data may be missing if an existing polling configuration is deleted, or a push configuration is not properly completed in the Bitwarden Admin Console. Push configurations will not begin receiving event data until the setup is finished in the Bitwarden Admin Console.