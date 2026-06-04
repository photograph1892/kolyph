/*
  Hangul Make Component Symbol for Adobe Illustrator
  Converts the current selection into an Illustrator Symbol.
*/

#target illustrator

(function () {
  if (app.documents.length === 0) {
    alert("Open an Illustrator document first.");
    return;
  }

  var doc = app.activeDocument;
  if (doc.selection.length === 0) {
    alert("Select the vowel component or glyph shape first.");
    return;
  }

  var defaultName = "Hangul_Moum_Component";
  var symbolName = prompt("Symbol name:", defaultName);
  if (!symbolName) {
    return;
  }

  var sourceItem = makeSourceItem(doc);
  var symbol = doc.symbols.add(sourceItem);
  symbol.name = uniqueSymbolName(doc, symbolName, symbol);
  doc.selection = [sourceItem];

  alert("Created Symbol: " + symbol.name + "\nUse hangul_place_component_instances.jsx to place linked instances.");

  function makeSourceItem(documentRef) {
    if (documentRef.selection.length === 1) {
      return documentRef.selection[0];
    }

    var group = documentRef.groupItems.add();
    group.name = "Hangul component source";

    var items = [];
    for (var i = 0; i < documentRef.selection.length; i++) {
      items.push(documentRef.selection[i]);
    }

    for (var j = 0; j < items.length; j++) {
      items[j].move(group, ElementPlacement.PLACEATEND);
    }

    return group;
  }

  function uniqueSymbolName(documentRef, baseName, createdSymbol) {
    var name = baseName;
    var suffix = 2;
    while (symbolNameExists(documentRef, name, createdSymbol)) {
      name = baseName + "_" + suffix;
      suffix++;
    }
    return name;
  }

  function symbolNameExists(documentRef, name, ignoredSymbol) {
    for (var i = 0; i < documentRef.symbols.length; i++) {
      if (documentRef.symbols[i] !== ignoredSymbol && documentRef.symbols[i].name === name) {
        return true;
      }
    }
    return false;
  }
}());
