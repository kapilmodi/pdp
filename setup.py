import sys
import string
from setuptools import setup
from setuptools.command.test import test as TestCommand

class PyTest(TestCommand):
    def finalize_options(self):
        TestCommand.finalize_options(self)
        self.test_args = ['-v', '--tb=no', 'tests']
        self.test_suite = True
    def run_tests(self):
        #import here, cause outside the eggs aren't loaded
        import pytest
        errno = pytest.main(self.test_args)
        sys.exit(errno)                                                                        

__version__ = (2, '0-rc1')

sw_path = 'hg+ssh://medusa.pcic.uvic.ca//home/data/projects/comp_support/software'

setup(
    name="pdp",
    description="PCIC's Data Portal (pdp): the server software to run the entire web application",
    keywords="opendap dods dap open data science climate meteorology downscaling modelling",
    packages=['pdp'],
    version='.'.join(str(d) for d in __version__),
    url="http://www.pacificclimate.org/",
    author="James Hiebert",
    author_email="hiebert@uvic.ca",
    dependency_links = ['{0}/pdp_util@7eb52ee6b48f#egg=pdp_util-0.1.4'.format(sw_path),
                        '{0}/pydap.handlers.hdf5@113655f4a287#egg=pydap.handlers.hdf5-0.3'.format(sw_path),
                        '{0}/pydap.responses.netcdf@bca24acfb8a0#egg=pydap.responses.netcdf-0.2'.format(sw_path),
                        '{0}/pydap.responses.xls#egg=pydap.responses.xls'.format(sw_path),
                        '{0}/analyticis@8a82a759ca02#egg=analytics'.format(sw_path),
                        ],
    install_requires = ['flask',
                        'beaker',
                        'genshi',
                        'static',
                        'pdp_util >=0.1.4',
                        'pydap.handlers.hdf5 >=0.3',
                        'pydap.responses.netcdf >=0.2',
                        'pydap.responses.xls',
                        'analytics'
                        ],
    tests_require = ['webob',
                     'pytest',
                     'xlrd',
                     'pillow',
                     'netCDF4',
                     'numpy'
                     ],
    scripts = ['scripts/rast_serve.py'],
    package_data = {'pdp': ['pdp/static', 'pdp/templates']},
    cmdclass = {'test': PyTest},
    zip_safe=True,
        classifiers='''Development Status :: 2 - Pre-Alpha
Environment :: Console
nvironment :: Web Environment
Framework :: Flask
Natural Language :: English
Intended Audience :: Developers
Intended Audience :: Science/Research
License :: OSI Approved :: GNU General Public License (GPL)
Operating System :: OS Independent
Programming Language :: Python
Programming Language :: Python :: 2.7
Topic :: Internet
Topic :: Internet :: WWW/HTTP :: WSGI
Topic :: Internet :: WWW/HTTP :: WSGI :: Application
Topic :: Scientific/Engineering
Topic :: Scientific/Engineering :: Atmospheric Science
Topic :: Scientific/Engineering :: GIS
Topic :: Software Development :: Libraries :: Python Modules'''.split('\n')
)
