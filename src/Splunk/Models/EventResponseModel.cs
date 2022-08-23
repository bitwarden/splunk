using System;

namespace Bit.Splunk.Models
{
    public class EventResponseModel
    {
        public EventResponseModel() { }

        public EventResponseModel(EventResponseModel e)
        {
            Type = e.Type;
            ItemId = e.ItemId;
            CollectionId = e.CollectionId;
            GroupId = e.GroupId;
            PolicyId = e.PolicyId;
            MemberId = e.MemberId;
            ActingUserId = e.ActingUserId;
            InstallationId = e.InstallationId;
            Date = e.Date;
            Device = e.Device;
            IpAddress = e.IpAddress;
        }

        public int Type { get; set; }
        public Guid? ItemId { get; set; }
        public Guid? CollectionId { get; set; }
        public Guid? GroupId { get; set; }
        public Guid? PolicyId { get; set; }
        public Guid? MemberId { get; set; }
        public Guid? ActingUserId { get; set; }
        public Guid? InstallationId { get; set; }
        public DateTime Date { get; set; }
        public byte? Device { get; set; }
        public string IpAddress { get; set; }
    }
}
