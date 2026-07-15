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

                echo "======================================="
                echo "Current Directory"
                echo "======================================="
                pwd

                echo ""
                echo "======================================="
                echo "Project Files"
                echo "======================================="
                ls -la
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

                echo "======================================="
                echo "Stopping Previous Containers"
                echo "======================================="

                docker compose down --remove-orphans || true

                sleep 5
                '''

            }

        }

        stage('Deploy Application') {

            steps {

                sh '''
                cd ${PROJECT_DIR}

                echo "======================================="
                echo "Deploying Application"
                echo "======================================="

                docker compose up -d

                sleep 30
                '''

            }

        }

        stage('Health Check') {

            steps {

                sh '''

                echo ""
                echo "======================================="
                echo "USER SERVICE HEALTH CHECK"
                echo "======================================="

                USER_OK=0

                for i in $(seq 1 30)
                do

                    if docker exec medflow-user-service \
                    wget -qO- http://localhost:8080/actuator/health \
                    | grep '"status":"UP"' >/dev/null
                    then

                        USER_OK=1
                        break

                    fi

                    echo "Attempt $i / 30"

                    sleep 5

                done

                if [ $USER_OK -eq 0 ]; then

                    echo ""
                    echo "User Service FAILED"

                    docker logs medflow-user-service || true

                    exit 1

                fi

                echo ""
                echo "======================================="
                echo "STOCK SERVICE HEALTH CHECK"
                echo "======================================="

                STOCK_OK=0

                for i in $(seq 1 30)
                do

                    if docker exec medflow-stock-service \
                    wget -qO- http://localhost:8086/actuator/health \
                    | grep '"db"' >/dev/null
                    then

                        STOCK_OK=1
                        break

                    fi

                    echo "Attempt $i / 30"

                    sleep 5

                done

                if [ $STOCK_OK -eq 0 ]; then

                    echo ""
                    echo "Stock Service FAILED"

                    docker logs medflow-stock-service || true

                    exit 1

                fi

                echo ""
                echo "======================================="
                echo "APPLICATION IS HEALTHY"
                echo "======================================="

                '''

            }

        }

        stage('Running Containers') {

            steps {

                sh '''

                echo ""
                echo "======================================="
                echo "Running Containers"
                echo "======================================="

                docker ps

                echo ""

                docker compose ps

                '''

            }

        }

    }

    post {

        success {

            echo '======================================='
            echo 'PIPELINE SUCCESSFUL'
            echo '======================================='

        }

        failure {

            echo '======================================='
            echo 'PIPELINE FAILED'
            echo '======================================='

            sh '''

            cd ${PROJECT_DIR}

            echo ""
            echo "============= DOCKER PS ============="

            docker ps -a

            echo ""
            echo "============= COMPOSE LOGS ============="

            docker compose logs --tail=200 || true

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
