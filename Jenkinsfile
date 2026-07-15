pipeline {

    agent any

    environment {
        PROJECT_DIR = "/home/ines/medflow-devops-"
        DOCKERHUB_USERNAME = "inesrahrah"
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
                cd ${PROJECT_DIR}

                echo "===== Current Directory ====="
                pwd

                echo ""
                echo "===== Project Structure ====="
                ls -la

                echo ""
                echo "===== Docker Compose ====="
                ls docker-compose.yml
                '''
            }
        }

        stage('Build User Service') {
            steps {
                dir("${PROJECT_DIR}/backend/user-service/user-service-app") {
                    sh '''
                    chmod +x mvnw || true
                    ./mvnw clean package -DskipTests || mvn clean package -DskipTests
                    '''
                }
            }
        }

        stage('Build Stock Service') {
            steps {
                dir("${PROJECT_DIR}/backend/stock-service/stock-service-app") {
                    sh '''
                    chmod +x mvnw || true
                    ./mvnw clean package -DskipTests || mvn clean package -DskipTests
                    '''
                }
            }
        }

        stage('Build User Docker Image') {
            steps {
                dir("${PROJECT_DIR}/backend/user-service/user-service-app") {
                    sh '''
                    docker build --no-cache \
                    -t medflow-user-service:latest .
                    '''
                }
            }
        }

        stage('Build Stock Docker Image') {
            steps {
                dir("${PROJECT_DIR}/backend/stock-service/stock-service-app") {
                    sh '''
                    docker build --no-cache \
                    -t medflow-stock-service:latest .
                    '''
                }
            }
        }

        stage('Build Frontend Docker Image') {
            steps {
                dir("${PROJECT_DIR}/frontend") {
                    sh '''
                    docker build --no-cache \
                    -t medflow-frontend:latest .
                    '''
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
                    echo "$PASSWORD" | docker login \
                    -u "$USERNAME" \
                    --password-stdin
                    '''

                }

            }

        }

        stage('Tag Docker Images') {

            steps {

                sh """
                docker tag medflow-user-service:latest ${DOCKERHUB_USERNAME}/medflow-user-service:latest

                docker tag medflow-stock-service:latest ${DOCKERHUB_USERNAME}/medflow-stock-service:latest

                docker tag medflow-frontend:latest ${DOCKERHUB_USERNAME}/medflow-frontend:latest
                """

            }

        }

        stage('Push Docker Images') {

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
                cd ${PROJECT_DIR}

                echo "===== Stopping Previous Containers ====="

                docker compose down --remove-orphans || true

                sleep 5
                '''

            }

        }

        stage('Deploy Application') {

            steps {

                sh '''
                cd ${PROJECT_DIR}

                echo "===== Deploying Application ====="

                docker compose up -d

                sleep 25
                '''

            }

        }

        stage('Health Check') {

            steps {

                sh '''

                echo "===== Health Check ====="

                for i in $(seq 1 30)
                do

                    if curl --silent --fail \
                    http://localhost:8081/actuator/health \
                    > /dev/null

                    then

                        echo ""
                        echo "================================="
                        echo "User Service is UP"
                        echo "================================="

                        exit 0

                    fi

                    echo "Attempt $i / 30"

                    sleep 5

                done

                echo ""
                echo "User Service FAILED"

                exit 1

                '''

            }

        }

        stage('Running Containers') {

            steps {

                sh '''

                echo ""
                echo "===== Running Containers ====="

                docker ps

                '''

            }

        }

    }

    post {

        success {

            echo '================================='
            echo 'PIPELINE SUCCESSFUL'
            echo '================================='

        }

        failure {

            echo '================================='
            echo 'PIPELINE FAILED'
            echo '================================='

            sh '''
            cd ${PROJECT_DIR}

            echo ""
            echo "===== Docker Compose Logs ====="

            docker compose logs --tail=100 || true

            echo ""
            echo "===== Running Containers ====="

            docker ps -a
            '''

        }

        always {

            sh '''
            docker image prune -f || true
            '''

            cleanWs()

        }

    }

}
