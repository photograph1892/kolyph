/*
  Hangul Batch Place Beak References By Family for Adobe Illustrator
  Finds likely beak points on selected paths and places translucent reference Symbols in bulk.
*/

#target illustrator

(function () {
  if (app.documents.length === 0) {
    alert("Open an Illustrator document first.");
    return;
  }

  var doc = app.activeDocument;
  if (doc.selection.length === 0) {
    alert("Select target vowel paths first.");
    return;
  }
  if (doc.symbols.length === 0) {
    alert("No Symbols found. Run hangul_make_beak_reference_symbol.jsx first.");
    return;
  }

  var SETTINGS = {
    defaultSymbolName: "Hangul_Beak_Reference",
    layerName: "Hangul Beak Batch References",
    opacity: 32,
    scalePercent: 100,
    minScoreGap: 0
  };

  var PRESETS = {
    right: {
      label: "right vertical family",
      targetAngle: -90,
      preferX: 1,
      preferY: 1,
      angleWeight: 1.0,
      positionWeight: 0.45,
      offset: 0
    },
    left: {
      label: "left vertical family",
      targetAngle: -90,
      preferX: -1,
      preferY: 1,
      angleWeight: 1.0,
      positionWeight: 0.45,
      offset: 0
    },
    top: {
      label: "top horizontal family",
      targetAngle: 0,
      preferX: -1,
      preferY: 1,
      angleWeight: 1.0,
      positionWeight: 0.4,
      offset: 90
    },
    bottom: {
      label: "bottom horizontal family",
      targetAngle: 0,
      preferX: -1,
      preferY: -1,
      angleWeight: 1.0,
      positionWeight: 0.4,
      offset: -90
    },
    any: {
      label: "angle-first fallback",
      targetAngle: -90,
      preferX: 0,
      preferY: 0,
      angleWeight: 1.0,
      positionWeight: 0,
      offset: 0
    }
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

  var presetName = prompt("Family preset: right, left, top, bottom, any", "right");
  if (!presetName) {
    return;
  }
  presetName = String(presetName).toLowerCase();
  var preset = PRESETS[presetName];
  if (!preset) {
    alert("Unknown preset: " + presetName);
    return;
  }

  var angleOffset = Number(prompt("Extra angle offset in degrees:", String(preset.offset)));
  if (isNaN(angleOffset)) {
    angleOffset = preset.offset;
  }

  var paths = collectPathItems(doc.selection);
  if (paths.length === 0) {
    alert("No editable PathItems found in selection.");
    return;
  }

  var overlayLayer = getOrCreateLayer(doc, SETTINGS.layerName);
  overlayLayer.locked = false;
  overlayLayer.visible = true;

  var placed = 0;
  for (var i = 0; i < paths.length; i++) {
    var candidate = findBestCandidate(paths[i], preset);
    if (!candidate) {
      continue;
    }

    var instance = doc.symbolItems.add(symbol);
    instance.name = symbol.name + "_" + presetName + "_reference";
    instance.opacity = SETTINGS.opacity;
    instance.move(overlayLayer, ElementPlacement.PLACEATEND);
    instance.resize(SETTINGS.scalePercent, SETTINGS.scalePercent, true, true, true, true, SETTINGS.scalePercent, Transformation.CENTER);
    instance.rotate(candidate.angle + angleOffset, true, true, true, true, Transformation.CENTER);
    centerItem(instance, candidate.x, candidate.y);
    placed++;
  }

  alert("Placed " + placed + " batch reference(s).\nPreset: " + preset.label);

  function collectPathItems(selection) {
    var result = [];
    for (var i = 0; i < selection.length; i++) {
      collectFromItem(selection[i], result);
    }
    return result;
  }

  function collectFromItem(item, result) {
    if (item.typename === "PathItem") {
      if (!item.guides && !item.clipping && item.pathPoints.length >= 2) {
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

  function findBestCandidate(path, preset) {
    var count = path.pathPoints.length;
    if (count < 2) {
      return null;
    }

    var bounds = path.geometricBounds;
    var centerX = bounds[0] + (bounds[2] - bounds[0]) / 2;
    var centerY = bounds[3] + (bounds[1] - bounds[3]) / 2;
    var width = Math.max(bounds[2] - bounds[0], 1);
    var height = Math.max(bounds[1] - bounds[3], 1);
    var best = null;

    for (var i = 0; i < count; i++) {
      var current = path.pathPoints[i].anchor;
      var nextIndex = i < count - 1 ? i + 1 : (path.closed ? 0 : i - 1);
      var prevIndex = i > 0 ? i - 1 : (path.closed ? count - 1 : i + 1);
      if (nextIndex < 0 || nextIndex >= count || prevIndex < 0 || prevIndex >= count) {
        continue;
      }

      var next = path.pathPoints[nextIndex].anchor;
      var prev = path.pathPoints[prevIndex].anchor;
      var angleA = angleBetween(current, next);
      var angleB = angleBetween(prev, current);
      var angleScore = Math.min(angleDistance(angleA, preset.targetAngle), angleDistance(angleB, preset.targetAngle)) / 180;
      var positionScore = positionPenalty(current, centerX, centerY, width, height, preset);
      var score = angleScore * preset.angleWeight + positionScore * preset.positionWeight;

      if (!best || score < best.score) {
        best = {
          x: current[0],
          y: current[1],
          angle: angleScoreFor(angleA, angleB, preset.targetAngle),
          score: score
        };
      }
    }

    return best;
  }

  function angleBetween(a, b) {
    return Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
  }

  function angleDistance(a, b) {
    var diff = Math.abs(normalizeAngle(a - b));
    return diff > 180 ? 360 - diff : diff;
  }

  function angleScoreFor(angleA, angleB, target) {
    return angleDistance(angleA, target) <= angleDistance(angleB, target) ? angleA : angleB;
  }

  function normalizeAngle(angle) {
    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;
    return angle;
  }

  function positionPenalty(point, centerX, centerY, width, height, preset) {
    var xNorm = (point[0] - centerX) / (width / 2);
    var yNorm = (point[1] - centerY) / (height / 2);
    var penalty = 0;

    if (preset.preferX !== 0) {
      penalty += preset.preferX > 0 ? Math.max(0, -xNorm) : Math.max(0, xNorm);
    }
    if (preset.preferY !== 0) {
      penalty += preset.preferY > 0 ? Math.max(0, -yNorm) : Math.max(0, yNorm);
    }

    return penalty;
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
