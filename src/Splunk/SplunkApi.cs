using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Xml;

namespace Bit.Splunk
{
    public class SplunkApi
    {
        private readonly AppSettings _appSettings;
        private readonly HttpClient _httpClient;

        public SplunkApi(AppSettings appSettings)
        {
            _appSettings = appSettings;

            _httpClient = new HttpClient(new HttpClientHandler
            {
                ServerCertificateCustomValidationCallback =
                    HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
            });
        }

        public async Task<string> GetApiKeyAsync()
        {
            var request = new HttpRequestMessage
            {
                Method = HttpMethod.Get,
                RequestUri = new Uri($"{_appSettings.SplunkApiUrl}/servicesNS/nobody/" +
                "bitwarden_event_logs/storage/passwords/bitwarden_event_logs_realm:api_key:")
            };

            var authHeader = $"Splunk {_appSettings.SplunkSessionKey}";
            if (!_appSettings.SplunkEnvironment)
            {
                var authBytes = Encoding.UTF8.GetBytes($"{_appSettings.SplunkUsername}:{_appSettings.SplunkPassword}");
                authHeader = $"Basic {Convert.ToBase64String(authBytes)}";
            }

            request.Headers.Add("Authorization", authHeader);

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var xml = await response.Content.ReadAsStringAsync();
            if (string.IsNullOrWhiteSpace(xml))
            {
                return null;
            }

            var xmlDoc = new XmlDocument();
            xmlDoc.LoadXml(xml);
            var xmlNamespaceManager = new XmlNamespaceManager(xmlDoc.NameTable);
            xmlNamespaceManager.AddNamespace("ns", "http://www.w3.org/2005/Atom");
            xmlNamespaceManager.AddNamespace("s", "http://dev.splunk.com/ns/rest");
            var passwordNode = xmlDoc.SelectSingleNode(
                "ns:feed/ns:entry/ns:content/s:dict/s:key[@name='clear_password']",
                xmlNamespaceManager);

            return passwordNode?.InnerText;
        }
    }
}
