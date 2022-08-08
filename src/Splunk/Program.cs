using System;
using System.Threading.Tasks;
using Bit.Splunk.Models;
using Microsoft.Extensions.Logging;
using Serilog;

namespace Bit.Splunk
{
    public class Program
    {
        private static ILogger<Program> _logger;
        private static EventsApiKeyModel _eventsApiKey;

        public static void Main(string[] args)
        {
            MainAsync(args).Wait();
        }

        private static async Task MainAsync(string[] args)
        {
            // Load settings
            var appSettings = new AppSettings();

            // Set up logging
            var serilogConfig = new LoggerConfiguration()
                .Enrich.FromLogContext();

            if (appSettings.SplunkEnvironment)
            {
                serilogConfig.WriteTo.File($"{appSettings.SplunkHome}/var/log/splunk/bitwarden_event_logs.log",
                    rollOnFileSizeLimit: true, fileSizeLimitBytes: 20000000, retainedFileCountLimit: 5);
            }
            else
            {
                serilogConfig.WriteTo.Console();
            }

            var serilog = serilogConfig.CreateLogger();
            using var loggerFactory = LoggerFactory.Create(builder =>
            {
                builder
                    .AddFilter("Microsoft", LogLevel.Warning)
                    .AddFilter("System", LogLevel.Warning)
                    .AddSerilog(serilog);
            });
            _logger = loggerFactory.CreateLogger<Program>();

            // Get events API key
            var splunkApi = new SplunkApi(appSettings, loggerFactory.CreateLogger<SplunkApi>());
            if (splunkApi.CanCallApi())
            {
                _eventsApiKey = await splunkApi.GetApiKeyAsync();
            }
            if (!appSettings.SplunkEnvironment && _eventsApiKey == null)
            {
                _eventsApiKey = new EventsApiKeyModel();
                Console.Write("Events API Client Id: ");
                _eventsApiKey.ClientId = Console.In.ReadLine()?.Trim();
                Console.Write("Events API Client Secret: ");
                _eventsApiKey.ClientSecret = Console.In.ReadLine()?.Trim();
            }
            if (string.IsNullOrWhiteSpace(_eventsApiKey?.ClientId) ||
                string.IsNullOrWhiteSpace(_eventsApiKey?.ClientSecret))
            {
                _logger.LogError("Cannot resolve events API key.");
                return;
            }

            // Start printing events
            var eventsApi = new EventsApi(
                splunkApi,
                _eventsApiKey,
                appSettings,
                loggerFactory.CreateLogger<EventsApi>());
            await eventsApi.PrintEventsAsync();
        }
    }
}
