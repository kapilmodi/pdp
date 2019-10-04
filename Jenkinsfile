node {
    stage('Code Collection') {
        checkout scm
    }

    withDockerServer([uri: PCIC_DOCKER]) {
        def pyenv = docker.image('python:2.7')

        pyenv.inside {
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
