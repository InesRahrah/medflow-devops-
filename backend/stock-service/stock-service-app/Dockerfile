# =========================
# Étape 1 : Build Maven
# =========================
FROM maven:3.9.11-eclipse-temurin-21 AS build

WORKDIR /app

COPY . .

RUN mvn clean package -DskipTests

# =========================
# Étape 2 : Runtime
# =========================
FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=build /app/target/stock-service-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8086

ENTRYPOINT ["java","-jar","app.jar"]