using System;

namespace Bit.Splunk.Models
{
    public class GroupResponseModel
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public bool? AccessAll { get; set; }
        public string ExternalId { get; set; }
    }
}
