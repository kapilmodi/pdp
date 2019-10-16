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
        // Use image with gdal already installed
        def gdalenv = docker.image('pcic/geospatial-python')

        gdalenv.inside('-u root') {
            stage('Git Executable Install') {
                sh 'apt-get update'
                sh 'apt-get install -y git'
            }

            stage('Python Installs') {
                sh 'pip install -i https://pypi.pacificclimate.org/simple/ -r requirements.txt -r test_requirements.txt -r deploy_requirements.txt'
                sh 'pip install -e .'
            }

            stage('Python Test Suite') {
                sh 'py.test -vv --tb=short -m "not crmpdb and not bulk_data" tests'
            }
        }
    }

    stage('Clean Workspace') {
        cleanWs()
    }

    stage('Recollect Code') {
        checkout scm
    }

    stage('Build Image') {
        String image_name = 'pdp'
        String branch_name = BRANCH_NAME.toLowerCase()

        // Update image name if we are not on the master branch
        if (branch_name != 'master') {
            image_name = image_name + '/' + branch_name
        }

        withDockerServer([uri: PCIC_DOCKER]) {
            def image = docker.build(image_name)
        }
    }
}
