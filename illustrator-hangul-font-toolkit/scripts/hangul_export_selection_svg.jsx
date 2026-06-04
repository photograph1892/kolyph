/*
  Hangul Export Selection SVG for Adobe Illustrator
  Exports the current selection as a standalone SVG for Hangul Glyphs Lab.
*/

#target illustrator

(function () {
  if (app.documents.length === 0) {
    alert("Open an Illustrator document first.");
    return;
  }

  var sourceDoc = app.activeDocument;
  if (sourceDoc.selection.length === 0) {
    alert("Select vector artwork first.");
    return;
  }

  var outFile = File.saveDialog("Export selected artwork as SVG", "*.svg");
  if (!outFile) {
    return;
  }
  if (!/\.svg$/i.test(outFile.name)) {
    outFile = new File(outFile.fsName + ".svg");
  }

  var items = [];
  for (var i = 0; i < sourceDoc.selection.length; i++) {
    items.push(sourceDoc.selection[i]);
  }

  var bounds = getBounds(items);
  var padding = 24;
  var width = Math.max(bounds.right - bounds.left + padding * 2, 10);
  var height = Math.max(bounds.top - bounds.bottom + padding * 2, 10);

  var tempDoc = app.documents.add(DocumentColorSpace.RGB, width, height);
  tempDoc.artboards[0].artboardRect = [0, height, width, 0];

  for (var j = 0; j < items.length; j++) {
    var copy = items[j].duplicate(tempDoc.activeLayer, ElementPlacement.PLACEATEND);
    copy.translate(-bounds.left + padding, -bounds.bottom + padding);
  }

  var options = new ExportOptionsSVG();
  options.embedRasterImages = true;
  options.fontSubsetting = SVGFontSubsetting.None;
  options.documentEncoding = SVGDocumentEncoding.UTF8;
  options.coordinatePrecision = 3;
  options.cssProperties = SVGCSSPropertyLocation.STYLEATTRIBUTES;

  tempDoc.exportFile(outFile, ExportType.SVG, options);
  tempDoc.close(SaveOptions.DONOTSAVECHANGES);

  alert("Exported selection SVG:\n" + outFile.fsName);

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
      bottom: bottom
    };
  }
}());
