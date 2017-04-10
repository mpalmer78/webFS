var AppController = function (folderTreeId) {

    let folderTreeElement = document.getElementById(folderTreeId);

    if (!folderTreeElement) throw "Element Id '" + folderTreeId + "' not found.";

    let fileSystem = new FileSystem();
    fileSystem.load().then(() => {
        bindViewEvents();
    })

    function bindViewEvents() {
        window.onhashchange = () => deepLink();

        window.addEventListener("dragover", e => e.preventDefault(), false);
        window.addEventListener("drop", (e) => e.preventDefault(), false);

        document.addEventListener("drop", (e) => handleFileDrop(e), false);
        document.addEventListener("dragenter", (e) => highlightDropArea(true), false);

        let subs = folderTreeElement.getElementsByClassName("folder");
        for (let sub of subs) {
            sub.addEventListener("dblclick", onTreeFolderDoubleClick);
        }

        document.getElementsByClassName("menu-open").addEventListener("click", e => onOpenClicked(e));
        document.getElementsByClassName("menu-copy").addEventListener("click", e => onCopyClicked(e));
        document.getElementsByClassName("menu-cut").addEventListener("click", e => onCutClicked(e));
        document.getElementsByClassName("menu-paste").addEventListener("click", e => onPasteClicked(e));
        document.getElementsByClassName("menu-delete").addEventListener("click", e => onDeleteClicked(e));

        //hide any open right-click menus
        document.getElementsByName("html").addEventListener("click", () => {
            let menu = document.getElementsByClassName("menu");
            if (menu.style.display === 'none') {
                menu.style.display = 'block';
            } else {
                menu.style.display = 'none';
            }
        });

        bindTreeEvents();
        bindGridRowEvents();
    }

    function onTreeFolderDoubleClick(e) {
        e.stopPropagation();
        new Folder(e.currentTarget).ToggleExpand();
    }

    function onOpenClicked(e) {
        let element = $(e.currentTarget);
        let id = element.data('id');
        let type = element.data('type');
        if (type === 'folder') {
            openFolder(id);
        }
        else {
            openFile(id);
        }
    }

    function onGridDragEnter(e) {
        highlightDropArea(true);
    }

    function onGridDragLeave(e) {
        highlightDropArea(false);
    }

    function highlightDropArea(highlight) {
        let grid = document.getElementById("main-grid");
        if (highlight) {
            grid.style.borderStyle = "dashed";
            grid.style.borderColor = "red";
            grid.style.borderWidth = "2px";
        }
        else {
            grid.style.borderStyle = "";
            grid.style.borderColor = "";
            grid.style.borderWidth = "";
        }
        //html5 drag drop is quirky
        //this just makes sure we don't highlight forever
        setTimeout(() => highlightDropArea(false), 5000);
    }

    function handleFileDrop(e) {
        e.preventDefault();

        highlightDropArea(false);

        let files = e.dataTransfer.files;
        if (files.length === 0) return;

        this.fileSystem.Upload(files, this.currentFolder).then((fileResults) => {
            appendFilesToGrid(fileResults);
        });
    }

    function deepLink() {
        let folderId = getFolderIdFromHash();
        displayFolder(folderId);
    }

    function displayFolder(folderId) {
        openFolder(folderId);
        displaySelectedTreeFolder(folderId);
    }

    function displaySelectedTreeFolder(folderId) {
        if (!folderId) return;
        let currentFolder = document.querySelector(this.folderTreeId + " .folder.selected");
        if (currentFolder) {
            currentFolder.classList.remove("selected");
        }

        let selectedFolder = document.querySelector("li[data-id='" + folderId + "'");
        if (selectedFolder) {
            selectedFolder.classList.add("selected");
        }
    }

    function getFolderIdFromHash() {
        let path = location.hash.substring(1);
        path = decodeURI(path);

        //folder ids start with a |
        //prepend if not there
        if (path.charAt(0) !== "|")
            path = "|" + path;

        return path;
    }

    function appendFilesToGrid(files) {
        if (!files || files.length === 0) return;
        var g = [];
        for (let file of files) {
            generateGridRowHtml_File(g, file);
        }
        if (g.length === 0) return;
        let tbody = $(this.fileGridId + " tbody");
        let fileHtml = g.join("\n");
        tbody.append(fileHtml);
    }

    function showStatus(msg) {
        let status = $("#status-message");
        status.text(msg);
        setTimeout(() => status.text(""), 3000);
    }

    function bindTreeEvents() {
        $(this.folderTreeId + " li").click((e) => onTreeFolderSelected(e));
    }

    function bindGridRowEvents() {
        let gridRows = $(this.fileGridId + " tr");

        gridRows
            .on("click", (e) => onGridRowSelected(e))
            .on("dblclick", (e) => onGridRowDoubleClick(e))
            .on("contextmenu", (e) => onGridRowRightClick(e));
    }

    function onGridRowRightClick(e) {
        e.preventDefault();

        let menu = $(".menu");

        //hide menu if already shown
        menu.hide();

        //open menu div near mouse clicked area
        let pageX = e.pageX;
        let pageY = e.pageY;
        menu.css({ top: pageY, left: pageX });

        let menuWidth = menu.width();
        let menuHeight = menu.height();
        let screenWidth = $(window).width();
        let screenHeight = $(window).height();
        let scrollTop = $(window).scrollTop();

        //if the menu is close to right edge of the window
        if (pageX + menuWidth > screenWidth) {
            menu.css({ left: pageX - menuWidth });
        }

        //if the menu is close to bottom edge of the window
        if (pageY + menuHeight > screenHeight + scrollTop) {
            menu.css({ top: pageY - menuHeight });
        }

        onGridRowSelected(e);

        menu.show();
    }

    function onCopyClicked(e) {
        if (!this.selectedGridRow) return;
        var id = $(this.selectedGridRow).data("id");
        this.clipboard = { "id": id, "isCopy": true, "isCut": false };
        $(".menu-paste").removeClass("disabled");
        showStatus("Copied to clipboard!");
    }

    function onPasteClicked(e) {
        if (!this.clipboard) return;
        if (!this.selectedGridRow) return;
        var from = this.clipboard.id;
        var to = $(this.selectedGridRow).data("id");
        if (this.clipboard.isCopy) {
            //copy / paste
            this.fileSystem.Copy(from, to).then((results) => {
                updateFolder(results);
                console.log("pasted copy");
                $(".menu-paste").addClass("disabled");
                this.clipboard = null;
            });
        }
        else {
            //cut / paste
            this.fileSystem.Move(from, to).then((results) => {
                updateFolder(results.From);
                updateFolder(results.To);
                $(".menu-paste").addClass("disabled");
                this.clipboard = null;
            });
        }
    }

    function updateFolder(folder) {
        var folderToUpdate = getFolderById(folder.Id);
        folderToUpdate.Folders = folder.Folders;
        folderToUpdate.Files = folder.Files;

        if (this.currentFolder === folderToUpdate.Id)
            displayFolder(folderToUpdate.Id);
    }

    function onCutClicked(e) {
        if (!this.selectedGridRow) return;
        var id = $(this.selectedGridRow).data("id");
        this.clipboard = { "id": id, "isCopy": false, "isCut": true };
        $(".menu-paste").removeClass("disabled");
        showStatus("Copied to clipboard!");
    }

    function onDeleteClicked(e) {
        if (!this.selectedGridRow) return;

        var id = $(this.selectedGridRow).data("id");

        if (!confirm("OK to delete this file?")) return;

        this.fileSystem.Delete(id).then(() => $(this.selectedGridRow).remove());
    }

    function onGridRowSelected(e) {
        $(this.fileGridId + " .selected").removeClass("selected");
        $(e.currentTarget).addClass("selected");
        this.selectedGridRow = e.currentTarget;
    }

    function onGridRowDoubleClick(e) {
        let element = $(e.currentTarget);
        let id = element.data('id');
        let type = element.data('type');
        if (type === 'folder') {
            openFolder(id);
        }
        else {
            openFile(id);
        }
    }

    function onTreeFolderSelected(e) {
        $(this.folderTreeId + " .folder.selected").removeClass("selected");
        let folderElement = $(e.currentTarget);
        folderElement.addClass("selected");
        let folderId = folderElement.data('id');
        openFolder(folderId);
    }

    function openFile(fileId) {        
        var path = `/fs/download/${encodeURI(fileId)}/`;
        this.window.location = path;
    }

    function openFolder(folderId) {
        let theFolder = getFolderById(folderId);

        if (!theFolder) return;

        this.currentFolder = folderId;

        //load the grid
        let grid = [];
        for (let folder of theFolder.Folders) {
            generateGridRowHtml_Folder(grid, folder);
        }
        for (let file of theFolder.Files) {
            generateGridRowHtml_File(grid, file);
        }

        let gridHtml = grid.join("\n");
        let tbody = $(this.fileGridId + " tbody");

        tbody.empty();
        tbody.append(gridHtml);

        bindGridRowEvents();

        //update footer stats
        let folderCount = theFolder.Folders.length;
        let fileCount = theFolder.Files.length;
        let itemCount = folderCount + fileCount;
        $(this.fileGridId + " #item-count").text(`${itemCount} items - (${folderCount} folders | ${fileCount} files )`);
        $(this.fileGridId + " #files-size").text(`${theFolder.FileSizeSummary}`);

        //update hash path
        let path = encodeURI(folderId);
        path = path.replace(/%7C/g, "|");
        location.hash = "#" + path;
    }

    function getFolderById(folderId) {
        let theFolder;
        if (folderId === "|") {
            theFolder = this.fsRoot; //at root
        }
        else {
            for (let folder of this.fsRoot.Folders) {
                if (folder.Id === folderId) {
                    theFolder = folder;
                    break;
                }
                //didn't find in the first level, search lower levels
                findFolder(folderId, folder, (found) => theFolder = found);
            }
        }
        return theFolder;
    }

    function findFolder(folderId, folder, callback) {
        for (let subFolder of folder.Folders) {
            if (subFolder.Id === folderId) {
                callback(subFolder);
                return;
            }
            findFolder(folderId, subFolder, callback);
        }
    }

    function loadFileSystem(doneCallback) {
        this.fileSystem.Load().then((fs) => {
            this.fsRoot = fs;
            $(this.folderTreeId).empty();

            //grid table header
            let g = [];
            g.push("<table>");
            g.push(" <thead>");
            g.push("  <tr>");
            g.push("   <th class='row-icon-folder'></th>");
            g.push("   <th>Name</th>");
            g.push("   <th>Date modified</th>");
            g.push("   <th>Type</th>");
            g.push("   <th>Size</th>");
            g.push(" </tr>");
            g.push(" </thead>");
            g.push("<tbody>");

            //tree header
            let t = [];
            t.push("<ul>");
            t.push(` <li class='folder root selected' data-id='|'><span>${fs.Root}</span></li>`);
            t.push("  <ul>");

            //tree and grid folders
            for (let folder of this.fsRoot.Folders) {

                //tree folders
                t.push(`<li class='folder' data-id='${folder.Id}'><span>${folder.Name}</span></li>`);
                generateTreeHtml_Folder(t, folder);

                //grid folders
                generateGridRowHtml_Folder(g, folder);
            }
            t.push(" </ul>");
            t.push("</ul>");
            $(this.folderTreeId).html(t.join("\n"));

            //grid files
            for (let file of this.fsRoot.Files) {
                generateGridRowHtml_File(g, file);
            }
            g.push(" </tbody>");

            g.push(" <tfoot>");
            g.push("  <tr>");
            g.push("   <td></td>");
            g.push("   <td colspan='3'><span id='item-count'></span></td>");
            g.push("   <td colspan='2'><span id='files-size'></span></td>");
            g.push("  </tr>");
            g.push(" </tfoot>");

            g.push("</table>");
            let gridHtml = g.join("\n");
            $(this.fileGridId).html(gridHtml);
            this.currentFolder = "|"; //root
            doneCallback();
        });
    }

    function generateGridRowHtml_Folder(g, folder) {
        g.push(`<tr data-id='${folder.Id}' data-type='folder'>`);
        g.push(' <td class="row-icon-folder">&#xf07b;</td>');
        g.push(` <td>${folder.Name}</td>`);
        g.push(` <td>${new Date(folder.DateCreated).toLocaleString().replace(',', '')}</td>`);
        g.push(' <td>File folder</td>');
        g.push(' <td></td>');
        g.push("</tr>");
    }

    function generateGridRowHtml_File(g, file) {
        g.push(`<tr data-id='${file.Id}' data-type='file'>`);
        g.push(` <td class="row-icon-file">${getFileTypeIcon(file)}</td>`);
        g.push(` <td>${file.Name}</td>`);
        g.push(` <td>${new Date(file.DateCreated).toLocaleString().replace(',', '')}</td>`);
        g.push(` <td>${file.FileType}</td>`);
        g.push(` <td>${file.Size}</td>`);
        g.push("</tr>");
    }

    function generateTreeHtml_Folder(tree, subFolder) {
        if (!subFolder.Folders || subFolder.Folders.length === 0) return;

        tree.push("<ul>");
        for (let folder of subFolder.Folders) {
            tree.push(`<li class='folder' data-id='${folder.Id}'><span>${folder.Name}</span></li>`);
            generateTreeHtml_Folder(tree, folder);
        }
        tree.push("</ul>");
    }

    function getFileTypeIcon(file) {
        switch (file.FileType.toLowerCase()) {
            case "excel":
                return "&#xf1c3;";
            case "pdf":
                return "&#xf1c1;";
            case "sound":
                return "&#xf1c7;";
            case "word":
                return "&#xf1c2;";
            case "image":
                return "&#xf1c5;";
            case "text":
                return "&#xf15c;";
            case "zip":
                return "&#xf1c6;";
            case "video":
                return "&#xf1c8;";
            case "code":
                return "&#xf1c9;";
            case "pptx":
                return "&#xf1c4;";
            default:
                return "&#xf016;";
        }

    }
}


function Folder(sourceElement) {
    if (Folder.prototype.ToggleExpand) return;

    Folder.prototype.ToggleExpand = function () {
        if (sourceElement.classList.contains("expanded")) {
            sourceElement.classList.remove("expanded");
            sourceElement.classList.add("collapsed");
        }
        else {
            sourceElement.classList.remove("collapsed");
            sourceElement.classList.add("expanded");
        }
    }
}

function FileSystem() {

    if (!FileSystem.prototype.Load)
    {
        FileSystem.prototype.Load = Load;
        FileSystem.prototype.Upload = Upload;
        FileSystem.prototype.Download = Download;
        FileSystem.prototype.Delete = Delete;
        FileSystem.prototype.Copy = Copy;
        FileSystem.prototype.Move = Move;
        return;
    }

    function Load() {
        return fetch('/fs/root').then((r) => r.json());
    }

    function Upload(files, destination, callback) {
        if (!files || files.length === 0) return;

        let data = new FormData();
        data.append("destination", destination);
        for (let file of files) {
            data.append("file", file, file.name);
        }

        return fetch('/fs/upload', { method: 'POST', body: data }).then((r) => r.json());
    }

    function Download(entry) {
        fetch('/fs/download/' + entry + "/").then(r => r.blob());
    }

    function Delete(entry) {
        return fetch('/fs/delete/' + entry + "/", { method: 'DELETE' }).then((r) => r.json());
    }

    function Copy(from, to) {
        return fetch(`/fs/copy/${from}/to/${to}/`, { method: 'POST' }).then((r) => r.json());
    }

    function Move(from, to) {
        return fetch(`/fs/move/${from}/to/${to}/`, { method: 'POST' }).then((r) => r.json());
    }
}