import sys
from logging import basicConfig, DEBUG
from argparse import ArgumentParser

from flask import Flask

from pdp import main

if __name__ == '__main__':

    parser = ArgumentParser(description='Start a development pdp:main Flask instance')
    parser.add_argument('-p', '--port', type=int, required=True,
                        help='Indicate the port on which to bind the application')
    args = parser.parse_args()
    
    basicConfig(format='%(levelname)s:%(name)s:%(asctime)s %(message)s', stream=sys.stdout, level=DEBUG)

    host = ''
    port = args.port

    app = Flask(__name__)
    app.wsgi_app = main
    app.debug = True
    app.run('0.0.0.0', port, use_reloader=True, debug=True, use_debugger=True)
