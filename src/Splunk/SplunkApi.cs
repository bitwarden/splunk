using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Threading.Tasks;
using System.Xml;
using Bit.Splunk.Models;
using Microsoft.Extensions.Logging;

namespace Bit.Splunk
{
    public class SplunkApi
    {
        private readonly AppSettings _appSettings;
        private readonly ILogger<SplunkApi> _logger;
        private readonly HttpClient _httpClient;

        public SplunkApi(AppSettings appSettings, ILogger<SplunkApi> logger)
        {
            _appSettings = appSettings;
            _logger = logger;
            _httpClient = new HttpClient(new HttpClientHandler
            {
                ServerCertificateCustomValidationCallback =
                    HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
            });
        }

        public async Task<EventsApiKeyModel> GetApiKeyAsync()
        {
            var request = new HttpRequestMessage
            {
                Method = HttpMethod.Get,
                RequestUri = new Uri($"{_appSettings.SplunkApiUrl}/servicesNS/nobody/" +
                    "bitwarden_event_logs/storage/passwords/bitwarden_event_logs_realm:api_key:")
            };

            AddAuthorization(request);

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Response from Splunk API unsuccessful. Status code: {0}", response.StatusCode);
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

            return new EventsApiKeyModel(passwordNode?.InnerText);
        }

        public async Task<EventsApiCollectionModel> GetLastLogDateAsync()
        {
            var request = new HttpRequestMessage
            {
                Method = HttpMethod.Get,
                RequestUri = new Uri($"{_appSettings.SplunkApiUrl}/servicesNS/nobody/" +
                    "bitwarden_event_logs/storage/collections/data/eventsapi?output_mode=json")
            };

            AddAuthorization(request);

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Response from Splunk API unsuccessful. Status code: {0}", response.StatusCode);
                return null;
            }

            var records = await response.Content.ReadFromJsonAsync<List<EventsApiCollectionModel>>();
            if (records == null)
            {
                return null;
            }

            return records.OrderByDescending(r => r.Key).FirstOrDefault();
        }

        public async Task UpsertLastLogDateAsync(string key, DateTime lastLogDate)
        {
            var uri = $"{_appSettings.SplunkApiUrl}/servicesNS/nobody/" +
                $"bitwarden_event_logs/storage/collections/data/eventsapi";
            if (!string.IsNullOrWhiteSpace(key))
            {
                uri = string.Concat(uri, "/", key);
            }
            var request = new HttpRequestMessage
            {
                Method = HttpMethod.Post,
                RequestUri = new Uri(uri),
                Content = JsonContent.Create(new { last_log_date = lastLogDate })
            };

            AddAuthorization(request);

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Response from Splunk API unsuccessful. Status code: {0}", response.StatusCode);
            }
        }

        public bool CanCallApi()
        {
            if (string.IsNullOrWhiteSpace(_appSettings.SplunkSessionKey))
            {
                return !string.IsNullOrWhiteSpace(_appSettings.SplunkUsername) &&
                    !string.IsNullOrWhiteSpace(_appSettings.SplunkPassword);
            }
            return true;
        }

        private void AddAuthorization(HttpRequestMessage requestMessage)
        {
            var authHeader = $"Splunk {_appSettings.SplunkSessionKey}";
            if (!_appSettings.SplunkEnvironment)
            {
                var authBytes = Encoding.UTF8.GetBytes($"{_appSettings.SplunkUsername}:{_appSettings.SplunkPassword}");
                authHeader = $"Basic {Convert.ToBase64String(authBytes)}";
            }

            requestMessage.Headers.Add("Authorization", authHeader);
        }
    }
}
