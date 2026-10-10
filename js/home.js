(function () {
    "use strict";
    var countNode = document.getElementById("catalogue-count-stat");
    if (!countNode) return;
    fetch("data/tools.json")
        .then(function (response) { if (!response.ok) throw new Error("Catalogue unavailable"); return response.json(); })
        .then(function (records) { countNode.textContent = Number(records.length || 0).toLocaleString(); })
        .catch(function () { countNode.textContent = "Growing"; });
})();