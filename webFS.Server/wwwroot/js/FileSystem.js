"use strict";

class FileSystem {
    Load() {
        return fetch('/fs/root').then((r) => r.json());
    }

    Upload(files, destination, callback) {
        if (!files || files.length === 0) return;

        let data = new FormData();
        data.append("destination", destination);
        for (let file of files) {
            data.append("file", file, file.name);
        }

        return fetch('/fs/upload', { method: 'POST', body: data }).then((r) => r.json());
    }

    Download(entry) {
        fetch('/fs/download/' + entry + "/").then(r => r.blob());
    }

    Delete(entry) {
        return fetch('/fs/delete/' + entry + "/", { method: 'DELETE' }).then((r) => r.json());
    }

    Copy(from, to) {
        return fetch(`/fs/copy/${from}/to/${to}/`, { method: 'POST' }).then((r) => r.json());
    }
    
    Move(from, to) {
        return fetch(`/fs/move/${from}/to/${to}/`, { method: 'POST' }).then((r) => r.json());
    }
}