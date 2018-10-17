/*jslint browser: true, devel: true */
/*global $, jQuery, OpenLayers, pdp, map, init_raster_map, processNcwmsLayerMetadata, 
 * getRasterControls, getRasterDownloadOptions, getArchiveDisclaimer,
 * RasterDownloadLink, MetadataDownloadLink
 * 
 * This front end code is used to serve both the BCCAQ/BCSD version 1 
 * and BCCAQ version 2 data, with different portal back ends and available data. 
 * 
 * Version 1 has the url_base and ensemble name downscaled_gcms_archive.
 * Version 2 url_base: downscaled_gcms, ensemble: bccaq_version_2
 * 
 * Each version contains a link to the other at the top left; the archived
 * version also has a disclaimer about only using the old data for comparisons.
 */

"use strict";

$(document).ready(function () {
    var map, loginButton, ncwmsLayer, selectionLayer, catalogUrl, catalog_request, catalog,
        dlLink, mdLink, capabilities_request, ncwms_capabilities;

    map = init_raster_map();
    loginButton = pdp.init_login("login-div");
    pdp.checkLogin(loginButton);

    ncwmsLayer = map.getClimateLayer();
    selectionLayer = map.getSelectionLayer();

    catalogUrl = "../catalog/catalog.json";
    catalog_request = $.ajax(catalogUrl, {dataType: "json"});

    capabilities_request = getNCWMSLayerCapabilities(ncwmsLayer);

    document.getElementById("pdp-controls").appendChild(getRasterControls(pdp.ensemble_name));
    document.getElementById("pdp-controls").appendChild(getRasterDownloadOptions(true));
    
    const archivePortal = ($(location).attr('href').indexOf("archive") != -1);
    
    //Each portal links to the other one
    let portalLink;
    if(archivePortal) {
      portalLink = pdp.createLink("portal-link", 
          undefined,
          pdp.app_root + "/downscaled_gcms/map/",
          "Main Downscaled GCMS Portal");
    }
    else {
      portalLink = pdp.createLink("portal-link", 
          undefined,
          pdp.app_root + "/downscaled_gcms_archive/map/",
          "Archive Downscaled GCMS Portal");
    }
    document.getElementById("topnav").appendChild(portalLink)
    
    //If we're on the archive portal, display a disclaimer.
    if (archivePortal) {
      document.getElementById("pdp-controls").appendChild(getArchiveDisclaimer());
    }
     
    // Data Download Link
    dlLink = new RasterDownloadLink($('#download-timeseries'), ncwmsLayer, undefined, 'nc', 'tasmax', '0:55152', '0:510', '0:1068');
    $('#data-format-selector').change(
        function (evt) {
            dlLink.onExtensionChange($(this).val());
        }
    );

    ncwmsLayer.events.register('change', dlLink, function () {
        processNcwmsLayerMetadata(ncwmsLayer, catalog);
        capabilities_request = getNCWMSLayerCapabilities(ncwmsLayer);
        capabilities_request.done(function(data) {
            ncwms_capabilities = data;
            if (selectionLayer.features.length > 0) {
                dlLink.onBoxChange({feature: selectionLayer.features[0]}, ncwms_capabilities);
            }
        });
    });
    ncwmsLayer.events.register('change', dlLink, dlLink.onLayerChange);

    selectionLayer.events.register('featureadded', dlLink, function (selection){
        capabilities_request.done(function(data) {
            ncwms_capabilities = data;
            dlLink.onBoxChange(selection, data);
        });
    });

    dlLink.register($('#download-timeseries'), function (node) {
        node.attr('href', dlLink.getUrl());
    }
                   );
    dlLink.trigger();
    $('#download-timeseries').click(loginButton, pdp.checkAuthBeforeDownload);

    // Metadata/Attributes Download Link
    mdLink = new MetadataDownloadLink($('#download-metadata'), ncwmsLayer, undefined);
    ncwmsLayer.events.register('change', mdLink, mdLink.onLayerChange);
    mdLink.register($('#download-metadata'), function (node) {
        node.attr('href', mdLink.getUrl());
    }
                   );
    mdLink.trigger();

    // Date picker event for both links
    $("[class^='datepicker']").change(
        function (evt) {
            dlLink.onTimeChange();
        }
    );

    capabilities_request.done(function (data) {
        ncwms_capabilities = data;
    });
    catalog_request.done(function (data) {
        catalog = dlLink.catalog = mdLink.catalog = data;
        processNcwmsLayerMetadata(ncwmsLayer, catalog);
        // Set the data URL as soon as it is available
        dlLink.onLayerChange();
        mdLink.onLayerChange();
    });

});
