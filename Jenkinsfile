node {
    def installed = fileExists 'bin/activate'

    if (!installed) {
        stage("Install Python Virtual Enviroment") {
            sh 'virtualenv --no-site-packages .'
        }
    }

    stage('Code Collection') {
        checkout scm
    }

    stage('Python Installation') {
        sh 'python --version'
        sh 'source/bin/activate'
        sh 'pip install -i https://pypi.pacificclimate.org/simple/ -r requirements.txt -r test_requirements.txt -r deploy_requirements.txt'
        sh 'deactivate'
    }
    stage('Python Test Suite') {
        sh 'source/bin/activate'
        sh 'py.test -vv --tb=short -m "not crmpdb and not bulk_data" tests'
        sh 'deactivate'
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
