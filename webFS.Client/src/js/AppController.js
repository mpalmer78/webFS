var AppController = function(folderListId) {

    let folderList = document.getElementById(folderListId);

    if (!folderList) throw "Element Id '" + folderListId + "' not found."; 

    let fileSystem = new FileSystem();
    fileSystem.load().then(() => {
        bindViewEvents();
    })    

    function bindViewEvents() {
        let subs = folderList.getElementsByClassName("folder");
        for(let sub of subs) {
            sub.addEventListener("dblclick", onFolderDoubleClick);
        }
    }

    function onFolderDoubleClick(e) {
        e.stopPropagation();
        e.preventDefault();
        new Folder(e.currentTarget).ToggleExpand();
    }    
}


function Folder(sourceElement) {
    Folder.prototype.ToggleExpand = function() {
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