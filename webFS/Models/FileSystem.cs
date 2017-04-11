using Microsoft.Extensions.Options;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace webFS.Server.Models
{
    public class FileSystem
    {
        private Settings _settings;
        public string Id { get; set; } //= _settings.PathSeparator;
        public string Root { get; set; }
        public List<FolderEntry> Folders { get; set; } = new List<FolderEntry>();
        public List<FileEntry> Files { get; set; } = new List<FileEntry>();
        public bool IsLoaded { get; private set; } = false;
        //public string FileSizeSummary => FileHelper.GetFileSizeSummary(Files);

        public FileSystem(Settings settings)
        {
            _settings = settings;
            Root = _settings.FileSystemRoot;
        }

        public void Load()
        {
            foreach(var entry in Directory.EnumerateDirectories(Root))
            {
                Folders.Add(FolderEntry.FromFolderEntry(entry, this));
            }

            foreach (var entry in Directory.EnumerateFiles(Root))
            {
                Files.Add(FileEntry.FromFileEntry(entry, this));
            }

            IsLoaded = true;
        }

        public string GetFileSizeSummary(List<Models.FileEntry> files)
        {
            long totalFileLength = 0;
            files.ForEach(f => totalFileLength += f.Length);
            return FormatFileSize(totalFileLength);
        }

        public string FormatFileSize(long length)
        {
            long absolute = (length < 0 ? -length : length);

            string suffix;
            double readable;
            if (absolute >= 0x1000000000000000) // Exabyte
            {
                suffix = "EB";
                readable = (length >> 50);
            }
            else if (absolute >= 0x4000000000000) // Petabyte
            {
                suffix = "PB";
                readable = (length >> 40);
            }
            else if (absolute >= 0x10000000000) // Terabyte
            {
                suffix = "TB";
                readable = (length >> 30);
            }
            else if (absolute >= 0x40000000) // Gigabyte
            {
                suffix = "GB";
                readable = (length >> 20);
            }
            else if (absolute >= 0x100000) // Megabyte
            {
                suffix = "MB";
                readable = (length >> 10);
            }
            else if (absolute >= 0x400) // Kilobyte
            {
                suffix = "KB";
                readable = length;
            }
            else
            {
                return length.ToString("0 B"); // Byte
            }

            readable = (readable / 1024);

            return readable.ToString("0.## ") + suffix;
        }

        public void Copy(string from, string to)
        {
            if (IsDirectory(from))
            {
                //new Microsoft.VisualBasic.Devices.Computer().FileSystem.CopyDirectory(from, to);
            }
            else
            {
                var fileName = Path.GetFileName(from);
                to = Path.Combine(to, fileName);
                if (!File.Exists(to))
                    File.Copy(from, to);
            }
        }

        public bool IsDirectory(string path)
        {
            return File.GetAttributes(path).HasFlag(FileAttributes.Directory);
        }

        /// <summary>
        /// Transforms a normal path to a |-separated (url-friendly) and removes the root path
        /// This will be used client-side as a file/folder id to communicate actions to back-end
        /// </summary>
        /// <param name="path"></param>
        /// <returns></returns>
        public string GeneratePathId(string path)
        {
            path = path.Replace(_settings.FileSystemRoot, "");
            path = path.Replace(Path.DirectorySeparatorChar.ToString(), _settings.PathSeparator);
            if (string.IsNullOrEmpty(path))
                path = _settings.PathSeparator;

            return path;
        }

        /// <summary>
        /// Restores a |-separated "PathId" path with a regular '\' separator, also combining the root path to complete it
        /// </summary>
        /// <param name="path"></param>
        /// <returns></returns>
        public string RestorePath(string path)
        {
            path = path.Replace(_settings.PathSeparator, Path.DirectorySeparatorChar.ToString());
            if (path.StartsWith("\\"))
                path = path.Remove(0, 1);
            path = Path.Combine(_settings.FileSystemRoot, path);
            return path;
        }
    }
}
