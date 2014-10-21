News / Release Notes
====================

2.1.5
-----

*Release Date: 21-Oct-2014*

* Hotfix: Bump dependency versions
  * Bump pydap.responses.netcdf to version 0.5 - Fixes failure case where dates < 1900
  * Bump pydap.handlers.sql to version 0.9 - Fixes check for empty results during type peeking

2.1.4
-----

* Hotfix: Bump pdp_util version, fixes xls "Bad request" respose

2.1.3
-----

*Release Date: 25-Sept-2014*

* Hotfix: Remove MyOpenID as an openid endpoint

  * Remove from auth popup
  * Bump pdp_util version to 2.1

2.1.2
-----

* Hotfix: patch around broken inline authentication with pcds portal

2.1.1
-----

* Hotfix: update yahoo openid endpoint url

2.1.0
-----

*Release date: 24-Jul-2014*

* Addition of the VIC Hydrologic Model Output Portal
* Addition of the BCCAQ Downscaling Extremes (ClimDEX) Portal

  * Timeseries on map click feature (available in ClimDEX portal)

* New output formats available for some portals

  * Arc GIS/ASCII Grid file (available in all coverage portals)
  * Excel 2010 (XLSX) (available in PCDS portal)

* Mods to the HDF5 handler to make it more robust

  * Added the ability to slice a sliced proxy object (for use in slicing multiple times and then iterating over the result)
  * Fixed errors on iteration and dimension retreival for variables of rank 1
  * Fixed bug for multiple iterators couldn't access the same HDF5Data object
  * Fixed bug in Pydap that caused redundant and incorrect last-modified timestamps on data from hdf5 files

* Bugfix in SQL handler (used by the PCDS portal) which caused the NetCDF response to fail for a subset of stations (stations where NULL is the first value in the timeseries for any variable)
* Included more documentation describing the raster data formats

2.0.2
-----

*Release date: 21-May-2014*

* Maintenance on neglected PCDS station listing pages
* pydap.handlers.pcic

  * Fixed bug in PCDS path handler that didn't match hyphen in the network name (e.g. FLNRO-WMB)
  * Added a context manager to all database connections so that they always get cleaned up

* Inclusion of renamed Google Analytics module to avoid package namespace collisions
* Other minor code cleanup

2.0.1
-----

*Release date: 18-Mar-2014*

* First bugfix release of the PCIC Data Portal
