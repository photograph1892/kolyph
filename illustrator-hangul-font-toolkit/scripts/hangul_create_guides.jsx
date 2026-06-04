/*
  Hangul Create Guides for Adobe Illustrator
  Creates guide lines on every artboard in the active document.
*/

#target illustrator

(function () {
  if (app.documents.length === 0) {
    alert("Open an Illustrator document first.");
    return;
  }

  var SETTINGS = {
    layerName: "Hangul Glyph Guides",
    margin: 80,
    baselineFromBottom: 120,
    overshoot: 16,
    strokeWidth: 0.5,
    labelSize: 12
  };

  var doc = app.activeDocument;
  var guideLayer = getOrCreateLayer(doc, SETTINGS.layerName);
  guideLayer.locked = false;
  guideLayer.visible = true;

  clearLayer(guideLayer);

  for (var i = 0; i < doc.artboards.length; i++) {
    var rect = doc.artboards[i].artboardRect; // [left, top, right, bottom]
    drawGuidesForArtboard(doc, guideLayer, rect, doc.artboards[i].name, SETTINGS);
  }

  guideLayer.locked = true;
  alert("Hangul guides created for " + doc.artboards.length + " artboard(s).");

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

  function clearLayer(layer) {
    while (layer.pageItems.length > 0) {
      layer.pageItems[0].remove();
    }
  }

  function drawGuidesForArtboard(documentRef, layer, rect, artboardName, settings) {
    var left = rect[0];
    var top = rect[1];
    var right = rect[2];
    var bottom = rect[3];
    var width = right - left;
    var height = top - bottom;
    var centerX = left + width / 2;
    var centerY = bottom + height / 2;
    var marginLeft = left + settings.margin;
    var marginRight = right - settings.margin;
    var marginTop = top - settings.margin;
    var marginBottom = bottom + settings.margin;
    var baseline = bottom + settings.baselineFromBottom;

    drawRect(layer, left, top, width, height, rgb(45, 45, 45), settings.strokeWidth, false);
    drawRect(layer, marginLeft, marginTop, marginRight - marginLeft, marginTop - marginBottom, rgb(30, 120, 210), settings.strokeWidth, true);

    drawLine(layer, centerX, top, centerX, bottom, rgb(150, 150, 150), settings.strokeWidth, true);
    drawLine(layer, left, centerY, right, centerY, rgb(150, 150, 150), settings.strokeWidth, true);
    drawLine(layer, left, baseline, right, baseline, rgb(220, 70, 70), settings.strokeWidth, true);
    drawLine(layer, left, baseline + settings.overshoot, right, baseline + settings.overshoot, rgb(235, 145, 70), settings.strokeWidth, true);
    drawLine(layer, left, top - settings.overshoot, right, top - settings.overshoot, rgb(235, 145, 70), settings.strokeWidth, true);
    drawLine(layer, left, bottom + settings.overshoot, right, bottom + settings.overshoot, rgb(235, 145, 70), settings.strokeWidth, true);

    addLabel(layer, "em / " + artboardName, left + 12, top - 18, settings.labelSize, rgb(45, 45, 45));
    addLabel(layer, "baseline", left + 12, baseline + 14, settings.labelSize, rgb(220, 70, 70));
  }

  function drawLine(layer, x1, y1, x2, y2, color, strokeWidth, makeGuide) {
    var item = layer.pathItems.add();
    item.setEntirePath([[x1, y1], [x2, y2]]);
    item.filled = false;
    item.stroked = true;
    item.strokeColor = color;
    item.strokeWidth = strokeWidth;
    item.guides = makeGuide;
    return item;
  }

  function drawRect(layer, left, top, width, height, color, strokeWidth, makeGuide) {
    var item = layer.pathItems.rectangle(top, left, width, height);
    item.filled = false;
    item.stroked = true;
    item.strokeColor = color;
    item.strokeWidth = strokeWidth;
    item.guides = makeGuide;
    return item;
  }

  function addLabel(layer, text, x, y, size, color) {
    var item = layer.textFrames.add();
    item.contents = text;
    item.position = [x, y];
    item.textRange.characterAttributes.size = size;
    item.textRange.characterAttributes.fillColor = color;
    return item;
  }

  function rgb(r, g, b) {
    var color = new RGBColor();
    color.red = r;
    color.green = g;
    color.blue = b;
    return color;
  }
}());
