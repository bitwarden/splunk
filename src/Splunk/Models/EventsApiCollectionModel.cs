using System;
using System.Text.Json.Serialization;

namespace Bit.Splunk.Models
{
    public class EventsApiCollectionModel
    {
        [JsonPropertyName("last_log_date")]
        public DateTime? LastLogDate { get; set; }
        [JsonPropertyName("_key")]
        public string Key { get; set; }
        [JsonPropertyName("_user")]
        public string User { get; set; }
    }
}
