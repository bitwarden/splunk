using System.Collections.Generic;

namespace Bit.Splunk.Models
{
    public class ListResponseModel<T>
    {
        public string Object { get; set; }
        public IEnumerable<T> Data { get; set; }
        public string ContinuationToken { get; set; }
    }
}
