/*jslint browser: true, devel: true */
/*global $, jQuery, OpenLayers, pdp, map, init_raster_map, getOLClickHandler, processNcwmsLayerMetadata, getRasterControls, getRasterDownloadOptions, getPlotWindow, ddsToTimeIndex, RasterDownloadLink*/

"use strict";

// Globals
var catalog, ensemble_name, current_dataset, ncwmsCapabilities, ncwms;

$(document).ready(function () {
    var map, clickHandler, loginButton, ncwmsLayer, selectionLayer,
        dlLink, mdLink, catalogUrl, request;

    map = init_raster_map();
    clickHandler = getOLClickHandler(map);
    map.events.register('click', map, clickHandler);

    loginButton = pdp.init_login("login-div");
    pdp.checkLogin(loginButton);

    ncwmsLayer = map.getClimateLayer();
    selectionLayer = map.getSelectionLayer();

    catalogUrl = "../catalog/catalog.json";
    request = $.ajax(catalogUrl, { dataType: "json"});

    document.getElementById("pdp-controls").appendChild(getRasterControls(pdp.ensemble_name));
    document.getElementById("pdp-controls").appendChild(getRasterDownloadOptions(false));
    document.getElementById("pdp-controls").appendChild(getPlotWindow());

    // Data Download Link
    dlLink = new RasterDownloadLink($('#download-timeseries'), ncwmsLayer, undefined, 'nc', 'rx1dayETCCDI', '0:151', '0:510', '0:1068');
    $('#data-format-selector').change(
        function (evt) {
            dlLink.onExtensionChange($(this).val());
        }
    );
    ncwmsLayer.events.register('change', dlLink, dlLink.onLayerChange);
    selectionLayer.events.register('featureadded', dlLink, dlLink.onBoxChange);
    dlLink.register($('#download-timeseries'), function (node) {
        node.attr('href', dlLink.getUrl());
    }
                   );
    dlLink.trigger();

    // Metadata/Attributes Download Link
    mdLink = new RasterDownloadLink($('#download-metadata'), ncwmsLayer, undefined, 'das', 'rx1dayETCCDI', '0:151', '0:510', '0:1068');
    ncwmsLayer.events.register('change', mdLink, mdLink.onLayerChange);
    selectionLayer.events.register('featureadded', mdLink, mdLink.onBoxChange);
    mdLink.register($('#download-metadata'), function (node) {
        node.attr('href', mdLink.getUrl());
    }
                   );
    mdLink.trigger();

    function getTimeIndex(layer_name) {
        var layerUrl = catalog[layer_name.split('/')[0]]
        var reg = /.*\/data\/(.*?)\/.*/g;
        var m = reg.exec(layerUrl);
        layerUrl = layerUrl.replace("data/" + m[1], m[1] + "/catalog")

        var maxTimeReq = $.ajax({
                url: (layerUrl + ".dds?time").replace("/data/", "/catalog/")
            });
        $.when(maxTimeReq).done(function (maxTime, unitsSince) {
            var maxTimeIndex = ddsToTimeIndex(maxTime);
            ncwms.max_time_index = maxTimeIndex;
            //
            dlLink.trange = '0:' + maxTimeIndex;
            mdLink.trange = '0:' + maxTimeIndex;
        });
    }

    ncwms.events.register('change', ncwms, getTimeIndex);

    request.then(function (data) {
        catalog = dlLink.catalog = mdLink.catalog = data;
        processNcwmsLayerMetadata(ncwmsLayer);
        // Set the data URL as soon as it is available
        dlLink.onLayerChange();
        mdLink.onLayerChange();
    });

});
