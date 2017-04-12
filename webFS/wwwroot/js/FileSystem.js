"use strict";

function FileSystem() {

    if (!FileSystem.prototype.Load) {
        FileSystem.prototype.Load = Load;
        FileSystem.prototype.Upload = Upload;
        FileSystem.prototype.Download = Download;
        FileSystem.prototype.Delete = Delete;
        FileSystem.prototype.Copy = Copy;
        FileSystem.prototype.Move = Move;
        return;
    }

    function Load() {
        return fetch('/fs/root').then(r => r.json());
    }

    function Upload(files, destination, callback) {
        if (!files || files.length === 0) return;

        let data = new FormData();
        data.append("destination", destination);
        for (let file of files) {
            data.append("file", file, file.name);
        }

        return fetch('/fs/upload', { method: 'POST', body: data }).then(r => r.json());
    }

    function Download(entry) {
        fetch('/fs/download/' + entry + "/").then(r => r.blob());
    }

    function Delete(entry) {
        return fetch('/fs/delete/' + entry + "/", { method: 'DELETE' }).then(r => r.json());
    }

    function Copy(from, to) {
        return fetch(`/fs/copy/${from}/to/${to}/`, { method: 'POST' }).then(r => r.json());
    }

    function Move(from, to) {
        return fetch(`/fs/move/${from}/to/${to}/`, { method: 'POST' }).then(r => r.json());
    }
}