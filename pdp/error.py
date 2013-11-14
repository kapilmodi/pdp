import sys
import logging  

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.exc import OperationalError

logger = logging.getLogger(__name__)

class ErrorMiddleware(object):
    def __init__(self, wrapped_app):
        self.wrapped_app = wrapped_app
    def __call__(self, environ, start_response):
        # Catch errors that happen while calling the rest of the application
        try:
            response_iter = self.wrapped_app(environ, start_response)

        except SQLAlchemyError as e:
            status = "503 Service Unavailable"
            response_headers = [("content-type", "text/plain"),
                                ("Retry-After", "3600") # one hour 
                               ]
            start_response(status, response_headers, sys.exc_info())
            yield 'There was an unexpected problem accessing the database\n'
            yield e.message

        except IOError as e:
            status = "404 Not Found"
            response_headers = [("content-type", "text/plain"),
                                ("Retry-After", "3600") # one hour 
                               ]
            start_response(status, response_headers, sys.exc_info())
            yield 'We had an unexpected problem accessing on-disk resources\n'
            yield e.message
            
        except Exception as e:
            status = "500 Internal Server Error"
            response_headers = [("content-type", "text/plain")]
            start_response(status, response_headers, sys.exc_info())
            yield 'There was an unhandleable problem with the application\n'
            yield e.message

        else:

            # Catch error that happen while generating a streamed response
            try:
                for block in response_iter:
                    yield block

            except Exception as e:
                status = "500 Internal Server Error"
                response_headers = [("content-type", "text/plain")]
                start_response(status, response_headers, sys.exc_info())
                yield 'There was a serious problem while generating the streamed response'
                yield e.message
