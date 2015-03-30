from datetime import datetime, timedelta
from urllib import urlencode
from tempfile import TemporaryFile, NamedTemporaryFile
from zipfile import ZipFile
import csv
import json
import os
from itertools import izip

import pytest
from webob.request import Request
from PIL import Image
import xlrd
import netCDF4
import numpy as np
from numpy.testing import assert_almost_equal
from bs4 import BeautifulSoup

@pytest.mark.parametrize('url', ['/js/crmp_map.js', '/css/main.css', '/images/banner.png'])
def test_static(pcic_data_portal, url):
    req = Request.blank(url)
    resp = req.get_response(pcic_data_portal)
    assert resp.status == '200 OK'

@pytest.mark.crmpdb
@pytest.mark.parametrize('url', ['/', '/pcds/map/', '/pcds/count_stations/'])
def test_no_404s(pcic_data_portal, url):
    req = Request.blank(url)
    resp = req.get_response(pcic_data_portal)
    assert resp.status == '200 OK'

    
def test_am_authorized(check_auth_app, authorized_session_id):
    req = Request.blank('')
    req.cookies['beaker.session.id'] = authorized_session_id
    resp = req.get_response(check_auth_app)
    assert resp.status == '200 OK'

@pytest.mark.crmpdb
@pytest.mark.parametrize(('url', 'title', 'body_strings'), [
                         ('/data/pcds/lister/', 'PCDS Data', ["Climatological calculations", "raw/"]),
                         ('/data/pcds/lister/raw/', "Participating CRMP Networks", ["FLNRO-WMB/", "Environment Canada (Canadian Daily Climate Data 2007)"]),
                         ('/data/pcds/lister/raw/AGRI/', "Stations for network AGRI", ["de107/", "Deep Creek"]),
                         ]
)
def test_climo_index(pcic_data_portal, authorized_session_id, url, title, body_strings):
    req = Request.blank(url)
    req.cookies['beaker.session.id'] = authorized_session_id
    resp = req.get_response(pcic_data_portal)
    assert resp.status == '200 OK'
    assert resp.content_type == 'text/html'
    assert resp.content_length < 0

    soup = BeautifulSoup(resp.body)

    assert title in soup.title.string
    for string in body_strings:
        assert string in resp.body

@pytest.mark.crmpdb
def test_unsupported_extension(pcic_data_portal, authorized_session_id):
    req = Request.blank('/data/pcds/agg/?data-format=foo')
    req.cookies['beaker.session.id'] = authorized_session_id
    req.method = 'POST'
    resp = req.get_response(pcic_data_portal)
    assert resp.status == '400 Bad Request'

@pytest.mark.crmpdb
@pytest.mark.parametrize('ext', ['ascii', 'csv'])
def test_ascii_response(pcic_data_portal, authorized_session_id, ext):
    req = Request.blank('/data/pcds/lister/climo/EC/1010066.csql.{0}?station_observations.Precip_Climatology,station_observations.time'.format(ext))
    req.cookies['beaker.session.id'] = authorized_session_id
    resp = req.get_response(pcic_data_portal)
    assert resp.status == '200 OK'
    x = '''station_observations
Precip_Climatology, time
127.128, 2000-01-31 23:59:59
91.2249, 2000-02-29 23:59:59
77.3313, 2000-03-31 23:59:59
46.2816, 2000-04-30 23:59:59
39.6803, 2000-05-31 23:59:59
33.1902, 2000-06-30 23:59:59
22.3557, 2000-07-31 23:59:59
22.448, 2000-08-31 23:59:59
38.5025, 2000-09-30 23:59:59
72.3281, 2000-10-31 23:59:59
144.159, 2000-11-30 23:59:59
121.008, 2000-12-31 23:59:59
'''
    assert resp.body == x

@pytest.mark.crmpdb
def test_xls_response(pcic_data_portal, authorized_session_id):
    req = Request.blank('/data/pcds/lister/climo/EC/1010066.csql.xls?station_observations.Precip_Climatology,station_observations.time')
    req.cookies['beaker.session.id'] = authorized_session_id
    resp = req.get_response(pcic_data_portal)
    assert resp.status == '200 OK'
    wb = xlrd.open_workbook(file_contents=resp.body)
    assert wb.sheet_names() == [u'Global attributes', u'station_observations']
    attributes, obs = wb.sheets()
    # Check the data in the station_observations sheet
    for i, val in enumerate(['Precip_Climatology', 127.128, 91.2249, 77.3313, 46.2816, 39.6803, 33.1902, 22.3557, 22.448, 38.5025, 72.3281, 144.159, 121.008]):
        assert obs.cell_value(i, 0) == val
    # Check a few of the global attributes
    assert attributes.cell_value(4, 2) == '-123.283333' #longitude
    assert attributes.cell_value(1, 2) == '1010066' # station_id
    assert attributes.cell_value(7, 2) == 'ACTIVE PASS' # station name

@pytest.mark.crmpdb
def test_nc_response(pcic_data_portal, authorized_session_id):
    req = Request.blank('/data/pcds/lister/climo/EC/1010066.csql.nc?station_observations.Precip_Climatology,station_observations.time')
    req.cookies['beaker.session.id'] = authorized_session_id
    resp = req.get_response(pcic_data_portal)
    assert resp.status == '200 OK'
    assert resp.content_type == 'application/x-netcdf'

    f = NamedTemporaryFile(suffix='.nc', delete=False)
    for block in resp.app_iter:
        f.write(block)
    f.close()

    nc = netCDF4.Dataset(f.name)
    assert_almost_equal(nc.longitude, np.array(-123.28333), 4)
    assert nc.station_id == '1010066'
    assert nc.station_name == 'ACTIVE PASS' # station name
    var = nc.variables['Precip_Climatology']
    assert var.cell_method == 't: sum within months t: mean over years'
    for actual, expected in zip(var, [127.128, 91.2249, 77.3313, 46.2816, 39.6803, 33.1902, 22.3557, 22.448, 38.5025, 72.3281, 144.159, 121.008]):
        assert actual == expected
    nc.close()
    os.remove(f.name)

@pytest.mark.crmpdb
def test_nc_response_with_null_values(pcic_data_portal, authorized_session_id):
    req = Request.blank('/data/pcds/lister/raw/BCH/AKI.rsql.nc')
    req.cookies['beaker.session.id'] = authorized_session_id
    resp = req.get_response(pcic_data_portal)
    assert resp.status == '200 OK'
    assert resp.content_type == 'application/x-netcdf'

@pytest.mark.crmpdb
def test_clip_to_date_one(pcic_data_portal, authorized_session_id):
    base_url = '/data/pcds/agg/?'
    sdate, edate = datetime(2007, 01, 01), None
    params = {'from-date': sdate.strftime('%Y/%m/%d'),
              'network-name': 'RTA', 'data-format': 'csv',
              'cliptodate': 'cliptodate',
              }
    req = Request.blank(base_url + urlencode(params))
    req.cookies['beaker.session.id'] = authorized_session_id
    
    resp = req.get_response(pcic_data_portal)
    print resp.status
    assert resp.status == '200 OK'
    t = TemporaryFile()
    t.write(resp.body)
    z = ZipFile(t, 'r')
    assert 'RTA/pondosy.csv' in z.namelist()
    f = z.open("RTA/pondosy.csv")
    [ f.readline() for _ in range(10) ]
    # Read through the file and ensure the no data outside of the date range was returned
    reader = csv.reader(f)
    for row in reader:
        if len(row) > 0:
            d = datetime.strptime(row[0], '%Y-%m-%d %H:%M:%S')
            assert d >= sdate
    # Check values on the first 5 just to make sure
    expected = ['2007-01-09 00:00:00',
                '2007-01-10 00:00:00',
                '2007-01-11 00:00:00',
                '2007-01-12 00:00:00',
                '2007-01-13 00:00:00']
    for exp, actual in izip(expected, reader):
        assert exp[0] == actual

# FIXME: These next two aren't actually going to work w/o firing up an http server with reverse proxy
# from pdp import global_config
# @pytest.mark.parametrize('url', ['/' + global_config['ol_path'], '/' + global_config['proj_path']])
# def notest_can_access_static_resources(url, pcic_data_portal):
#     req = Request.blank(url)
#     resp = req.get_response(pcic_data_portal)
#     assert resp.status == '200 OK'

# @pytest.mark.parametrize('url', [global_config['geoserver_url'], global_config['ncwms_url']])
# def notest_can_access_external_resources(url, pcic_data_portal):
#     req = Request.blank(url)
#     resp = req.get_response(pcic_data_portal)
#     assert resp.status == '200 OK'

@pytest.mark.crmpdb
@pytest.mark.parametrize(('filters', 'expected'), [
    ({'network-name': 'EC_raw'}, 4),
    ({'from-date': '2000/01/01', 'to-date': '2000/01/31'}, 14),
    ({'to-date': '1965/01/01'}, 3),
    ({'input-freq': '1-hourly'}, 3),
    ({'only-with-climatology': 'only-with-climatology'}, 14),
    # We _should_ ignore a bad value for a filter (or return a HTTP BadRequest?)
    ({'only-with-climatology': 'bad-value'}, 50)
# Omit this case until we get the geoalchemy stuff figured out
#({'input-polygon': 'POLYGON((-123.240336 50.074796,-122.443323 49.762922,-121.992837 49.416394,-122.235407 48.654034,-123.725474 48.792645,-123.864085 49.728269,-123.240336 50.074796))'}, 7),
    ])
def test_station_counts(filters, expected, pcic_data_portal):
    req = Request.blank('/pcds/count_stations?' + urlencode(filters))
    resp = req.get_response(pcic_data_portal)
    assert resp.status == '200 OK'
    assert resp.content_type == 'application/json'
    assert 'stations_selected' in resp.body
    # FIXME: I want to check the counts... but not on a live database that could change out from under us. What to do?
    # data = json.loads(resp.body)
    # assert data['stations_selected'] == expected

@pytest.mark.crmpdb
@pytest.mark.parametrize('filters', [
    {'network-name': 'EC_raw'},
    {'from-date': '2000/01/01', 'to-date': '2000/01/31'},
    {'to-date': '1965/01/01'},
    {'input-freq': '1-hourly'},
    {'only-with-climatology': 'only-with-climatology'},
    # We _should_ ignore a bad value for a filter (or return a HTTP BadRequest?)
    {'only-with-climatology': 'bad-value'}])
def test_record_length(filters, pcic_data_portal):
    req = Request.blank('/pcds/count_stations?' + urlencode(filters))
    resp = req.get_response(pcic_data_portal)
    assert resp.status == '200 OK'
    assert resp.content_type == 'application/json'
    assert 'stations_selected' in resp.body


@pytest.mark.crmpdb
@pytest.mark.parametrize(('network', 'color'), [
    ('flnro-wmb.png', (12, 102, 0)), # Forest Green
    ('bch.png', (0, 16, 165)), # Blue
    ('no_network.png', (255, 255, 255)) # White
    ])
def test_legend(network, color, pcic_data_portal):
    req = Request.blank('/pcds/images/legend/' + network)
    resp = req.get_response(pcic_data_portal)
    assert resp.status == '200 OK'
    assert resp.content_type == 'application/png'

    # Test the image color
    f = NamedTemporaryFile('w', delete=False)
    print >>f, resp.body
    f.close()
    im = Image.open(f.name)
    r, g, b, a = [x.histogram() for x in im.split()]
    average = (
        sum( i*w for i, w in enumerate(r) ) / sum(r),
        sum( i*w for i, w in enumerate(g) ) / sum(g),
        sum( i*w for i, w in enumerate(b) ) / sum(b)
    )
    assert average == color
    os.remove(f.name)
    
@pytest.mark.crmpdb
def test_legend_caching(pcic_data_portal):
    url = '/pcds/images/legend/flnro-wmb.png'
    
    pre_load_time = datetime.now() - timedelta(1) # yesterday
    post_load_time = datetime.now() + timedelta(1) # tomorrow

    # Load once to make sure that the image gets cached
    req = Request.blank(url)
    resp = req.get_response(pcic_data_portal)
    assert resp.status == '200 OK'

    # Test that it properly returns a NotModified
    req = Request.blank(url)
    req.if_modified_since = post_load_time
    resp = req.get_response(pcic_data_portal)
    assert resp.status.startswith('304')

    # Test that it properly returns updated content if necessary
    req = Request.blank(url)
    req.if_modified_since = pre_load_time
    resp = req.get_response(pcic_data_portal)
    assert resp.status.startswith('200')

@pytest.mark.bulk_data
def test_climatology_bounds(pcic_data_portal, authorized_session_id):
    url = '/data/bc_prism/tmin_monClim_PRISM_historical_run1_197101-200012.nc.nc?climatology_bounds,tmin[0:12][826:1095][1462:1888]&'
    req = Request.blank(url)
    req.cookies['beaker.session.id'] = authorized_session_id
    resp = req.get_response(pcic_data_portal)

    assert resp.status == '200 OK'
    assert resp.content_type == 'application/x-netcdf'

    f = NamedTemporaryFile(suffix='.nc', delete=False)
    for block in resp.app_iter:
        f.write(block)
    f.close()

    nc = netCDF4.Dataset(f.name)

    assert 'climatology_bounds' in nc.variables
    
    assert_almost_equal(nc.variables['climatology_bounds'][:],
                        np.array([[     0.,  10988.],
                                  [    31.,  11017.],
                                  [    59.,  11048.],
                                  [    90.,  11078.],
                                  [   120.,  11109.],
                                  [   151.,  11139.],
                                  [   181.,  11170.],
                                  [   212.,  11201.],
                                  [   243.,  11231.],
                                  [   273.,  11262.],
                                  [   304.,  11292.],
                                  [   334.,  11323.],
                                  [     0.,  11323.]], dtype=np.float32))

    assert 'tmin' in nc.variables
    assert nc.variables['tmin'].shape == (13, 270, 427)

    nc.close()
    os.remove(f.name)

@pytest.mark.bulk_data
@pytest.mark.parametrize('url', [
    '/data/downscaled_gcms/pr+tasmax+tasmin_day_BCSD+ANUSPLIN300+CanESM2_historical+rcp26_r1i1p1_19500101-21001231.nc.aig?tasmax[0:30][77:138][129:238]&', # has NODATA values
    '/data/downscaled_gcms/pr+tasmax+tasmin_day_BCSD+ANUSPLIN300+CanESM2_historical+rcp26_r1i1p1_19500101-21001231.nc.aig?tasmax[0:30][144:236][307:348]&',
])
def test_aaigrid_response(pcic_data_portal, authorized_session_id, url):
    req = Request.blank(url)
    req.cookies['beaker.session.id'] = authorized_session_id
    resp = req.get_response(pcic_data_portal)

    assert resp.status == '200 OK'
    assert resp.content_type == 'application/zip'

@pytest.mark.bulk_data
def test_hydro_stn_data_catalog(pcic_data_portal, authorized_session_id):
    url = '/data/hydro_stn/catalog.json'
    req = Request.blank(url)
    req.cookies['beaker.session.id'] = authorized_session_id
    resp = req.get_response(pcic_data_portal)
    assert resp.status == '200 OK'
    assert resp.content_type == 'application/json'
    assert '/data/hydro_stn/08KE009_Fraser.csv' in resp.body
    data = json.loads(resp.body)
    # assert len(data) == 114

@pytest.mark.bulk_data
def test_hydro_stn_data_csv_csv(pcic_data_portal, authorized_session_id):
    url = '/data/hydro_stn/BCHSCA_Campbell.csv.csv'
    req = Request.blank(url)
    req.cookies['beaker.session.id'] = authorized_session_id
    resp = req.get_response(pcic_data_portal)
    assert resp.status == '200 OK'
    assert resp.content_type == 'text/plain'
    for line in resp.app_iter:
        if line.strip() == '1955/01/01, 32.631008, 32.631008, 32.631008, 33.079967, 33.079967, 33.079967, 59.947227, 59.947227, 59.947227, 43.419338, 43.419338, 43.419338, 63.866467, 63.866467, 63.866467, 43.944351, 43.944351, 43.944351, 57.583118, 57.583118, 102.247162, 102.247162, 102.247162, 63.068111':
            assert True
            return

    assert False, "Data line for 1950/1/1 does not exist"

@pytest.mark.bulk_data
def test_hydro_stn_data_csv_selection_projection(pcic_data_portal, authorized_session_id):
    url = '/data/hydro_stn/BCHSCA_Campbell.csv.csv?sequence.ccsm3_A2run1&sequence.ccsm3_A2run1>100'
    req = Request.blank(url)
    req.cookies['beaker.session.id'] = authorized_session_id
    resp = req.get_response(pcic_data_portal)
    assert resp.status == '200 OK'
    assert resp.content_type == 'text/plain'
    assert resp.body.startswith('''sequence
ccsm3_A2run1
141.908493
202.578568
170.861588
106.241058
173.305725
151.517075
347.067352
330.152252
249.092026
146.530792
137.407532''')

@pytest.mark.bulk_data
def test_hydro_model_out_catalog(pcic_data_portal):
    url = '/hydro_model_out/catalog/'
    req = Request.blank(url)
    resp = req.get_response(pcic_data_portal)
    assert resp.status == '200 OK'
    assert resp.content_type == 'application/json'
    assert 'hydro_model_out/5var_day_HadCM_B1_run1_19500101-20981231.nc' in resp.body
    data = json.loads(resp.body)
    assert len(data) == 24
