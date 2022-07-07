using System;
using System.Globalization;

namespace Bit.Splunk
{
    public class Program
    {
        static void Main(string[] args)
        {
            var rnd = new Random();
            Console.WriteLine(DateTime.UtcNow.ToString("o", CultureInfo.InvariantCulture) + 
                " Hello World! " + rnd.Next());
        }
    }
}
