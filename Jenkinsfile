node {
    stage('Code Collection') {
        checkout scm
    }

    nodejs('node') {
        stage('NPM Installation') {
            sh 'npm install'
        }
        stage('NPM Test Suite') {
            sh 'npm run test'
        }
    }

    withDockerServer([uri: PCIC_DOCKER]) {
        def pyenv = docker.image('python:2.7')

        pyenv.inside("-itu root") {
            stage('Dependency Installation') {
                sh 'apt-get update'
                sh 'apt-get install -y python-pip python-dev build-essential'
                sh 'pip install tox'
                sh 'apt-get install -y libhdf5-dev libnetcdf-dev libgdal-dev'
            }

            stage('GDAL Setup') {
                sh 'CPLUS_INCLUDE_PATH=/usr/include/gdal'
                sh 'C_INCLUDE_PATH=/usr/include/gdal'
            }

            stage('Better Insall GDAL') {
                sh '''
                pip download gdal==2.2.0
                tar -xvzf ./GDAL-2.2.0.tar.gz
                cd GDAL-2.2.0
                python setup.py build_ext --include-dirs /usr/include/gdal
                '''
            }

            stage('Python Installation') {
                sh 'pip install -i https://pypi.pacificclimate.org/simple/ -r requirements.txt -r test_requirements.txt -r deploy_requirements.txt'
            }

            stage('Python Test Suite') {
                sh 'py.test -vv --tb=short -m "not crmpdb and not bulk_data" tests'
            }
        }
    }
}
