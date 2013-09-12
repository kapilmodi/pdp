function getClipCheckbox() {
    return getCheckbox('cliptodate', undefined, 'cliptodate', 'cliptodate', 'Clip time series to filter date range');
}

function createDownloadButtons(id, divClass, buttons) {
    var downloadDiv = createDiv(id);
    downloadDiv.className = divClass;
    $.each(buttons, function(idx, val) {
	downloadDiv.appendChild(createInputElement("button", undefined, idx, idx, val))
	downloadDiv.appendChild(document.createTextNode(" "));
    });
    return downloadDiv;
}

function getCRMPDownloadOptions() {
    var frag = document.createDocumentFragment();
    var downloadForm = frag.appendChild(createForm("download-form", "download-form", "get"));
    var downloadFieldset = downloadForm.appendChild(createFieldset("downloadset", "Download Data"));
    downloadFieldset.appendChild(createFormatOptions());
    downloadFieldset.appendChild(getClipCheckbox());
    downloadFieldset.appendChild(createDownloadButtons('download-buttons', 'download-buttons', {'download-climatology': 'Climatology', 'download-timeseries': 'Timeseries' }));

    var nodelistDiv = frag.appendChild(createDiv("nodelist"));
    var metadataForm = createForm('metadata-form', 'metadata-form', 'post');
    var metadataFieldset = createFieldset("metadataset");
    metadataFieldset.appendChild(createMetadataFormatOptions());
    metadataFieldset.appendChild(createDownloadButtons('metadata-buttons', 'download-buttons', {'download-meta': 'Download'}));
    metadataForm.appendChild(metadataFieldset);
    nodelistDiv.appendChild(metadataForm);

    return frag;
}
