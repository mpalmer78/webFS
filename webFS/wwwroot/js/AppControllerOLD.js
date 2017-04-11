"use strict";

class AppController {
    constructor(fileSystem, folderTreeId, fileGridId, window, $) {
        this.fileSystem = fileSystem;
        this.folderTreeId = folderTreeId;
        this.fileGridId = fileGridId;
        this.window = window;
        this.currentFolder = "|"; //root
        this.$ = $;
    }

    Initialize() {
        this._loadFileSystem(() => {
            this._bindEventListeners();
            this._deepLink();
            $("#notes").show();
        });
    }

    _bindEventListeners() {
        window.onhashchange = () => this._deepLink();

        window.addEventListener("dragover", (e) => e.preventDefault(), false);
        window.addEventListener("drop", (e) => e.preventDefault(), false);   

        document.addEventListener("drop", (e) => this._handleFileDrop(e), false);
        document.addEventListener("dragenter", (e) => this._highlightDropArea(true), false);

        $(".menu-open").click((e) => this._onOpenClicked(e));
        $(".menu-copy").click((e) => this._onCopyClicked(e));
        $(".menu-cut").click((e) => this._onCutClicked(e));
        $(".menu-paste").click((e) => this._onPasteClicked(e));
        $(".menu-delete").click((e) => this._onDeleteClicked(e));
        
        //hide any open right-click menus
        $("html").on("click", function () {
            $(".menu").hide();
        });

        this._bindTreeEvents();
        this._bindGridRowEvents();
    }

    _onOpenClicked(e) {
        let element = $(e.currentTarget);
        let id = element.data('id');
        let type = element.data('type');
        if (type === 'folder') {
            this._openFolder(id);
        }
        else {
            this._openFile(id);
        }
    }

    _onGridDragEnter(e) {
        this._highlightDropArea(true);
    }

    _onGridDragLeave(e) {
        this._highlightDropArea(false);
    }

    _highlightDropArea(highlight) {
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
        setTimeout(() => this._highlightDropArea(false), 3000);
    }

    _handleFileDrop(e) {
        e.preventDefault();

        console.log("drop");

        this._highlightDropArea(false);

        let files = e.dataTransfer.files;
        if (files.length === 0) return;

        this.fileSystem.Upload(files, this.currentFolder).then((fileResults) => {
            this._appendFilesToGrid(fileResults);
        });
    }

    _deepLink() {
        let folderId = this._getFolderIdFromHash();
        this._displayFolder(folderId);
    }

    _displayFolder(folderId) {
        this._openFolder(folderId);

        this._displaySelectedTreeFolder(folderId);
    }

    _displaySelectedTreeFolder(folderId) {
        if (!folderId) return;
        $(this.folderTreeId + " .folder.selected").removeClass("selected");
        let folderNode = $("li[data-id='" + folderId + "'").addClass("selected");
    }

    _getFolderIdFromHash() {
        let path = location.hash.substring(1);
        path = decodeURI(path);

        //folder ids start with a |
        //prepend if not there
        if (path.charAt(0) !== "|")
            path = "|" + path;

        return path;
    }

    _appendFilesToGrid(files) {
        if (!files || files.length === 0) return;
        var g = [];
        for(let file of files) {
            this._generateGridRowHtml_File(g, file);
        }
        if (g.length === 0) return;
        let tbody = $(this.fileGridId + " tbody");
        let fileHtml = g.join("\n");
        tbody.append(fileHtml);
    }

    _showStatus(msg) {
        let status = $("#status-message");
        status.text(msg);
        setTimeout(() => status.text(""), 3000);
    }

    _bindTreeEvents() {
        $(this.folderTreeId + " li").click((e) => this._onTreeFolderSelected(e));
    }

    _bindGridRowEvents() {
        let gridRows = $(this.fileGridId + " tr");
        
        gridRows
        .on("click", (e) => this._onGridRowSelected(e))
        .on("dblclick", (e) => this._onGridRowDoubleClick(e))
        .on("contextmenu", (e) => this._onGridRowRightClick(e));
   }

    _onGridRowRightClick(e) {
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

        this._onGridRowSelected(e);

        menu.show();
    }
 
    _onCopyClicked(e) {
        if (!this.selectedGridRow) return;
        var id = $(this.selectedGridRow).data("id");
        this.clipboard = { "id": id, "isCopy": true, "isCut": false };
        $(".menu-paste").removeClass("disabled");
        this._showStatus("Copied to clipboard!");
    }

    _onPasteClicked(e) {
        if (!this.clipboard) return;
        if (!this.selectedGridRow) return;
        var from = this.clipboard.id;
        var to = $(this.selectedGridRow).data("id");
        if (this.clipboard.isCopy) {
            //copy / paste
            this.fileSystem.Copy(from, to).then((results) => {
               this._updateFolder(results);
               console.log("pasted copy");
               $(".menu-paste").addClass("disabled");
               this.clipboard = null;
            });
        }
        else {
            //cut / paste
            this.fileSystem.Move(from, to).then((results) => {
               this._updateFolder(results.From);
               this._updateFolder(results.To);
               $(".menu-paste").addClass("disabled");
               this.clipboard = null;
            });
        }        
    }

    _updateFolder(folder) {
        var folderToUpdate = this._getFolderById(folder.Id);
        folderToUpdate.Folders = folder.Folders;
        folderToUpdate.Files = folder.Files;
        
        if (this.currentFolder === folderToUpdate.Id)
            this._displayFolder(folderToUpdate.Id);
    }

    _onCutClicked(e) {
        if (!this.selectedGridRow) return;
        var id = $(this.selectedGridRow).data("id");
        this.clipboard = { "id": id, "isCopy": false, "isCut": true };
        $(".menu-paste").removeClass("disabled");
        this._showStatus("Copied to clipboard!");
    }

    _onDeleteClicked(e) {
        if (!this.selectedGridRow) return;

        var id = $(this.selectedGridRow).data("id");

        if (!confirm("OK to delete this file?")) return;

        this.fileSystem.Delete(id).then(() => $(this.selectedGridRow).remove());
    }

    _onGridRowSelected(e) {
        $(this.fileGridId + " .selected").removeClass("selected");
        $(e.currentTarget).addClass("selected");
        this.selectedGridRow = e.currentTarget;
    }

    _onGridRowDoubleClick(e) {
        let element = $(e.currentTarget);
        let id = element.data('id');
        let type = element.data('type');
        if (type === 'folder') {
            this._openFolder(id);
        }
        else {
            this._openFile(id);
        }
    }

    _onTreeFolderSelected(e) {
        $(this.folderTreeId + " .folder.selected").removeClass("selected");
        let folderElement = $(e.currentTarget);
        folderElement.addClass("selected");
        let folderId = folderElement.data('id');
        this._openFolder(folderId);
    }

    _openFile(fileId) {        
        var path = `/fs/download/${encodeURI(fileId)}/`;
        this.window.location = path;
    }

    _openFolder(folderId) {
        let theFolder = this._getFolderById(folderId);

        if (!theFolder) return;

        this.currentFolder = folderId;

        //load the grid
        let grid = [];
        for(let folder of theFolder.Folders) {
            this._generateGridRowHtml_Folder(grid, folder);
        }
        for(let file of theFolder.Files) {
            this._generateGridRowHtml_File(grid, file);
        }

        let gridHtml = grid.join("\n");
        let tbody = $(this.fileGridId + " tbody");

        tbody.empty();
        tbody.append(gridHtml);

        this._bindGridRowEvents();

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

    _getFolderById(folderId) {
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
                this._findFolder(folderId, folder, (found) => theFolder = found);
            }
        }
        return theFolder;
    }

    _findFolder(folderId, folder, callback) {
        for (let subFolder of folder.Folders) {
            if (subFolder.Id === folderId) {
                callback(subFolder);
                return;
            }
            this._findFolder(folderId, subFolder, callback);
        }
    }

    _loadFileSystem(doneCallback) {
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
            for(let folder of this.fsRoot.Folders) {

            //tree folders
                t.push(`<li class='folder' data-id='${folder.Id}'><span>${folder.Name}</span></li>`);
                this._generateTreeHtml_Folder(t, folder);

            //grid folders
                this._generateGridRowHtml_Folder(g, folder);
            }
            t.push(" </ul>");
            t.push("</ul>");
            $(this.folderTreeId).html(t.join("\n"));

            //grid files
            for(let file of this.fsRoot.Files) {
                this._generateGridRowHtml_File(g, file);
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

    _generateGridRowHtml_Folder(g, folder) {
        g.push(`<tr data-id='${folder.Id}' data-type='folder'>`);
        g.push(' <td class="row-icon-folder">&#xf07b;</td>');
        g.push(` <td>${folder.Name}</td>`);
        g.push(` <td>${new Date(folder.DateCreated).toLocaleString().replace(',', '')}</td>`);
        g.push(' <td>File folder</td>');
        g.push(' <td></td>');
        g.push("</tr>");
    }

    _generateGridRowHtml_File(g, file) {
        g.push(`<tr data-id='${file.Id}' data-type='file'>`);
        g.push(` <td class="row-icon-file">${this._getFileTypeIcon(file)}</td>`);
        g.push(` <td>${file.Name}</td>`);
        g.push(` <td>${new Date(file.DateCreated).toLocaleString().replace(',', '')}</td>`);
        g.push(` <td>${file.FileType}</td>`);
        g.push(` <td>${file.Size}</td>`);
        g.push("</tr>");
    }

    _generateTreeHtml_Folder(tree, subFolder) {
        if (!subFolder.Folders || subFolder.Folders.length === 0) return;

        tree.push("<ul>");
        for(let folder of subFolder.Folders) {
            tree.push(`<li class='folder' data-id='${folder.Id}'><span>${folder.Name}</span></li>`);
            this._generateTreeHtml_Folder(tree, folder);
        }
        tree.push("</ul>");
    }

    _getFileTypeIcon(file) {
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

