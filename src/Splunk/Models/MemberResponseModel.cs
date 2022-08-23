using System;

namespace Bit.Splunk.Models
{
    public class MemberResponseModel
    {
        public Guid Id { get; set; }
        public Guid? UserId { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public bool TwoFactorEnabled { get; set; }
        public short Status { get; set; }
        public byte? Type { get; set; }
        public bool? AccessAll { get; set; }
        public string ExternalId { get; set; }
        public bool ResetPasswordEnrolled { get; set; }
    }
}
