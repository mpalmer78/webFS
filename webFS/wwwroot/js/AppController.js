"option strict";

var AppController = function (folderTreeId, fileGridId, contextMenuId) {

    //currently selected folder
    let _currentFolder;

    //currently selected grid row
    let _selectedGridRow;

    //root FileSystem instance
    let _fsRoot;

    let _folderTreeElement = document.getElementById(folderTreeId);

    if (!_folderTreeElement) throw "Element Id '" + folderTreeId + "' not found.";

    loadFileSystem(new FileSystem()).then(() => bindViewEvents());

    function bindViewEvents() {
        window.onhashchange = () => deepLink();

        window.addEventListener("dragover", e => e.preventDefault(), false);
        window.addEventListener("drop", e => e.preventDefault(), false);

        document.addEventListener("drop", e => handleFileDrop(e), false);
        document.addEventListener("dragenter", e => highlightDropArea(true), false);

        let subs = _folderTreeElement.getElementsByClassName("folder");
        for (let sub of subs) {
            sub.addEventListener("dblclick", onTreeFolderDoubleClick);
        }

        //document.querySelector('#' + contextMenuId + ".menu-open").addEventListener("click", e => onOpenClicked(e));
        document.querySelector('#' + contextMenuId + " .menu-copy").addEventListener("click", e => onCopyClicked(e));
        document.querySelector('#' + contextMenuId + " .menu-cut").addEventListener("click", e => onCutClicked(e));
        document.querySelector('#' + contextMenuId + " .menu-paste").addEventListener("click", e => onPasteClicked(e));
        document.querySelector('#' + contextMenuId + " .menu-delete").addEventListener("click", e => onDeleteClicked(e));

        //hide any open right-click menus
//         document.getElementsByTagName("html")[0].addEventListener("click", () => {
//             let menus = document.getElementsByClassName("menu");
//             for(let menu of menus) {
//                 if (menu.style.display === 'none') {
//                     menu.style.display = 'block';
//                 }
//                 else {
//                     menu.style.display = 'none';
//                 }
//             }
//         });

        bindTreeEvents();
        bindGridRowEvents();
    }

    function onTreeFolderDoubleClick(e) {
        e.stopPropagation();
        ToggleFolderExpansion(e.currentTarget);
    }

    function ToggleFolderExpansion(folderElement) {
        if (folderElement.classList.contains("expanded")) {
            folderElement.classList.remove("expanded");
            folderElement.classList.add("collapsed");
        }
        else {
            folderElement.classList.remove("collapsed");
            folderElement.classList.add("expanded");
        }
    }

    function onOpenClicked(e) {
        let gridRow = e.currentTarget;
        let id = gridRow.dataset.id;
        if (gridRow.dataset.type === 'folder') {
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
    }

    function handleFileDrop(e) {
        e.preventDefault();

        highlightDropArea(false);

        let files = e.dataTransfer.files;
        if (files.length === 0) return;

        fileSystem.Upload(files, _currentFolder).then((fileResults) => {
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
        let current = document.querySelector(folderTreeId + " .folder.selected");
        if (current) {
            current.classList.remove("selected");
        }

        let selected = document.querySelector("li[data-id='" + folderId + "'");
        if (selected) {
            selected.classList.add("selected");
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
        let g = [];
        for (let file of files) {
            generateGridRowHtml_File(g, file);
        }
        if (g.length === 0) return;
        //let tbody = $(this.fileGridId + " tbody");
        let tbody = document.querySelector(fileGridId + " tbody");
        let filesHtml = g.join("\n");
        tbody.insertAdjacentHTML('beforeend', filesHtml);
    }

    function showStatus(msg) {
        let status = document.getElementById("status-message");
        status.innerText = msg;
        //show msg for 5 secs
        setTimeout(() => status.innerText = "", 5000);
    }

    function bindTreeEvents() {
        let treeFolders = document.querySelectorAll("#" + folderTreeId + " li");
        for (let folder of treeFolders) {
            folder.addEventListener('click', e => onTreeFolderSelected(e));
        }
        //$(this.folderTreeId + " li").click((e) => onTreeFolderSelected(e));
    }

    function bindGridRowEvents() {
        let gridRows = document.querySelectorAll("#" + fileGridId + " tr");
        //let gridRows = $(this.fileGridId + " tr");
        for (let row of gridRows) {
            row.addEventListener("click", e => onGridRowSelected(e));
            row.addEventListener("dblclick", e => onGridRowDoubleClick(e));
            row.addEventListener("contextmenu", e => onGridRowRightClick(e));
        }        
    }

    function onGridRowRightClick(e) {
        e.preventDefault();

        //let menu = $(".menu");
        let menu = document.getElementById(contextMenuId);

        //hide menu if already shown
        menu.style.display = "none";

        //position menu div near mouse clicked area
        let pageX = e.pageX;
        let pageY = e.pageY;
        menu.style.top = pageY;
        menu.style.left = pageX;

        let menuWidth = 100;
        let menuHeight = 200;
        let screenWidth = window.innerWidth;
        let screenHeight = window.innerHeight;
        let scrollTop = 0;//window.scrollTop;

        //if the menu is close to right edge of the window
        if (pageX + menuWidth > screenWidth) {
            menu.style.left = pageX - menuWidth + "px";
        }

        //if the menu is close to bottom edge of the window
        if (pageY + menuHeight > screenHeight + scrollTop) {
            menu.style.top = pageY - menuHeight + "px";
        }

        onGridRowSelected(e);
        
        menu.style.display = "block";
    }

    function onCopyClicked(e) {
        if (!_selectedGridRow) return;
        let id = _selectedGridRow.dataset.id;
        clipboard = { "id": id, "isCopy": true, "isCut": false };
        document.queryselector(".menu-paste").classList.removeClass("disabled");
        showStatus("Copied to clipboard!");
    }

    function onPasteClicked(e) {
        if (!clipboard) return;
        if (!_selectedGridRow) return;
        let from = clipboard.id;
        let to = _selectedGridRow.dataset.id;
        let menuPaste = document.querySelector(".menu-paste");
        if (clipboard.isCopy) {
            //copy / paste
            fileSystem.Copy(from, to).then(results => {
                updateFolder(results);
                console.log("pasted copy");
                menuPaste.classList.add("disabled");
                clipboard = null;
            });
        }
        else {
            //cut / paste
            fileSystem.Move(from, to).then(results => {
                updateFolder(results.From);
                updateFolder(results.To);
                menuPaste.classList.add("disabled");
                clipboard = null;
            });
        }
    }

    function updateFolder(folder) {
        let folderToUpdate = getFolderById(folder.Id);
        folderToUpdate.Folders = folder.Folders;
        folderToUpdate.Files = folder.Files;

        if (_currentFolder === folderToUpdate.Id)
            displayFolder(folderToUpdate.Id);
    }

    function onCutClicked(e) {
        if (!_selectedGridRow) return;
        let id = _selectedGridRow.dataset.id;
        clipboard = { "id": id, "isCopy": false, "isCut": true };
        document.querySelector(".menu-paste").classList.remove("disabled");
        showStatus("Copied to clipboard!");
    }

    function onDeleteClicked(e) {
        if (!_selectedGridRow) return;

        let id = _selectedGridRow.dataset.id;

        if (!confirm("OK to delete this file?")) return;

        fileSystem.Delete(id).then(() => {
            _selectedGridRow.parent.remove(_selectedGridRow);
            _selectedGridRow = null;
        });
    }

    function onGridRowSelected(e) {
        var selectedRow = document.querySelector("#" + fileGridId + " .selected");
        if (selectedRow) {
            selectedRow.classList.remove("selected");    
        }        
        _selectedGridRow = e.currentTarget;
        _selectedGridRow.classList.add("selected");        
    }

    function onGridRowDoubleClick(e) {
        let row = e.currentTarget;
        let id = row.dataset.id;        
        if (row.dataset.type === 'folder') {
            openFolder(id);
        }
        else {
            openFile(id);
        }
    }

    function onTreeFolderSelected(e) {
        document.querySelector("#" + folderTreeId + " .folder.selected").classList.remove("selected");
        let folderElement = e.currentTarget;
        folderElement.classList.add("selected");
        openFolder(folderElement.dataset.id);
    }

    function openFile(fileId) {
        let path = `/fs/download/${encodeURI(fileId)}/`;
        window.location = path;
    }

    function openFolder(folderId) {
        let theFolder = getFolderById(folderId);

        if (!theFolder) return;

        _currentFolder = folderId;

        //load the grid
        let grid = [];
        for (let folder of theFolder.Folders) {
            generateGridRowHtml_Folder(grid, folder);
        }
        for (let file of theFolder.Files) {
            generateGridRowHtml_File(grid, file);
        }

        let gridHtml = grid.join("\n");
        let tbody = document.querySelector("#" + fileGridId + " tbody");

        tbody.innerHTML = "";
        tbody.innerHTML = gridHtml;

        bindGridRowEvents();

        //update footer stats
        let folderCount = theFolder.Folders.length;
        let fileCount = theFolder.Files.length;
        let itemCount = folderCount + fileCount;
        document.querySelector("#" + fileGridId + " #item-count").innerText = `${itemCount} items - (${folderCount} folders | ${fileCount} files )`;
        document.querySelector("#" + fileGridId + " #files-size").innerText = `${theFolder.FileSizeSummary}`;

        //update hash path
        let path = encodeURI(folderId);
        path = path.replace(/%7C/g, "|");
        location.hash = "#" + path;
    }

    function getFolderById(folderId) {
        let theFolder;
        if (folderId === "|") {
            theFolder = _fsRoot; //at root
        }
        else {
            for (let folder of _fsRoot.Folders) {
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

    function loadFileSystem(fileSystem) {
        return new Promise((resolve,reject) => {
            fileSystem.Load().then((fs) => {
                _fsRoot = fs;
                _folderTreeElement.innerHTML = "";

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
                t.push(` <li class='folder root expanded selected' data-id='|'><span class='folder-text'>${fs.Root}</span></li>`);
                t.push("  <ul>");

                //tree and grid folders
                for (let folder of _fsRoot.Folders) {

                    //tree folders
                    t.push(`<li class='folder collapsed' data-id='${folder.Id}'><span class='folder-text'>${folder.Name}</span></li>`);
                    generateTreeHtml_Folder(t, folder);

                    //grid folders
                    generateGridRowHtml_Folder(g, folder);
                }
                t.push(" </ul>");
                t.push("</ul>");
                let treeHtml = t.join("\n");
                _folderTreeElement.innerHTML = treeHtml;

                //grid files
                for (let file of _fsRoot.Files) {
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
                document.getElementById(fileGridId).innerHTML = gridHtml;
                _currentFolder = "|"; //root
                resolve();
            });
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
            tree.push(`<li class='folder collapsed' data-id='${folder.Id}'><span class="folder-text">${folder.Name}</span></li>`);
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
};