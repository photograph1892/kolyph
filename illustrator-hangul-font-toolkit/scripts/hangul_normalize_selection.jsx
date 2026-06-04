/*
  Hangul Normalize Selection for Adobe Illustrator
  Fits selected artwork into the active artboard margin box.
*/

#target illustrator

(function () {
  if (app.documents.length === 0) {
    alert("Open an Illustrator document first.");
    return;
  }

  var doc = app.activeDocument;
  if (doc.selection.length === 0) {
    alert("Select one or more glyph objects first.");
    return;
  }

  var SETTINGS = {
    margin: 80,
    fitMode: "height", // "height", "width", or "both"
    centerHorizontally: true,
    centerVertically: true
  };

  var artboardIndex = doc.artboards.getActiveArtboardIndex();
  var rect = doc.artboards[artboardIndex].artboardRect;
  var target = {
    left: rect[0] + SETTINGS.margin,
    top: rect[1] - SETTINGS.margin,
    right: rect[2] - SETTINGS.margin,
    bottom: rect[3] + SETTINGS.margin
  };
  target.width = target.right - target.left;
  target.height = target.top - target.bottom;
  target.centerX = target.left + target.width / 2;
  target.centerY = target.bottom + target.height / 2;

  var items = [];
  for (var i = 0; i < doc.selection.length; i++) {
    items.push(doc.selection[i]);
  }

  var bounds = getBounds(items);
  if (bounds.width <= 0 || bounds.height <= 0) {
    alert("Selection bounds could not be measured.");
    return;
  }

  var scaleX = target.width / bounds.width;
  var scaleY = target.height / bounds.height;
  var scale = scaleY;
  if (SETTINGS.fitMode === "width") {
    scale = scaleX;
  } else if (SETTINGS.fitMode === "both") {
    scale = Math.min(scaleX, scaleY);
  }

  var percent = scale * 100;
  for (var s = 0; s < items.length; s++) {
    items[s].resize(percent, percent, true, true, true, true, percent, Transformation.CENTER);
  }

  bounds = getBounds(items);
  var dx = 0;
  var dy = 0;

  if (SETTINGS.centerHorizontally) {
    dx = target.centerX - bounds.centerX;
  }
  if (SETTINGS.centerVertically) {
    dy = target.centerY - bounds.centerY;
  }

  for (var t = 0; t < items.length; t++) {
    items[t].translate(dx, dy);
  }

  alert("Selection normalized to active artboard.");

  function getBounds(pageItems) {
    var left = null;
    var top = null;
    var right = null;
    var bottom = null;

    for (var i = 0; i < pageItems.length; i++) {
      var b = pageItems[i].geometricBounds; // [left, top, right, bottom]
      if (left === null || b[0] < left) left = b[0];
      if (top === null || b[1] > top) top = b[1];
      if (right === null || b[2] > right) right = b[2];
      if (bottom === null || b[3] < bottom) bottom = b[3];
    }

    return {
      left: left,
      top: top,
      right: right,
      bottom: bottom,
      width: right - left,
      height: top - bottom,
      centerX: left + (right - left) / 2,
      centerY: bottom + (top - bottom) / 2
    };
  }
}());
