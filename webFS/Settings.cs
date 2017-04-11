using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Threading.Tasks;

namespace webFS.Server
{
    public class Settings
    {
        public string FileSystemRoot { get; set; }
        public string PathSeparator { get; set; }
    }
}
