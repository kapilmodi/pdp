node {
    stage('Code Collection') {
        checkout scm
    }

    withDockerServer([uri: PCIC_DOCKER]) {
        def pyenv = docker.image('python:2.7')

        pyenv.inside {
            stage('Dependency Installation') {
                sh 'sudo apt-get install python-pip python-dev build-essential'
                sh 'pip install tox'
                sh 'sudo apt-get install libhdf5-dev libnetcdf-dev libgdal-dev'
            }

            stage('GDAL Setup') {
                CPLUS_INCLUDE_PATH = '/usr/include/gdal'
                C_INCLUDE_PATH = '/usr/include/gdal'
            }

            stage('Python Installation') {
                sh 'python --version'
                sh 'pip install -i https://pypi.pacificclimate.org/simple/ -r requirements.txt -r test_requirements.txt -r deploy_requirements.txt'
            }

            stage('Python Test Suite') {
                sh 'py.test -vv --tb=short -m "not crmpdb and not bulk_data" tests'
            }
        }
    }

    nodejs('node') {
        stage('NPM Installation') {
            sh 'npm install'
        }
        stage('NPM Test Suite') {
            sh 'npm run test'
        }
    }
}
