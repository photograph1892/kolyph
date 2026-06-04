/*
  Hangul Make Syllable Artboards for Adobe Illustrator
  Creates one artboard per entered Hangul character.
*/

#target illustrator

(function () {
  if (app.documents.length === 0) {
    alert("Open an Illustrator document first.");
    return;
  }

  var SETTINGS = {
    artboardSize: 1000,
    gap: 120,
    columns: 8,
    labelLayerName: "Hangul Artboard Labels",
    labelSize: 36
  };

  var input = prompt("Enter Hangul characters to create artboards for:", "가나다라마바사아자차카타파하");
  if (!input) {
    return;
  }

  var chars = uniqueVisibleCharacters(input);
  if (chars.length === 0) {
    alert("No visible characters found.");
    return;
  }

  var doc = app.activeDocument;
  var firstRect = doc.artboards[0].artboardRect;
  var startLeft = firstRect[0];
  var startTop = firstRect[1] - SETTINGS.artboardSize - SETTINGS.gap;
  var labelLayer = getOrCreateLayer(doc, SETTINGS.labelLayerName);
  labelLayer.locked = false;
  labelLayer.visible = true;

  for (var i = 0; i < chars.length; i++) {
    var col = i % SETTINGS.columns;
    var row = Math.floor(i / SETTINGS.columns);
    var left = startLeft + col * (SETTINGS.artboardSize + SETTINGS.gap);
    var top = startTop - row * (SETTINGS.artboardSize + SETTINGS.gap);
    var rect = [left, top, left + SETTINGS.artboardSize, top - SETTINGS.artboardSize];
    var artboard = doc.artboards.add(rect);
    artboard.name = chars[i] + "_uni" + toUnicodeHex(chars[i]);
    addLabel(labelLayer, chars[i], left + 32, top - 48, SETTINGS.labelSize);
  }

  alert("Created " + chars.length + " Hangul artboard(s).");

  function uniqueVisibleCharacters(text) {
    var result = [];
    var seen = {};
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (/\s/.test(ch)) {
        continue;
      }
      var key = ch.charCodeAt(0);
      if (!seen[key]) {
        seen[key] = true;
        result.push(ch);
      }
    }
    return result;
  }

  function toUnicodeHex(ch) {
    var hex = ch.charCodeAt(0).toString(16).toUpperCase();
    while (hex.length < 4) {
      hex = "0" + hex;
    }
    return hex;
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

  function addLabel(layer, text, x, y, size) {
    var item = layer.textFrames.add();
    item.contents = text;
    item.position = [x, y];
    item.textRange.characterAttributes.size = size;
    return item;
  }
}());
