node {
    stage('Code Collection') {
        checkout scm
    }

    nodejs('node') {
        stage('Installation') {
            sh 'npm install'
        }
    }
}
