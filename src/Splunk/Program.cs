using System.Threading.Tasks;

namespace Bit.Splunk
{
    public class Program
    {
        static void Main(string[] args)
        {
            MainAsync(args).Wait();
        }

        static async Task MainAsync(string[] args)
        {
            var appSettings = new AppSettings();
            var splunkApi = new SplunkApi(appSettings);
            var eventsApiKey = await splunkApi.GetApiKeyAsync();
        }
    }
}
