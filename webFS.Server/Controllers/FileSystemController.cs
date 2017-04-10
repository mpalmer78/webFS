using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using webFS.Server.Models;
using System.IO;
using System.Net.Http;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace webFS.Server.Controllers
{
    public class FileSystemController : Controller
    {
        private Settings _settings;
        private FileSystem _fileSystem;
        private IHostingEnvironment _environment;

        public FileSystemController(Settings settings, FileSystem fileSystem, IHostingEnvironment environment)
        {
            _settings = settings;
            _fileSystem = fileSystem;
            _environment = environment;
        }

        [HttpGet]
        [Route("fs/root")]
        public FileSystem GetRoot()
        {
            var root = _settings.FileSystemRoot;
            if (!_fileSystem.IsLoaded) _fileSystem.Load();
            return _fileSystem;
        }

        [HttpDelete]
        [Route("fs/delete/{fileEntry}")]
        public dynamic Delete(string fileEntry)
        {
            fileEntry = _fileSystem.RestorePath(fileEntry);
            if (System.IO.File.Exists(fileEntry))
                System.IO.File.Delete(fileEntry);
            return new { Status = "Success" };
        }

        [HttpPost]
        [Route("fs/move/{from}/to/{to}")]
        public dynamic Move(string from, string to)
        {
            from = _fileSystem.RestorePath(from);
            var name = Path.GetFileName(from);
            to = Path.Combine(_fileSystem.RestorePath(to), name);

            var fromDir = from;
            var toDir = to;

            if (!_fileSystem.IsDirectory(from))
            {
                fromDir = Directory.GetParent(from).FullName;
                toDir = Directory.GetParent(to).FullName;
            }

            if (!System.IO.File.Exists(to))
                Directory.Move(from, to);

            return new { From = FolderEntry.FromFolderEntry(fromDir, _fileSystem), To = FolderEntry.FromFolderEntry(toDir, _fileSystem) };
        }

        //[HttpGet]
        //[Route("fs/download/{file}")]
        //public HttpResponseMessage Download(string file)
        //{
        //    file = _fileSystem.RestorePath(file);

        //    if (!System.IO.File.Exists(file))
        //        return Request.CreateResponse(HttpStatusCode.Gone);

        //    var r = Request.CreateResponse(HttpStatusCode.OK);
        //    r.Content = new StreamContent(new FileStream($"{file}", FileMode.Open, FileAccess.Read));
        //    r.Content.Headers.ContentDisposition = new ContentDispositionHeaderValue("attachment");
        //    r.Content.Headers.ContentDisposition.FileName = Path.GetFileName(file);
        //    r.Content.Headers.ContentType = new MediaTypeHeaderValue(MimeMapping.GetMimeMapping(file));
        //    return r;
        //}

        [HttpPost]
        [Route("fs/copy/{from}/to/{to}")]
        public FolderEntry Copy(string from, string to)
        {
            from = _fileSystem.RestorePath(from);
            to = _fileSystem.RestorePath(to);
            var copyCount = 0;

            if (from == to)
            {
                var copyTo = to;
                var exists = false;
                while (!exists)
                {
                    exists = Directory.Exists(from);
                    if (exists)
                    {
                        copyCount++;
                        copyTo = $"{to}-Copy{copyCount}";
                        exists = Directory.Exists(copyTo);
                        if (!exists) break;
                    }
                }
                to = copyTo;
            }

            _fileSystem.Copy(from, to);

            return FolderEntry.FromFolderEntry(to, _fileSystem);
        }

        [HttpPost]
        public async Task<List<FileEntry>> Upload(ICollection<IFormFile> files)
        {
            var fileResults = new List<FileEntry>();
            var uploads = Path.Combine(_environment.WebRootPath, "uploads");
            foreach (var file in files)
            {
                if (file.Length > 0)
                {
                    using (var fileStream = new FileStream(Path.Combine(uploads, file.FileName), FileMode.Create))
                    {
                        await file.CopyToAsync(fileStream);
                    }
                }
            }
            return fileResults;
        }
    }
}