
$(document).ready(function() {
    map = init_hydro_stn_map();    
    var mapProj = map.getProjectionObject();

    var controls = getHydroStnControls();
    document.getElementById("pdp-controls").appendChild(controls);
    document.getElementById("pdp-controls").appendChild(getDownloadOptions());
    
    var dataArray, catalog;

    var selection_callback = function(event, ui) {
        map.selectFeatureByFid(ui.item.value);
        $('#searchBox').val('');
        return false;
    };
    $(controls.sBox).autocomplete({
        select: selection_callback,
        delay: 100,
        minLength: 2
    });

    // Set up station layer events
    var stnLayer = map.getStnLayer();
    stnLayer.events.on({
        'featureselected': function(feature) {
            addToSidebar(feature.feature.fid, dataArray);
        },
        'featureunselected': function(feature) {
            removeFromSidebar(feature.feature.fid);
        }
    });

    var catalogReq = new $.Deferred();
    $.ajax("../data/catalog.json").done(function(data){
        catalog = data;
        catalogReq.resolve();
    });

    var metadataReq = new $.Deferred();
    $.ajax(pdp.app_root + "/csv/routed_flow_metadatav4.csv").done(function(data) {
        var inProj = new OpenLayers.Projection("EPSG:4326");

        dataArray = $.csv.toObjects(data);

        $(dataArray).each(function(idx, row) {
            row.idx = idx;
            var pt = new OpenLayers.Geometry.Point(
                parseFloat(row.Longitude),
                parseFloat(row.Latitude)).transform(inProj, mapProj);
            var feature = new OpenLayers.Feature.Vector(pt);
            feature.fid = idx;
            stnLayer.addFeatures(feature);
        });

        metadataReq.resolve();

        searchData = $.map(dataArray, function(x) {
            return { label: x.StationName, value: x.idx };
        }).concat($.map(dataArray, function(x) {
            return { label: x.SiteID, value: x.idx };
        }));

        // Adds data to the search box.
        $('#searchBox').autocomplete(
            "option",
            "source",
            searchData
        );
    });

    // Match up metadata table to download location
    // THIS IS TERRIBLE!! DEVELOP A BETTER WAY TO DO THIS
    $.when(catalogReq, metadataReq).done(function () {
        $(dataArray).each(function(didx, drow) {
            for (var i = catalog.length - 1; i >= 0; i--) {
                if (catalog[i].search(drow.VICID) > 0) {
                    drow.url = catalog[i];
                }
            };
        });

    });

    $("#download").click(function(){
        extension = $('select[name="data-format"]').val();
        fids = map.getSelectedFids()
        if (fids.length > 6) {
            alert("Sorry, we can only download up to 6 stations at once. Please select 6 or fewer stations and try again");
            return;
        }
        for (var i = fids.length - 1; i >= 0; i--) {
            download_single(dataArray[fids[i]].url, extension);
        };
    });
    $("#permalink").click(function(){
        extension = $('select[name="data-format"]').val();
        fids = map.getSelectedFids()

        var url_list = $.map(fids, function(fid) {
            return dataArray[fid].url;
        });
        show_permalinks(url_list, extension);
    });
});
