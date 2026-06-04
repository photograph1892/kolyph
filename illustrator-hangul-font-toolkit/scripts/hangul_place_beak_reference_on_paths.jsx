/*
  Hangul Place Beak Reference On Paths for Adobe Illustrator
  Places translucent beak-reference Symbol instances on selected path starts or ends.
*/

#target illustrator

(function () {
  if (app.documents.length === 0) {
    alert("Open an Illustrator document first.");
    return;
  }

  var doc = app.activeDocument;
  if (doc.selection.length === 0) {
    alert("Select one or more target paths first.");
    return;
  }
  if (doc.symbols.length === 0) {
    alert("No Symbols found. Run hangul_make_beak_reference_symbol.jsx first.");
    return;
  }

  var SETTINGS = {
    defaultSymbolName: "Hangul_Beak_Reference",
    layerName: "Hangul Beak Reference Overlay",
    markerName: "__beak_reference_anchor__",
    opacity: 35,
    scalePercent: 100,
    angleOffset: 0
  };

  var symbolName = prompt("Reference Symbol name:", findDefaultSymbolName(doc, SETTINGS.defaultSymbolName));
  if (!symbolName) {
    return;
  }
  var symbol = findSymbol(doc, symbolName);
  if (!symbol) {
    alert("Symbol not found: " + symbolName);
    return;
  }

  var endpointMode = prompt("Attach to path point: selected, start, or end", "selected");
  if (!endpointMode) {
    return;
  }
  endpointMode = String(endpointMode).toLowerCase();

  var angleOffset = Number(prompt("Angle offset in degrees:", String(SETTINGS.angleOffset)));
  if (isNaN(angleOffset)) {
    angleOffset = SETTINGS.angleOffset;
  }

  var targetPaths = collectPathItems(doc.selection);
  if (targetPaths.length === 0) {
    alert("No editable PathItems found in selection.");
    return;
  }

  var overlayLayer = getOrCreateLayer(doc, SETTINGS.layerName);
  overlayLayer.locked = false;
  overlayLayer.visible = true;

  var placed = 0;
  for (var i = 0; i < targetPaths.length; i++) {
    var info = getEndpointInfo(targetPaths[i], endpointMode);
    if (!info) {
      continue;
    }

    var instance = doc.symbolItems.add(symbol);
    instance.name = symbol.name + "_reference";
    instance.opacity = SETTINGS.opacity;
    instance.move(overlayLayer, ElementPlacement.PLACEATEND);
    instance.resize(SETTINGS.scalePercent, SETTINGS.scalePercent, true, true, true, true, SETTINGS.scalePercent, Transformation.CENTER);
    instance.rotate(info.angle + angleOffset, true, true, true, true, Transformation.CENTER);
    centerItem(instance, info.x, info.y);
    placed++;
  }

  alert("Placed " + placed + " beak reference instance(s).");

  function collectPathItems(selection) {
    var result = [];
    for (var i = 0; i < selection.length; i++) {
      collectFromItem(selection[i], result);
    }
    return result;
  }

  function collectFromItem(item, result) {
    if (item.typename === "PathItem") {
      if (item.pathPoints.length >= 2) {
        result.push(item);
      }
      return;
    }
    if (item.pageItems) {
      for (var i = 0; i < item.pageItems.length; i++) {
        collectFromItem(item.pageItems[i], result);
      }
    }
    if (item.pathItems) {
      for (var j = 0; j < item.pathItems.length; j++) {
        collectFromItem(item.pathItems[j], result);
      }
    }
  }

  function getEndpointInfo(path, mode) {
    var count = path.pathPoints.length;
    if (mode === "selected") {
      var selectedInfo = getSelectedPointInfo(path, count);
      if (selectedInfo) {
        return selectedInfo;
      }
    }

    var index = mode === "end" ? count - 1 : 0;
    var nearIndex = mode === "end" ? count - 2 : 1;
    var point = path.pathPoints[index].anchor;
    var near = path.pathPoints[nearIndex].anchor;
    var dx = mode === "end" ? point[0] - near[0] : near[0] - point[0];
    var dy = mode === "end" ? point[1] - near[1] : near[1] - point[1];
    var angle = Math.atan2(dy, dx) * 180 / Math.PI;

    return {
      x: point[0],
      y: point[1],
      angle: angle
    };
  }

  function getSelectedPointInfo(path, count) {
    for (var i = 0; i < count; i++) {
      if (path.pathPoints[i].selected !== PathPointSelection.NOSELECTION) {
        var nearIndex = i < count - 1 ? i + 1 : i - 1;
        if (path.closed && i === count - 1) {
          nearIndex = 0;
        }
        if (nearIndex < 0 || nearIndex >= count) {
          return null;
        }

        var point = path.pathPoints[i].anchor;
        var near = path.pathPoints[nearIndex].anchor;
        var dx = near[0] - point[0];
        var dy = near[1] - point[1];
        var angle = Math.atan2(dy, dx) * 180 / Math.PI;

        return {
          x: point[0],
          y: point[1],
          angle: angle
        };
      }
    }
    return null;
  }

  function centerItem(item, x, y) {
    var b = item.geometricBounds;
    var centerX = b[0] + (b[2] - b[0]) / 2;
    var centerY = b[3] + (b[1] - b[3]) / 2;
    item.translate(x - centerX, y - centerY);
  }

  function getOrCreateLayer(documentRef, name) {
    for (var i = 0; i < documentRef.layers.length; i++) {
      if (documentRef.layers[i].name === name) {
        return documentRef.layers[i];
      }
    }
    var layer = documentRef.layers.add();
    layer.name = name;
    return layer;
  }

  function findDefaultSymbolName(documentRef, fallback) {
    var found = findSymbol(documentRef, fallback);
    if (found) {
      return fallback;
    }
    return documentRef.symbols[documentRef.symbols.length - 1].name;
  }

  function findSymbol(documentRef, name) {
    for (var i = 0; i < documentRef.symbols.length; i++) {
      if (documentRef.symbols[i].name === name) {
        return documentRef.symbols[i];
      }
    }
    return null;
  }
}());
