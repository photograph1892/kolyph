/*
  Hangul Export Artboards to SVG for Adobe Illustrator
  Exports every artboard as one SVG file using the artboard name.
*/

#target illustrator

(function () {
  if (app.documents.length === 0) {
    alert("Open an Illustrator document first.");
    return;
  }

  var doc = app.activeDocument;
  var outputFolder = Folder.selectDialog("Choose a folder for exported SVG files.");
  if (!outputFolder) {
    return;
  }

  var previousArtboard = doc.artboards.getActiveArtboardIndex();
  var exported = 0;

  for (var i = 0; i < doc.artboards.length; i++) {
    doc.artboards.setActiveArtboardIndex(i);
    var artboardName = doc.artboards[i].name;
    var safeName = sanitizeFileName(artboardName);
    if (safeName === "") {
      safeName = "artboard_" + (i + 1);
    }

    var file = new File(outputFolder.fsName + "/" + safeName + ".svg");
    var options = new ExportOptionsSVG();
    options.embedRasterImages = true;
    options.fontSubsetting = SVGFontSubsetting.None;
    options.documentEncoding = SVGDocumentEncoding.UTF8;
    options.coordinatePrecision = 3;
    options.cssProperties = SVGCSSPropertyLocation.STYLEATTRIBUTES;
    options.artboardRange = String(i + 1);

    doc.exportFile(file, ExportType.SVG, options);
    exported++;
  }

  doc.artboards.setActiveArtboardIndex(previousArtboard);
  alert("Exported " + exported + " SVG file(s).");

  function sanitizeFileName(name) {
    return String(name).replace(/[\\\/:\*\?"<>\|]/g, "_").replace(/^\s+|\s+$/g, "");
  }
}());
