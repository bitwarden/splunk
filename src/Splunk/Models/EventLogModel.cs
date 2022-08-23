namespace Bit.Splunk.Models
{
    public class EventLogModel : EventResponseModel
    {
        public EventLogModel()
            : base() { }

        public EventLogModel(EventResponseModel e)
            : base(e)
        { }

        public string GroupName { get; set; }
        public string ActingUserName { get; set; }
        public string ActingUserEmail { get; set; }
        public string MemberName { get; set; }
        public string MemberEmail { get; set; }
    }
}
