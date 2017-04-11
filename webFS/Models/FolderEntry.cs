using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace webFS.Server.Models
{
    public class FolderEntry
    {
        private FileSystem _fileSystem;
        public string Id { get; set; } 
        public string Name { get; set; }
        public string Path { get; set; }
        public string Extension { get; set; }
        public DateTime DateCreated { get; set; }
        public DateTime DateModified { get; set; }
        public long Length { get; set; }
        public List<FolderEntry> Folders { get; set; } = new List<FolderEntry>();
        public List<FileEntry> Files { get; set; } = new List<FileEntry>();
        public string FileSizeSummary { get; set; }
        public bool IsFolder { get; set; } = false;
        
        internal static FolderEntry FromFolderEntry(string entry, FileSystem fileSystem)
        {
            var folder = new FolderEntry();
            folder.Id = fileSystem.GeneratePathId(entry);
            folder._fileSystem = fileSystem;
            folder.Name = System.IO.Path.GetFileName(entry);
            folder.Path = entry;
            folder.IsFolder = true;
            var info = new DirectoryInfo(entry);
            folder.DateCreated = info.CreationTime;
            folder.DateModified = info.LastWriteTime;

            foreach (var folderEntry in Directory.EnumerateDirectories(entry))
            {
                folder.Folders.Add(FromFolderEntry(folderEntry, fileSystem));
            }

            foreach (var fileEntry in Directory.EnumerateFiles(entry))
            {
                folder.Files.Add(FileEntry.FromFileEntry(fileEntry, fileSystem));
            }

            folder.FileSizeSummary = fileSystem.GetFileSizeSummary(folder.Files);

            return folder;
        }

        public override string ToString()
        {
            return Name;
        }        
    }
}