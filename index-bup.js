const turf = require('@turf/turf');
/*
TODO: Currently we generate each offset directly from the initial one, then try to filter out crazy offsets.
We actually need to generate them recursively:
- given a polygon, produce the offset polygon(s) at the given distance.
- if the number of offsets remaining > 1, recursively produce offsets for each of the generated polygons
- 
*/
function makeWaterLine(waterPolygon, { numberOfOffsets, offsetDistance }) {


    // when an offset intersects itself, it makes inside out pieces. We can strip them out
    // like this
    function removeInsideOuts(polygon) {
        const out = turf.unkinkPolygon(polygon)
        out.features = out.features.filter(p => !turf.booleanClockwise(turf.polygonToLine(p)));
        return out;
    }

    // offsets can get so extreme they make correctly oriented polygons that are no longer 
    // inside the original feature. So we filter them out
    function removeOutliers(polygons) {
        return polygons.filter(p => turf.booleanWithin(p, waterPolygon));
    }

    function makeOffset(line, distance) {
        return turf.lineOffset(line, distance);
    }
    const offsets = [0, offsetDistance];
    for (let i = 0; i < numberOfOffsets; i++) {
        offsets.push(offsets[i + 1] + (offsets[i+1] - offsets[i]) * 1.3);
    }
    // eep, Mapbox-GL-JS serves backwards polygons??
    waterPolygon = turf.rewind(waterPolygon);
    if (waterPolygon.geometry.type === 'MultiPolygon') {
        const fcs = waterPolygon.geometry.coordinates.map(pgeom => 
            makeWaterLine(turf.polygon(pgeom, {}), { numberOfOffsets, offsetDistance }))
        const fs = [];
        for (const fc of fcs) {
            fs.push(...fc.features)
        }
        return turf.featureCollection(fs)
    }
    const line = turf.polygonToLine(waterPolygon);
    // console.log(turf.booleanClockwise(line));
    const features = [];
    for (const offset of offsets) {
        const offsetPolygon = turf.lineToPolygon(makeOffset(line, -offset));
        const cleanPieces = removeInsideOuts(offsetPolygon).features;
        features.push(...removeOutliers(cleanPieces))
    }
    return turf.featureCollection(features);
}

// module.exports = makeWaterLine;
export { makeWaterLine };
