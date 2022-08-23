using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Web;
using Bit.Splunk.Models;
using Microsoft.Extensions.Logging;

namespace Bit.Splunk
{
    public class BitwardenApi
    {
        private static readonly DateTime _epoc = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        private readonly SplunkApi _splunkApi;
        private readonly EventsApiKeyModel _eventsApiKey;
        private readonly AppSettings _appSettings;
        private readonly ILogger<BitwardenApi> _logger;
        private HttpClient _apiClient;
        private HttpClient _identityClient;
        private JsonDocument _decodedToken;
        private DateTime? _nextAuthAttempt = null;
        private string _accessToken;
        private JsonSerializerOptions _jsonOptions;

        public BitwardenApi(
            SplunkApi splunkApi,
            EventsApiKeyModel eventsApiKey,
            AppSettings appSettings,
            ILogger<BitwardenApi> logger)
        {
            _splunkApi = splunkApi;
            _eventsApiKey = eventsApiKey;
            _appSettings = appSettings;
            _logger = logger;

            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = false,
                DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
            };

            _apiClient = new HttpClient
            {
                BaseAddress = new Uri(_appSettings.EventsApiUrl)
            };
            _apiClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            _identityClient = new HttpClient
            {
                BaseAddress = new Uri(_appSettings.IdentityUrl)
            };
            _identityClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        }

        public async Task PrintEventLogsAsync()
        {
            var lastEventLog = _splunkApi.CanCallApi() ? await _splunkApi.GetLastLogDateAsync() : null;
            var requestModel = new EventRequestModel
            {
                Start = lastEventLog?.LastLogDate.AddMilliseconds(1) ?? _appSettings.EventsStartDate,
                End = DateTime.UtcNow.AddHours(1)
            };

            var events = await GetEventsAsync(requestModel, new List<EventResponseModel>());
            var eventLogs = await HydrateEventsAsync(events);
            if (!eventLogs?.Any() ?? true)
            {
                return;
            }

            if (_splunkApi.CanCallApi())
            {
                var lastEventDate = eventLogs.OrderByDescending(e => e.Date).First().Date;
                await _splunkApi.UpsertLastLogDateAsync(lastEventLog?.Key, lastEventDate);
            }

            foreach (var e in eventLogs)
            {
                var hash = ComputeObjectHash(e);
                var json = JsonSerializer.Serialize(e, _jsonOptions);
                var log = string.Format("{{\"hash\":\"{0}\",{1}",
                    Convert.ToBase64String(hash),
                    json.Substring(1));
                Console.WriteLine(log);
            }
        }

        public void Dispose()
        {
            _decodedToken?.Dispose();
        }

        private async Task<List<EventResponseModel>> GetEventsAsync(EventRequestModel requestModel,
            List<EventResponseModel> responseList)
        {
            var tokenStateResponse = await HandleTokenStateAsync();
            if (!tokenStateResponse)
            {
                return null;
            }

            if (requestModel == null)
            {
                return null;
            }

            var uriBuilder = new UriBuilder(new Uri(string.Concat(_apiClient.BaseAddress, "public/events")));
            var query = HttpUtility.ParseQueryString(uriBuilder.Query);
            if (requestModel.Start != null)
            {
                query["start"] = requestModel.Start.Value.ToString("o", CultureInfo.InvariantCulture);
            }
            if (requestModel.End != null)
            {
                query["end"] = requestModel.End.Value.ToString("o", CultureInfo.InvariantCulture);
            }
            if (!string.IsNullOrWhiteSpace(requestModel.ContinuationToken))
            {
                query["continuationToken"] = requestModel.ContinuationToken;
            }
            uriBuilder.Query = query.ToString();

            var message = new HttpRequestMessage
            {
                Method = HttpMethod.Get,
                RequestUri = uriBuilder.Uri
            };
            message.Headers.Add("Authorization", $"Bearer {_accessToken}");

            try
            {
                var response = await _apiClient.SendAsync(message);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Failed to GET events with status code {0}.", response.StatusCode);
                    return null;
                }
                var list = await response.Content.ReadFromJsonAsync<ListResponseModel<EventResponseModel>>();
                if (list?.Data?.Any() ?? false)
                {
                    responseList.AddRange(list.Data.ToList());
                }
                if (!string.IsNullOrWhiteSpace(list.ContinuationToken))
                {
                    requestModel.ContinuationToken = list.ContinuationToken;
                    await GetEventsAsync(requestModel, responseList);
                }
                return responseList;
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Failed to GET events.");
                return null;
            }
        }

        private async Task<List<MemberResponseModel>> GetMembersAsync()
        {
            var tokenStateResponse = await HandleTokenStateAsync();
            if (!tokenStateResponse)
            {
                return null;
            }

            var responseList = new List<MemberResponseModel>();
            var message = new HttpRequestMessage
            {
                Method = HttpMethod.Get,
                RequestUri = new Uri(string.Concat(_apiClient.BaseAddress, "public/members"))
            };
            message.Headers.Add("Authorization", $"Bearer {_accessToken}");

            try
            {
                var response = await _apiClient.SendAsync(message);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Failed to GET members with status code {0}.", response.StatusCode);
                    return null;
                }
                var list = await response.Content.ReadFromJsonAsync<ListResponseModel<MemberResponseModel>>();
                if (list?.Data?.Any() ?? false)
                {
                    responseList.AddRange(list.Data.ToList());
                }
                return responseList;
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Failed to GET members.");
                return null;
            }
        }

        private async Task<List<GroupResponseModel>> GetGroupsAsync()
        {
            var tokenStateResponse = await HandleTokenStateAsync();
            if (!tokenStateResponse)
            {
                return null;
            }

            var responseList = new List<GroupResponseModel>();
            var message = new HttpRequestMessage
            {
                Method = HttpMethod.Get,
                RequestUri = new Uri(string.Concat(_apiClient.BaseAddress, "public/groups"))
            };
            message.Headers.Add("Authorization", $"Bearer {_accessToken}");

            try
            {
                var response = await _apiClient.SendAsync(message);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Failed to GET groups with status code {0}.", response.StatusCode);
                    return null;
                }
                var list = await response.Content.ReadFromJsonAsync<ListResponseModel<GroupResponseModel>>();
                if (list?.Data?.Any() ?? false)
                {
                    responseList.AddRange(list.Data.ToList());
                }
                return responseList;
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Failed to GET groups.");
                return null;
            }
        }

        private async Task<List<EventLogModel>> HydrateEventsAsync(List<EventResponseModel> events)
        {
            var eventLogs = new List<EventLogModel>();
            if (!events?.Any() ?? true)
            {
                return eventLogs;
            }
            List<MemberResponseModel> members = null;
            List<GroupResponseModel> groups = null;
            foreach (var ev in events)
            {
                var e = new EventLogModel(ev);
                if (e.GroupId.HasValue)
                {
                    if (groups == null)
                    {
                        groups = await GetGroupsAsync();
                    }
                    var group = groups?.FirstOrDefault(g => g.Id == e.GroupId.Value);
                    e.GroupName = group?.Name;
                }
                if (e.MemberId.HasValue)
                {
                    if (members == null)
                    {
                        members = await GetMembersAsync();
                    }
                    var member = members?.FirstOrDefault(m => m.Id == e.MemberId.Value);
                    e.MemberName = member?.Name;
                    e.MemberEmail = member?.Email;
                }
                if (e.ActingUserId.HasValue)
                {
                    if (members == null)
                    {
                        members = await GetMembersAsync();
                    }
                    var member = members?.FirstOrDefault(m => m.UserId == e.ActingUserId.Value);
                    e.ActingUserName = member?.Name;
                    e.ActingUserEmail = member?.Email;
                }
                eventLogs.Add(e);
            }
            return eventLogs;
        }

        private async Task<bool> HandleTokenStateAsync()
        {
            if (_nextAuthAttempt.HasValue && DateTime.UtcNow > _nextAuthAttempt.Value)
            {
                return false;
            }
            _nextAuthAttempt = null;

            if (!string.IsNullOrWhiteSpace(_accessToken) && !TokenNeedsRefresh())
            {
                return true;
            }

            var requestMessage = new HttpRequestMessage
            {
                Method = HttpMethod.Post,
                RequestUri = new Uri(string.Concat(_identityClient.BaseAddress, "connect/token")),
                Content = new FormUrlEncodedContent(new Dictionary<string, string>
                {
                    { "grant_type", "client_credentials" },
                    { "scope", "api.organization" },
                    { "client_id", _eventsApiKey.ClientId },
                    { "client_secret", _eventsApiKey.ClientSecret }
                })
            };

            HttpResponseMessage response = null;
            try
            {
                response = await _identityClient.SendAsync(requestMessage);
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Unable to authenticate with identity server.");
            }

            if (response == null)
            {
                return false;
            }

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Unsuccessful token response with status code {StatusCode}", response.StatusCode);

                if (response.StatusCode == HttpStatusCode.BadRequest)
                {
                    _nextAuthAttempt = DateTime.UtcNow.AddDays(1);
                }

                if (_logger.IsEnabled(LogLevel.Debug))
                {
                    var responseBody = await response.Content.ReadAsStringAsync();
                    _logger.LogDebug("Error response body:\n{ResponseBody}", responseBody);
                }

                return false;
            }

            using var jsonDocument = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
            _accessToken = jsonDocument.RootElement.GetProperty("access_token").GetString();
            return true;
        }

        private bool TokenNeedsRefresh(int minutes = 5)
        {
            var decoded = DecodeToken();
            if (!decoded.RootElement.TryGetProperty("exp", out var expProp))
            {
                throw new InvalidOperationException("No exp in token.");
            }

            var expiration = FromEpocSeconds(expProp.GetInt64());
            return DateTime.UtcNow.AddMinutes(-1 * minutes) > expiration;
        }

        private JsonDocument DecodeToken()
        {
            if (_decodedToken != null)
            {
                return _decodedToken;
            }

            if (_accessToken == null)
            {
                throw new InvalidOperationException($"{nameof(_accessToken)} not found.");
            }

            var parts = _accessToken.Split('.');
            if (parts.Length != 3)
            {
                throw new InvalidOperationException($"{nameof(_accessToken)} must have 3 parts");
            }

            var decodedBytes = Base64UrlDecode(parts[1]);
            if (decodedBytes == null || decodedBytes.Length < 1)
            {
                throw new InvalidOperationException($"{nameof(_accessToken)} must have 3 parts");
            }

            _decodedToken = JsonDocument.Parse(decodedBytes);
            return _decodedToken;
        }

        private static DateTime FromEpocSeconds(long seconds)
        {
            return _epoc.AddSeconds(seconds);
        }

        private static byte[] Base64UrlDecode(string input)
        {
            var output = input;
            // 62nd char of encoding
            output = output.Replace('-', '+');
            // 63rd char of encoding
            output = output.Replace('_', '/');
            // Pad with trailing '='s
            switch (output.Length % 4)
            {
                case 0:
                    // No pad chars in this case
                    break;
                case 2:
                    // Two pad chars
                    output += "=="; break;
                case 3:
                    // One pad char
                    output += "="; break;
                default:
                    throw new InvalidOperationException("Illegal base64url string!");
            }

            // Standard base64 decoder
            return Convert.FromBase64String(output);
        }

        private static byte[] ComputeObjectHash(EventResponseModel e)
        {
            var bytesForHash = new List<byte>();
            var props = typeof(EventResponseModel).GetProperties();
            foreach (var prop in props)
            {
                var val = prop.GetValue(e);
                if (val == null)
                {
                    continue;
                }
                bytesForHash.AddRange(Encoding.UTF8.GetBytes(prop.Name));
                bytesForHash.AddRange(Encoding.UTF8.GetBytes(val.ToString()));
            }
            using var sha256 = SHA256.Create();
            return sha256.ComputeHash(bytesForHash.ToArray());
        }
    }
}
