pipeline {

    agent any

    environment {
        DOCKERHUB_CREDENTIALS = 'dockerhub'
        DOCKERHUB_USERNAME = 'inesrahrah'
    }

    stages {

        stage('Checkout Source Code') {
            steps {
                checkout scm
            }
        }

        stage('Show Project Structure') {
            steps {
                sh '''
                pwd
                ls -la
                '''
            }
        }

        stage('Build User Service') {
            steps {
                dir('backend/user-service/user-service-app') {
                    sh 'chmod +x mvnw || true'
                    sh './mvnw clean package -DskipTests || mvn clean package -DskipTests'
                }
            }
        }

        stage('Build Stock Service') {
            steps {
                dir('backend/stock-service/stock-service-app') {
                    sh 'chmod +x mvnw || true'
                    sh './mvnw clean package -DskipTests || mvn clean package -DskipTests'
                }
            }
        }

        stage('Build Docker Images') {
            steps {

                dir('backend/user-service/user-service-app') {
                    sh 'docker build -t medflow-user-service:latest .'
                }

                dir('backend/stock-service/user-service-app') {
                    sh 'docker build -t medflow-stock-service:latest .'
                }

                dir('frontend') {
                    sh 'docker build -t medflow-frontend:latest .'
                }

            }
        }

        stage('Docker Login') {
            steps {

                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub',
                        usernameVariable: 'USERNAME',
                        passwordVariable: 'PASSWORD'
                    )
                ]) {

                    sh '''
                    echo "$PASSWORD" | docker login -u "$USERNAME" --password-stdin
                    '''

                }

            }
        }

        stage('Tag Images') {
            steps {

                sh """
                docker tag medflow-user-service:latest ${DOCKERHUB_USERNAME}/medflow-user-service:latest
                docker tag medflow-stock-service:latest ${DOCKERHUB_USERNAME}/medflow-stock-service:latest
                docker tag medflow-frontend:latest ${DOCKERHUB_USERNAME}/medflow-frontend:latest
                """

            }
        }

        stage('Push Images') {
            steps {

                sh """
                docker push ${DOCKERHUB_USERNAME}/medflow-user-service:latest
                docker push ${DOCKERHUB_USERNAME}/medflow-stock-service:latest
                docker push ${DOCKERHUB_USERNAME}/medflow-frontend:latest
                """

            }
        }

        stage('Stop Previous Containers') {
            steps {

                sh '''
                docker compose down || true
                '''

            }
        }

        stage('Deploy Application') {
            steps {

                sh '''
                docker compose up -d
                '''

            }
        }

        stage('Health Check') {
            steps {

                sh '''
                sleep 30

                docker ps

                docker compose ps
                '''

            }
        }

        stage('Running Containers') {
            steps {

                sh '''
                docker ps
                '''
            }
        }

    }

    post {

        success {

            echo 'Application deployed successfully.'

        }

        failure {

            sh '''
            docker compose logs --tail=100 || true
            '''

        }

        always {

            cleanWs()

        }

    }

}
