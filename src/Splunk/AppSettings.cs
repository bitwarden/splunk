using System;
using System.IO;
using Tomlyn;
using Tomlyn.Model;

namespace Bit.Splunk
{
    public class AppSettings
    {
        public AppSettings()
        {
            SplunkHome = Environment.GetEnvironmentVariable("SPLUNK_HOME");
            if (!string.IsNullOrWhiteSpace(SplunkHome))
            {
                SplunkSessionKey = Console.In.ReadLine()?.Trim();
            }
            if (SplunkEnvironment)
            {
                // Load script.conf
                var scriptConfigFile = $"{SplunkHome}/etc/apps/bitwarden_event_logs/local/script.conf";
                if (File.Exists(scriptConfigFile))
                {
                    var toml = File.ReadAllText(scriptConfigFile);
                    if (!string.IsNullOrWhiteSpace(toml))
                    {
                        var appConfigModel = Toml.ToModel(toml);
                        if (appConfigModel != null)
                        {
                            if (appConfigModel.ContainsKey("config"))
                            {
                                var config = appConfigModel["config"] as TomlTable;

                                if (config.ContainsKey("startDate"))
                                {
                                    var startDate = config["startDate"] as TomlDateTime?;
                                    EventsStartDate = Convert.ToDateTime(startDate);
                                }

                                if (config.ContainsKey("apiUrl"))
                                {
                                    var apiUrl = config["apiUrl"] as string;
                                    EventsApiUrl = apiUrl?.ToString();
                                }

                                if (config.ContainsKey("identityUrl"))
                                {
                                    var identityUrl = config["identityUrl"] as string;
                                    IdentityUrl = identityUrl?.ToString();
                                }
                            }
                        }
                    }
                }
            }
            else
            {
                Console.Write("Splunk Admin Username: ");
                SplunkUsername = Console.In.ReadLine()?.Trim();
                Console.Write("Splunk Admin Password: ");
                SplunkPassword = Console.In.ReadLine()?.Trim();
            }
        }

        public bool SplunkEnvironment => !string.IsNullOrWhiteSpace(SplunkHome) &&
            !string.IsNullOrWhiteSpace(SplunkSessionKey);
        public string SplunkHome { get; set; }
        public string SplunkSessionKey { get; set; }
        public string SplunkUsername { get; set; }
        public string SplunkPassword { get; set; }
        public string SplunkApiUrl = "https://localhost:8089";
        public string EventsApiUrl { get; set; } = "https://api.bitwarden.com";
        public string IdentityUrl { get; set; } = "https://identity.bitwarden.com";
        public DateTime EventsStartDate { get; set; } = DateTime.UtcNow.AddYears(-1);
    }
}
