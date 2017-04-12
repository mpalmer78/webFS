"use strict";

function Folder(sourceElement) {
    if (!Folder.prototype.ToggleExpand) {
        Folder.prototype.ToggleExpand = ToggleExpand; 
    }

    function ToggleExpand() {
        if (sourceElement.classList.contains("expanded")) {
            sourceElement.classList.remove("expanded");
            sourceElement.classList.add("collapsed");
        }
        else {
            sourceElement.classList.remove("collapsed");
            sourceElement.classList.add("expanded");
        }
    };
}