using System;
using System.Collections.Generic;
using System.Linq;

namespace webFS.Server.Models
{
    public class FileEntry
    {
        private FileSystem _fileSystem;
        public string Id { get; set; } //=> _fileHelper.GeneratePathId(Path);
        public string Name { get; set; }
        public string Path { get; set; }
        public string Extension { get; set; }
        public DateTime DateCreated { get; set; }
        public DateTime DateModified { get; set; }
        public long Length { get; set; }        
        public string FileType => GetFileType();
        public string Size { get; set; } //=> _fileHelper.FormatFileSize(Length);

        internal static FileEntry FromFileEntry(string fileEntry, FileSystem fileSystem)
        {
            var f = new FileEntry();
            f._fileSystem = fileSystem;
            var fi = new System.IO.FileInfo(fileEntry);
            f.Name = fi.Name;
            f.Path = fi.FullName;
            f.Extension = fi.Extension;
            f.DateCreated = fi.CreationTime;
            f.DateModified = fi.LastWriteTime;
            f.Length = fi.Length;
            return f;
        }

        public override string ToString()
        {
            return Name;
        }        

        private string GetFileType()
        {
            if (string.IsNullOrEmpty(Extension)) return "Unknown";

            switch (Extension.ToLower())
            {
                case ".xls":
                case ".xlsx":
                    return "Excel";
                case ".doc":
                case ".docx":
                    return "Word";
                case ".ppt":
                case ".pptx":
                    return "PowerPoint";
                case ".txt":
                case ".rtf":
                    return "Text";
                case ".pdf":
                    return "PDF";
                case ".zip":
                case ".7z":
                    return "Zip";
                case ".jpg":
                case ".jpeg":
                case ".png":
                case ".bmp":
                case ".gif":
                    return "Image";
                case ".mp4":
                case ".mov":
                case ".wmv":
                    return "Video";
                case ".mp3":
                case ".wav":
                case ".wma":
                    return "Audio";
                case ".htm":
                case ".html":
                    return "HTML";
                case ".xml":
                    return "XML";
                case ".cs":
                case ".vb":
                case ".js":
                    return "Code";
                default:
                    return Extension.Replace(".", "");
            }
        }
    }
}