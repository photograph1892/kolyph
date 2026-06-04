/*
  Hangul Place Component Instances for Adobe Illustrator
  Places a Symbol instance with a Hangul vowel-oriented transform.
*/

#target illustrator

(function () {
  if (app.documents.length === 0) {
    alert("Open an Illustrator document first.");
    return;
  }

  var doc = app.activeDocument;
  if (doc.symbols.length === 0) {
    alert("No Symbols found. Run hangul_make_component_symbol.jsx first.");
    return;
  }

  var SETTINGS = {
    margin: 80,
    defaultScalePercent: 100
  };

  var symbolName = prompt("Symbol name to place:", doc.symbols[doc.symbols.length - 1].name);
  if (!symbolName) {
    return;
  }

  var symbol = findSymbol(doc, symbolName);
  if (!symbol) {
    alert("Symbol not found: " + symbolName);
    return;
  }

  var preset = prompt("Direction preset: a, eo, o, u, eu, i", "a");
  if (!preset) {
    return;
  }
  preset = String(preset).toLowerCase();

  var instance = doc.symbolItems.add(symbol);
  instance.name = symbol.name + "_" + preset;

  var rect = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
  var target = getTargetBox(rect, SETTINGS.margin);

  instance.position = [target.centerX, target.centerY];
  transformByPreset(instance, preset, SETTINGS.defaultScalePercent);
  centerItem(instance, target.centerX, target.centerY);

  doc.selection = [instance];
  alert("Placed Symbol instance for preset: " + preset);

  function findSymbol(documentRef, name) {
    for (var i = 0; i < documentRef.symbols.length; i++) {
      if (documentRef.symbols[i].name === name) {
        return documentRef.symbols[i];
      }
    }
    return null;
  }

  function getTargetBox(rect, margin) {
    var left = rect[0] + margin;
    var top = rect[1] - margin;
    var right = rect[2] - margin;
    var bottom = rect[3] + margin;
    return {
      left: left,
      top: top,
      right: right,
      bottom: bottom,
      centerX: left + (right - left) / 2,
      centerY: bottom + (top - bottom) / 2
    };
  }

  function transformByPreset(item, presetName, scalePercent) {
    item.resize(scalePercent, scalePercent, true, true, true, true, scalePercent, Transformation.CENTER);

    if (presetName === "eo" || presetName === "ㅓ") {
      item.resize(-100, 100, true, true, true, true, 100, Transformation.CENTER);
    } else if (presetName === "o" || presetName === "ㅗ") {
      item.rotate(90, true, true, true, true, Transformation.CENTER);
    } else if (presetName === "u" || presetName === "ㅜ") {
      item.rotate(-90, true, true, true, true, Transformation.CENTER);
    } else if (presetName === "eu" || presetName === "ㅡ") {
      item.rotate(90, true, true, true, true, Transformation.CENTER);
      item.resize(100, 70, true, true, true, true, 100, Transformation.CENTER);
    } else if (presetName === "i" || presetName === "ㅣ") {
      item.resize(70, 100, true, true, true, true, 100, Transformation.CENTER);
    }
  }

  function centerItem(item, x, y) {
    var b = item.geometricBounds;
    var centerX = b[0] + (b[2] - b[0]) / 2;
    var centerY = b[3] + (b[1] - b[3]) / 2;
    item.translate(x - centerX, y - centerY);
  }
}());
