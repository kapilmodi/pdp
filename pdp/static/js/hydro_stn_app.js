/*jslint browser: true, devel: true */
/*global $, jQuery, OpenLayers, pdp, init_hydro_stn_map, getHydroStnControls, getDownloadOptions, addToSidebar, removeFromSidebar, download_single, show_permalinks*/

"use strict";

// globals

$(document).ready(function () {
    var map, loginButton, mapProj, controls, dataArray,
        stnLayer, searchData;

    map = init_hydro_stn_map();
    loginButton = pdp.init_login("login-div");
    pdp.checkLogin(loginButton);
    mapProj = map.getProjectionObject();

    controls = getHydroStnControls();
    document.getElementById("pdp-controls").appendChild(controls);
    document.getElementById("pdp-controls").appendChild(getDownloadOptions());

    function selection_callback(event, ui) {
        map.toggleSelectFeatureByFid(ui.item.value);
        $('#searchBox').val('');
        return false;
    }
    $(controls.sBox).autocomplete({
        select: selection_callback,
        delay: 100,
        minLength: 2
    });

    // Set up station layer events
    stnLayer = map.getStnLayer();
    stnLayer.events.on({
        'featureselected': function (feature) {
            addToSidebar(feature.feature.fid, dataArray);
        },
        'featureunselected': function (feature) {
            removeFromSidebar(feature.feature.fid);
        }
    });

    $.ajax(pdp.app_root + "/csv/routed_flow_metadatav4.csv").done(function (data) {
        var inProj = new OpenLayers.Projection("EPSG:4326");

        dataArray = $.csv.toObjects(data);

        $(dataArray).each(function (idx, row) {
            var parser, pt, feature;

            row.idx = idx;
            parser = document.createElement('a');
            parser.href = "../data/" + row.FileName;
            row.url = parser.href;
            pt = new OpenLayers.Geometry.Point(
                parseFloat(row.Longitude),
                parseFloat(row.Latitude)
            ).transform(inProj, mapProj);
            feature = new OpenLayers.Feature.Vector(pt);
            feature.fid = idx;
            stnLayer.addFeatures(feature);
        });

        searchData = $.map(dataArray, function (x) {
            return { label: x.StationName, value: x.idx };
        }).concat($.map(dataArray, function (x) {
            return { label: x.SiteID, value: x.idx };
        }));

        // Adds data to the search box.
        $('#searchBox').autocomplete(
            "option",
            "source",
            searchData
        );
    });

    $("#download").click(function () {
        var extension, fids, i;

        extension = $('select[name="data-format"]').val();
        fids = map.getSelectedFids();
        if (fids.length > 6) {
            alert("Sorry, we can only download up to 6 stations at once. Please select 6 or fewer stations and try again");
            return;
        }
        for (i = fids.length - 1; i >= 0; i -= 1) {
            download_single(dataArray[fids[i]].url, extension);
        }
    });
    $("#permalink").click(function () {
        var extension, fids, url_list;
        extension = $('select[name="data-format"]').val();
        fids = map.getSelectedFids();

        url_list = $.map(fids, function (fid) {
            return dataArray[fid].url;
        });
        show_permalinks(url_list, extension);
    });
});
