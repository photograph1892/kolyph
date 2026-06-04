/*
  Hangul Make Beak Reference Symbol for Adobe Illustrator
  Stores a selected beak shape as a reference Symbol and marks its alignment point.
*/

#target illustrator

(function () {
  if (app.documents.length === 0) {
    alert("Open an Illustrator document first.");
    return;
  }

  var doc = app.activeDocument;
  if (doc.selection.length === 0) {
    alert("Select the reference beak shape from ㅏ first.");
    return;
  }

  var SETTINGS = {
    defaultName: "Hangul_Beak_Reference",
    markerRadius: 10,
    markerName: "__beak_reference_anchor__",
    padName: "__beak_reference_alignment_pad__"
  };

  var symbolName = prompt("Reference Symbol name:", SETTINGS.defaultName);
  if (!symbolName) {
    return;
  }

  var source = makeSourceItem(doc);
  var b = source.geometricBounds;
  var defaultX = Math.round(b[0]);
  var defaultY = Math.round(b[1]);
  var anchorX = Number(prompt("Anchor X for alignment point:", String(defaultX)));
  var anchorY = Number(prompt("Anchor Y for alignment point:", String(defaultY)));
  if (isNaN(anchorX) || isNaN(anchorY)) {
    alert("Anchor values must be numbers.");
    return;
  }

  var marker = source.groupItems ? addMarkerToGroup(source, anchorX, anchorY, SETTINGS) : null;
  if (!marker) {
    var group = doc.groupItems.add();
    source.move(group, ElementPlacement.PLACEATEND);
    marker = addMarkerToGroup(group, anchorX, anchorY, SETTINGS);
    source = group;
  }
  addAlignmentPad(source, anchorX, anchorY, SETTINGS);

  var symbol = doc.symbols.add(source);
  symbol.name = uniqueSymbolName(doc, symbolName, symbol);
  doc.selection = [source];

  alert("Created beak reference Symbol: " + symbol.name);

  function makeSourceItem(documentRef) {
    if (documentRef.selection.length === 1) {
      return documentRef.selection[0];
    }

    var group = documentRef.groupItems.add();
    group.name = "Hangul beak reference source";

    var items = [];
    for (var i = 0; i < documentRef.selection.length; i++) {
      items.push(documentRef.selection[i]);
    }

    for (var j = 0; j < items.length; j++) {
      items[j].move(group, ElementPlacement.PLACEATEND);
    }

    return group;
  }

  function addMarkerToGroup(group, x, y, settings) {
    var radius = settings.markerRadius;
    var marker = group.pathItems.ellipse(y + radius, x - radius, radius * 2, radius * 2);
    marker.name = settings.markerName;
    marker.filled = true;
    marker.stroked = false;
    marker.opacity = 0;
    return marker;
  }

  function addAlignmentPad(group, x, y, settings) {
    var b = group.geometricBounds;
    var radius = Math.max(
      Math.abs(b[0] - x),
      Math.abs(b[2] - x),
      Math.abs(b[1] - y),
      Math.abs(b[3] - y)
    ) + settings.markerRadius;

    var pad = group.pathItems.rectangle(y + radius, x - radius, radius * 2, radius * 2);
    pad.name = settings.padName;
    pad.filled = true;
    pad.stroked = false;
    pad.opacity = 0;
    return pad;
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
