const app_name = "bitwarden_event_logs_beta";
const inputs_conf_name = "script://$SPLUNK_HOME/etc/apps/" + app_name + "/bin/bitwarden_event_logs.py";

export {
    app_name,
    inputs_conf_name
}