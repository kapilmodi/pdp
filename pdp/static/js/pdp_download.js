function createFormatOptions() {
    var formatData = {nc: pdp.mkOpt('NetCDF', 'NetCDF is a self-describing file format widely used in the atmospheric sciences. Self describing means that the format information is contained within the file itself, so generic tools can be used to import these data. The format requires use of freely available applications to view, import, and export the data.'),
		      csv: pdp.mkOpt('CSV', 'CSV stands for Comma Separated Values. This format is a human readable list of data typically with a time stamp, observational value, and flags with one line per observation time. Each observation is separated by commas.'),
		      ascii: pdp.mkOpt('ASCII', 'ASCII data are also in a text format with a identical data organization as the CSV data.'),
		      xls: pdp.mkOpt('MS Excel', 'This data format is compatible with many popular spreadsheet programs such as Open Office, Libre Office and Microsoft Excel. Data organization is similar to CSV, but the format is more directly readable with spreadsheet software.') };

    return getSelectorWithHelp('Output Format', 'data-format', 'data-format', 'data-format-selector', 'csv', formatData,'View output format descriptions', 450, 450);
}

function createRasterFormatOptions() {
    var formatData = {nc: pdp.mkOpt('NetCDF', 'NetCDF is a self-describing file format widely used in the atmospheric sciences. Self describing means that the format information is contained within the file itself, so generic tools can be used to import these data. The format requires use of freely available applications to view, import, and export the data.'),
		      csv: pdp.mkOpt('CSV', 'CSV stands for Comma Separated Values. This format is a human readable list of data typically with a time stamp, observational value, and flags with one line per observation time. Each observation is separated by commas.'),
		      ascii: pdp.mkOpt('ASCII', 'ASCII data are also in a text format with a identical data organization as the CSV data.') };

    return pdp.getSelectorWithHelp('Output Format', 'data-format', 'data-format', 'data-format-selector', 'nc', formatData,'View output format descriptions', 450, 450);
}

function createMetadataFormatOptions() {
    var mdFormatData = { WFS: pdp.mkOptGroup({ csv: pdp.mkOpt('CSV'), GML2: pdp.mkOpt('GML2'), 'GML2-GZIP': pdp.mkOpt('GML2-GZIP'), 'text/xml; subtype=gml/3.1.1': pdp.mkOpt('GML3.1'), 'text/xml; subtype=gml/3.2': pdp.mkOpt('GML3.2'), 'json': pdp.mkOpt('GeoJSON'), 'SHAPE-ZIP': pdp.mkOpt('Shapefile') }),
			 WMS: pdp.mkOptGroup({ 'application/atom+xml': pdp.mkOpt('AtomPub'), 'image/gif': pdp.mkOpt('GIF'), 'application/rss+xml': pdp.mkOpt('GeoRSS'), 'image/geotiff': pdp.mkOpt('GeoTiff'), 'image/geotiff8': pdp.mkOpt('GeoTiff 8bit'), 'image/jpeg': pdp.mkOpt('JPEG'), 'application/vnd.google-earth.kmz+xml': pdp.mkOpt('KML (compressed)'), 'application/vnd.google-earth.kml+xml': pdp.mkOpt('KML (plain)'), 'application/openlayers': pdp.mkOpt('OpenLayers'), 'application/pdf': pdp.mkOpt('PDF'), 'image/png': pdp.mkOpt('PNG'), 'image/png8': pdp.mkOpt('PNG 8bit'), 'image/svg+xml': pdp.mkOpt('SVG'), 'image/tiff': pdp.mkOpt('Tiff'), 'image/tiff8': 'Tiff 8bit' })
		       };
    
    return pdp.getSelector('Output Format', 'metadata-format', "metadata-format", undefined, undefined, mdFormatData);
}

function createDownloadButtons(id, divClass, buttons) {
    var downloadDiv = pdp.createDiv(id);
    downloadDiv.className = divClass;
    $.each(buttons, function(idx, val) {
	   downloadDiv.appendChild(pdp.createInputElement("button", undefined, idx, idx, val));
	   downloadDiv.appendChild(document.createTextNode(" "));
    });
    return downloadDiv;
}

function getCatalog(callback) {
    $.ajax({'url': app_root + '/' + ensemble_name + '/catalog/' + 'catalog.json',
        'type': 'GET',
        'dataType': 'json',
        'success': function(data, textStatus, jqXHR) {
            callback(data);
        }
    });
}