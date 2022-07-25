using System;

namespace Bit.Splunk.Models
{
    public class EventRequestModel
    {
        public DateTime? Start { get; set; }
        public DateTime? End { get; set; }
        public Guid? ActingUserId { get; set; }
        public Guid? ItemId { get; set; }
        public string ContinuationToken { get; set; }
    }
}
