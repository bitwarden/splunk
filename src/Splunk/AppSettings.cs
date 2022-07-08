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
                // Load events_logs.conf
                var appConfigFile = $"{SplunkHome}/etc/apps/bitwarden_event_logs/local/events_logs.conf";
                if (File.Exists(appConfigFile))
                {
                    var toml = File.ReadAllText(appConfigFile);
                    if (!string.IsNullOrWhiteSpace(toml))
                    {
                        var appConfigModel = Toml.ToModel(toml);
                        if (appConfigModel != null)
                        {
                            var config = appConfigModel["config"] as TomlTable;
                            if (config != null)
                            {
                                var startDate = config["startDate"] as TomlDateTime?;
                                if (startDate != null)
                                {
                                    EventsStartDate = Convert.ToDateTime(startDate);
                                }

                                var limit = config["limit"] as long?;
                                if (limit != null)
                                {
                                    EventsLimit = Convert.ToInt32(limit);
                                }

                                var cursorFile = config["cursorFile"] as string;
                                EventsCursorFile = cursorFile?.ToString();
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
        public string BitwardenApiUrl { get; set; } = "http://api.bitwarden.com";
        public int EventsLimit { get; set; } = 100;
        public DateTime EventsStartDate { get; set; } = DateTime.UtcNow.AddYears(-1);
        public string EventsCursorFile { get; set; }
    }
}
